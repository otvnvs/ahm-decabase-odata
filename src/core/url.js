// URL building, key encoding, and literal formatting for OData requests.

/**
 * Join a base URL and a path, collapsing duplicate slashes at the seam.
 * Accepts either an absolute path or a path relative to baseUrl.
 */
export function joinUrl(base, path) {
  if (!base) return path || '';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  let cleanPath = path || '';
  if (cleanPath && !cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Escape single quotes inside an OData string literal (doubled).
 */
export function escapeString(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Format a JavaScript value as an OData literal for use in $filter or keys.
 *   strings  -> 'value'  (except GUIDs -> unquoted, per Edm.Guid spec)
 *   numbers  -> value
 *   booleans -> true | false
 *   null     -> null
 *   Date     -> ISO timestamp (callers may wrap with datetimeoffset() if needed)
 *   array    -> ('a','b') for use with the `in` operator
 */
export function formatLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `(${value.map(formatLiteral).join(',')})`;
  if (GUID_RE.test(value)) return value;
  return `'${escapeString(value)}'`;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the parenthesized key segment for an entity, e.g.
 *   EntitySet('PO-1')                         -> "EntitySet('PO-1')"
 *   EntitySet({A:1, B:'x'})                   -> "EntitySet(A=1,B='x')"
 * Single-value keys may be passed as a primitive; objects become composite keys.
 */
export function buildEntityPath(entitySetName, key) {
  if (key === null || key === undefined) return entitySetName;
  if (typeof key === 'object' && !Array.isArray(key)) {
    const pairs = Object.entries(key)
      .map(([k, v]) => `${k}=${formatLiteral(v)}`)
      .join(',');
    return `${entitySetName}(${pairs})`;
  }
  return `${entitySetName}(${formatLiteral(key)})`;
}

/**
 * Percent-encode an OData query-option value. Spaces become %20, but
 * OData-structural characters (quotes, parens, commas, slashes, colons, *, !)
 * are left literal — this matches the behavior proven against SAP Gateway,
 * where fully-encoded values can be rejected.
 */
export function encodeODataValue(value) {
  return encodeURIComponent(String(value))
    .replace(/%27/g, "'")
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2C/gi, ',')
    .replace(/%2F/gi, '/')
    .replace(/%3A/gi, ':')
    .replace(/%2A/gi, '*')
    .replace(/%21/gi, '!');
}

/**
 * Append OData query parameters to a path. `params` is a map of param name -> value.
 * Falsy values are skipped (so `$count: undefined` is omitted, but `$count: true` stays).
 * Values are stringified and OData-encoded.
 */
export function appendQueryParams(path, params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return path;
  const sep = path.includes('?') && !path.endsWith('?') ? '&' : path.endsWith('?') ? '' : '?';
  const query = entries
    .map(([k, v]) => `${k}=${encodeODataValue(String(v))}`)
    .join('&');
  return `${path}${sep}${query}`;
}
