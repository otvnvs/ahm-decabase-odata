// Fluent builder for OData query options ($select, $expand, $filter, etc).
// Produces a params object consumed by appendQueryParams.

import { resolveFilter } from './filter.js';

export class ODataQuery {
  constructor(version = 'v4') {
    this.version = version;
    this.params = {};
  }

  // --- $select ---
  select(...fields) {
    const flat = fields.flat().filter(Boolean);
    if (flat.length) this.params.$select = flat.join(',');
    return this;
  }

  // --- $expand ---
  // Accepts: string path | string[] of paths | { path, select, filter, orderby, top, expand }
  // Writes directly into params so call order is preserved relative to other options.
  expand(...specs) {
    for (const spec of specs.flat()) {
      if (spec == null) continue;
      const seg = typeof spec === 'string' ? spec : buildExpand(spec, this.version);
      if (!seg) continue;
      this.params.$expand = this.params.$expand ? `${this.params.$expand},${seg}` : seg;
    }
    return this;
  }

  // --- $filter ---
  // Accepts: raw string | (builder) => expression
  filter(spec) {
    this.params.$filter = resolveFilter(spec, this.version);
    return this;
  }

  // --- $orderby ---
  // Accepts: 'Field desc' | 'Field' | ['Field asc', 'Field2 desc'] | [{field, desc}]
  orderby(...specs) {
    const parts = specs.flat().filter(Boolean).map(normalizeOrderby).filter(Boolean);
    if (parts.length) this.params.$orderby = parts.join(',');
    return this;
  }

  // --- paging ---
  top(n) { if (n != null) this.params.$top = Number(n); return this; }
  skip(n) { if (n != null) this.params.$skip = Number(n); return this; }

  // --- $count (v4) / $inlinecount (v2) ---
  count(enabled = true) {
    this.params.$count = enabled ? 'true' : undefined;
    return this;
  }

  // --- $search ---
  search(term) {
    if (term != null && term !== '') this.params.$search = `"${String(term).replace(/"/g, '""')}"`;
    return this;
  }

  // --- raw param passthrough ---
  set(name, value) {
    if (value === undefined || value === null) delete this.params[name];
    else this.params[name] = value;
    return this;
  }

  // --- serialize ---
  toParams() {
    return { ...this.params };
  }
}

function normalizeOrderby(spec) {
  if (typeof spec === 'string') return spec.trim();
  if (spec && typeof spec === 'object') {
    const dir = spec.desc ? 'desc' : spec.asc === false ? 'desc' : 'asc';
    return `${spec.field} ${dir}`;
  }
  return '';
}

/**
 * Build a nested $expand segment, e.g. `Items($select=Material;$filter=...)`.
 */
function buildExpand(spec, version) {
  const path = spec.path || spec.name;
  if (!path) return '';
  const inner = [];
  if (spec.select) inner.push(`$select=${[].concat(spec.select).join(',')}`);
  if (spec.filter) {
    const f = resolveFilter(spec.filter, version);
    if (f) inner.push(`$filter=${f}`);
  }
  if (spec.orderby) {
    const ob = [].concat(spec.orderby).map(normalizeOrderby).filter(Boolean).join(',');
    if (ob) inner.push(`$orderby=${ob}`);
  }
  if (spec.top != null) inner.push(`$top=${Number(spec.top)}`);
  if (spec.expand) {
    const sub = [].concat(spec.expand).map(s => (typeof s === 'string' ? s : buildExpand(s, version))).filter(Boolean).join(',');
    if (sub) inner.push(`$expand=${sub}`);
  }
  if (inner.length === 0) return path;
  return `${path}(${inner.join(';')})`;
}
