// Transport layer: pluggable HTTP backends.
//
// A transport implements `async request(config)` returning a Response-like object
// with: { status, ok, statusText, headers: { get(name) }, json(), text() }.
// Native fetch Responses already satisfy this shape; BrokerTransport synthesizes one.

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Direct fetch transport. Uses the global fetch with an AbortController timeout.
 */
export class FetchTransport {
  constructor({ timeoutMs = DEFAULT_TIMEOUT_MS, mode = 'cors', credentials = 'same-origin' } = {}) {
    this.timeoutMs = timeoutMs;
    this.mode = mode;
    this.credentials = credentials;
  }

  async request({ url, method = 'GET', headers = {}, body, signal, timeoutMs }) {
    const controller = signal ? null : new AbortController();
    const timeout = timeoutMs ?? this.timeoutMs;
    let timer;
    if (controller) timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: signal || (controller ? controller.signal : undefined),
        mode: this.mode,
        credentials: this.credentials,
      });
      return response;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error(`Network timeout: no response within ${timeout}ms (${url})`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

/**
 * Broker transport: routes requests through a local proxy endpoint to bypass CORS.
 * Mirrors the /api/net/request envelope pattern. The broker must accept a POST with
 * { timeout_ms, request: { url, method, headers, body } } and return
 * { status, headers, body }.
 *
 * In-memory cookie capture is supported: any Set-Cookie from the broker response is
 * echoed back as a Cookie header on subsequent requests.
 */
export class BrokerTransport {
  constructor({ brokerUrl = '/api/net/request', timeoutMs = DEFAULT_TIMEOUT_MS, credentials = 'same-origin' } = {}) {
    this.brokerUrl = brokerUrl;
    this.timeoutMs = timeoutMs;
    this.credentials = credentials;
    this.cookies = '';
  }

  async request({ url, method = 'GET', headers = {}, body, timeoutMs }) {
    const normalized = toPlainHeaders(headers);
    if (this.cookies) {
      const clean = this.cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
      if (clean) normalized.Cookie = clean;
    }

    const envelope = {
      timeout_ms: timeoutMs ?? this.timeoutMs,
      request: {
        url,
        method: method.toUpperCase(),
        headers: normalized,
      },
    };
    if (body !== undefined && body !== null) {
      envelope.request.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (timeoutMs ?? this.timeoutMs) + 2000);

    try {
      const brokerResponse = await fetch(this.brokerUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
        signal: controller.signal,
        credentials: this.credentials,
      });
      if (!brokerResponse.ok) {
        throw new Error(`Broker unavailable: HTTP ${brokerResponse.status}`);
      }
      const wrapped = await brokerResponse.json();

      const lowerHeaders = {};
      if (wrapped.headers) {
        for (const [k, v] of Object.entries(wrapped.headers)) lowerHeaders[k.toLowerCase()] = v;
        const setCookie = lowerHeaders['set-cookie'];
        if (setCookie) {
          this.cookies = Array.isArray(setCookie) ? setCookie.join(', ') : setCookie;
        }
      }

      const status = wrapped.status ?? 200;
      const textBody = typeof wrapped.body === 'string' ? wrapped.body : JSON.stringify(wrapped.body ?? '');

      return {
        status,
        ok: status >= 200 && status < 300,
        statusText: status === 403 ? 'Forbidden' : status >= 200 && status < 300 ? 'OK' : '',
        headers: {
          get: (name) => (lowerHeaders ? lowerHeaders[name.toLowerCase()] : null) ?? null,
        },
        json: async () => JSON.parse(textBody),
        text: async () => textBody,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Convert a Headers instance or plain object into a plain object.
 */
export function toPlainHeaders(headers) {
  if (!headers) return {};
  if (typeof headers.entries === 'function') return Object.fromEntries(headers.entries());
  if (headers instanceof Headers) {
    const out = {};
    headers.forEach((v, k) => { out[k] = v; });
    return out;
  }
  return { ...headers };
}
