// ODataClient: framework-agnostic OData client.
// Holds config, transport, auth, and protocol adapter. Provides entitySet()
// and the _request() pipeline with overridable hooks (_applyAuth, _beforeRequest,
// _onResponseError, _buildPath) that the SAP layer overrides.

import { EntitySet } from './entitySet.js';
import { FetchTransport } from './transport.js';
import { v4Adapter } from '../adapters/v4.js';
import { v2Adapter } from '../adapters/v2.js';
import { joinUrl, appendQueryParams } from './url.js';
import { ODataError, parseODataError } from './error.js';

const ADAPTERS = { v4: v4Adapter, v2: v2Adapter };

export class ODataClient {
  constructor(config = {}) {
    this.config = {
      baseUrl: '',
      version: 'v4',
      timeoutMs: 30000,
      headers: {},
      auth: null,
      ...config,
    };
    this.version = this.config.version;
    this.adapter = this.config.adapter || ADAPTERS[this.version] || v4Adapter;
    this.transport = this.config.transport || new FetchTransport({ timeoutMs: this.config.timeoutMs });
  }

  entitySet(name) {
    return new EntitySet(this, name);
  }

  // --- unbound operations ---
  async unboundAction(actionName, payload = {}, options = {}) {
    const response = await this._request({ path: actionName, method: 'POST', body: payload, headers: options.headers });
    return parseOptionalBody(response);
  }

  async unboundFunction(funcName, params = {}, options = {}) {
    const args = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',');
    const path = args ? `${funcName}(${args})` : `${funcName}()`;
    const response = await this._request({ path, method: 'GET', headers: options.headers });
    return parseOptionalBody(response);
  }

  async fetchMetadata() {
    const response = await this._request({ path: '$metadata', method: 'GET' });
    return await response.text();
  }

  /** Raw request escape hatch. */
  async request(path, options = {}) {
    return this._request({ path, method: options.method, body: options.body, headers: options.headers });
  }

  // --- request pipeline ---
  _buildPath(path, params = {}) {
    const merged = { ...this.adapter.defaultParams, ...params };
    return appendQueryParams(path, merged);
  }

  _applyAuth(headers) {
    const auth = this.config.auth;
    if (!auth) return;
    if (typeof auth === 'function') {
      const extra = auth() || {};
      for (const [k, v] of Object.entries(extra)) headers.set(k, v);
      return;
    }
    if (auth.type === 'basic' && auth.username != null) {
      headers.set('Authorization', `Basic ${utf8ToBase64(`${auth.username}:${auth.password || ''}`)}`);
    } else if (auth.type === 'bearer' && auth.token) {
      headers.set('Authorization', `Bearer ${auth.token}`);
    } else if (auth.type === 'custom' && auth.headers) {
      for (const [k, v] of Object.entries(auth.headers)) headers.set(k, v);
    }
  }

  _applyDefaultHeaders(headers, method, path) {
    const m = (method || 'GET').toUpperCase();
    if (path.includes('$metadata')) {
      if (!headers.has('Accept')) headers.set('Accept', 'application/xml, text/xml, */*');
    } else {
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      if (m !== 'GET' && m !== 'HEAD' && m !== 'DELETE' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
    for (const [k, v] of Object.entries(this.config.headers || {})) {
      if (!headers.has(k)) headers.set(k, v);
    }
  }

  async _beforeRequest(requestConfig) {
    // hook for subclasses (SAP attaches CSRF token here)
  }

  async _onResponseError(requestConfig, response, retry) {
    // hook for subclasses (SAP retries on 403); default returns response unchanged
    return response;
  }

  async _request({ path, params = {}, method = 'GET', body, headers = {} }) {
    const reqHeaders = new Headers(headers);
    this._applyAuth(reqHeaders);
    this._applyDefaultHeaders(reqHeaders, method, path);

    const serializedBody = serializeBody(body, method);
    const url = joinUrl(this.config.baseUrl, this._buildPath(path, params));

    const requestConfig = {
      url,
      method,
      headers: reqHeaders,
      body: serializedBody,
      timeoutMs: this.config.timeoutMs,
    };

    await this._beforeRequest(requestConfig);

    let response = await this.transport.request(requestConfig);
    if (!response.ok) {
      response = await this._onResponseError(requestConfig, response, async () => this.transport.request(requestConfig));
    }
    if (!response.ok) {
      const text = await safeText(response);
      const message = parseODataError(text);
      throw new ODataError(message, {
        status: response.status,
        statusText: response.statusText,
        body: text,
        endpoint: url,
      });
    }
    return response;
  }
}

function serializeBody(body, method) {
  const m = (method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'DELETE') return undefined;
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

async function safeText(response) {
  try { return await response.text(); } catch { return ''; }
}

async function parseOptionalBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * UTF-8-safe Base64 encoder (handles non-Latin1 credentials unlike raw btoa).
 */
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
