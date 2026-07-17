// OData error type and response parsing.

/**
 * Error thrown when an OData request fails (non-2xx status or transport error).
 * Carries the HTTP status, the parsed OData error message, and the raw body.
 */
export class ODataError extends Error {
  constructor(message, { status = 0, statusText = '', body = null, endpoint = '' } = {}) {
    super(message || statusText || `OData request failed (HTTP ${status})`);
    this.name = 'ODataError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.endpoint = endpoint;
  }
}

/**
 * Parse an OData error payload into a human-readable message.
 * Handles v4 ({ error: { code, message } }), v2 ({ error: { message: { value } } }),
 * and plain text/JSON fallbacks. Returns a string (possibly empty) and never throws.
 */
export function parseODataError(body) {
  if (body == null) return '';
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return '';
    try {
      return parseODataError(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }
  if (typeof body === 'object') {
    const err = body.error || body;
    if (typeof err.message === 'string') return err.message;
    if (err.message && typeof err.message.value === 'string') return err.message.value;
    if (typeof err.code === 'string') return err.code;
    if (body.message) return String(body.message);
  }
  return '';
}
