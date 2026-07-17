// Mock transport for unit tests. Records calls and returns canned responses.

export class MockTransport {
  /**
   * @param {(config) => {status?, headers?, body?} | Promise<...>} responder
   */
  constructor(responder) {
    this.responder = responder;
    this.calls = [];
  }

  async request(config) {
    this.calls.push(config);
    const res = await this.responder(config);
    const status = res.status ?? 200;
    const headers = res.headers || {};
    const body = res.body ?? '';
    const textBody = typeof body === 'string' ? body : JSON.stringify(body);
    return {
      status,
      ok: status >= 200 && status < 300,
      statusText: res.statusText ?? (status === 403 ? 'Forbidden' : 'OK'),
      headers: {
        get: (name) => headers[name.toLowerCase()] ?? null,
      },
      json: async () => (textBody ? JSON.parse(textBody) : null),
      text: async () => textBody,
    };
  }
}

/** Extract just the path + query from an absolute URL, dropping origin and leading slash. */
export function pathOf(url) {
  return url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
}
