// Fluent $filter expression builder.
// Each comparison returns an expression string; combinators join them.
// Version-aware: `contains` maps to `substringof` under v2.

import { formatLiteral } from './url.js';

export class FilterBuilder {
  constructor(version = 'v4') {
    this.version = version;
  }

  // --- comparison operators ---
  eq(field, value) { return op(field, 'eq', value); }
  ne(field, value) { return op(field, 'ne', value); }
  gt(field, value) { return op(field, 'gt', value); }
  ge(field, value) { return op(field, 'ge', value); }
  lt(field, value) { return op(field, 'lt', value); }
  le(field, value) { return op(field, 'le', value); }

  // --- membership (v4 `in`) ---
  in(field, values) {
    if (!Array.isArray(values) || values.length === 0) return '';
    return `${field} in ${formatLiteral(values)}`;
  }

  // --- string functions ---
  contains(field, value) {
    return this.version === 'v2'
      ? `substringof(${formatLiteral(value)},${field})`
      : `contains(${field},${formatLiteral(value)})`;
  }
  startswith(field, value) { return `startswith(${field},${formatLiteral(value)})`; }
  endswith(field, value) { return `endswith(${field},${formatLiteral(value)})`; }

  // --- combinators ---
  and(...exprs) { return combine('and', exprs); }
  or(...exprs) { return combine('or', exprs); }
  not(expr) { return expr ? `not(${expr})` : ''; }

  // --- escape hatch ---
  raw(str) { return String(str); }
}

function op(field, operator, value) {
  return `${field} ${operator} ${formatLiteral(value)}`;
}

function combine(conj, exprs) {
  const parts = exprs.flat().filter(e => e !== null && e !== undefined && e !== '');
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `(${parts.join(` ${conj} `)})`;
}

/**
 * Resolve a filter spec to a string. Accepts:
 *   - a string (passed through verbatim)
 *   - a callback (builder) => expression string
 */
export function resolveFilter(spec, version) {
  if (spec == null || spec === '') return '';
  if (typeof spec === 'string') return spec;
  if (typeof spec === 'function') return spec(new FilterBuilder(version)) || '';
  return '';
}
