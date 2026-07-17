// CSRF token manager for SAP Gateway.
// SAP requires an X-CSRF-Token on every modifying request (POST/PUT/PATCH/DELETE).
// The token is fetched via a GET handshake with `X-CSRF-Token: Fetch` and cached;
// on a 403 response the cached token is presumed expired and refetched.

export class CsrfManager {
  constructor() {
    this.token = null;
  }

  clear() {
    this.token = null;
  }

  /**
   * Fetch a fresh token from the service root.
   * @param {object} opts - { transport, baseUrl, sapClient, authHeaders, timeoutMs }
   */
  async fetch({ transport, baseUrl, sapClient, applyAuth, timeoutMs }) {
    const headers = new Headers();
    headers.set('X-CSRF-Token', 'Fetch');
    headers.set('Accept', 'application/json');
    if (typeof applyAuth === 'function') applyAuth(headers);

    let url = baseUrl;
    if (sapClient) url += `${url.includes('?') ? '&' : '?'}sap-client=${sapClient}`;

    const response = await transport.request({ url, method: 'GET', headers, timeoutMs });
    this.token = response.headers.get('x-csrf-token');
    return this.token;
  }
}
