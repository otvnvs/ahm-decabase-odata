// Auth helpers for SAP Gateway. Returns auth config objects consumed by ODataClient.

import { utf8ToBase64 } from '../core/client.js';

export function basicAuth(username, password) {
  return { type: 'basic', username, password };
}

export function bearerAuth(token) {
  return { type: 'bearer', token };
}

/** Encode credentials as a Basic auth header value (UTF-8 safe). */
export function basicAuthHeader(username, password) {
  return `Basic ${utf8ToBase64(`${username}:${password || ''}`)}`;
}
