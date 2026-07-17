// SAP Gateway OData client.
// Extends ODataClient with: automatic X-CSRF-Token handling, sap-client injection,
// and $format=json (skipped for $metadata, $count, and bound action/function namespaces).

import { ODataClient } from '../core/client.js';
import { appendQueryParams } from '../core/url.js';
import { CsrfManager } from './csrf.js';

export class SapODataClient extends ODataClient {
  constructor(config = {}) {
    super(config);
    this.csrf = config.csrf || new CsrfManager();
  }

  _buildPath(path, params = {}) {
    const merged = { ...this.adapter.defaultParams, ...params };
    if (this.config.sapClient) merged['sap-client'] = this.config.sapClient;
    if (!shouldSkipFormat(path) && !('$format' in merged)) {
      merged.$format = 'json';
    }
    return appendQueryParams(path, merged);
  }

  async _beforeRequest(req) {
    const method = (req.method || 'GET').toUpperCase();
    if (!isModifying(method)) return;
    if (!this.csrf.token) {
      await this._fetchCsrf();
    }
    if (this.csrf.token) req.headers.set('X-CSRF-Token', this.csrf.token);
  }

  async _onResponseError(req, response, retry) {
    if (response.status === 403 && isModifying((req.method || 'GET').toUpperCase())) {
      this.csrf.clear();
      const fresh = await this._fetchCsrf();
      if (fresh) {
        req.headers.set('X-CSRF-Token', fresh);
        return retry();
      }
    }
    return response;
  }

  async _fetchCsrf() {
    return this.csrf.fetch({
      transport: this.transport,
      baseUrl: this.config.baseUrl,
      sapClient: this.config.sapClient,
      applyAuth: (h) => this._applyAuth(h),
      timeoutMs: this.config.timeoutMs,
    });
  }
}

function isModifying(method) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

/**
 * Decide whether $format=json should be skipped for a path:
 *  - $metadata requests
 *  - $count requests (raw integer response)
 *  - bound action/function calls (last path segment contains a namespace dot)
 */
function shouldSkipFormat(path) {
  if (!path) return false;
  if (path.includes('$metadata')) return true;
  if (path.includes('/$count')) return true;
  const pathOnly = String(path).split('?')[0];
  const segments = pathOnly.split('/');
  const last = segments[segments.length - 1];
  return last.includes('.') && !last.startsWith('$');
}
