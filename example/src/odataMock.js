// In-memory OData v4 mock service + transport.
// Demonstrates the library's pluggable-transport contract: the app talks to a
// real ODataClient, and this MockTransport services its requests from an
// in-memory collection — no network or backend required.
//
// Swap to a live service by replacing `transport` in App.vue with a FetchTransport
// and pointing baseUrl at your OData v4 endpoint.

import { seedWorkflowItems } from './data/workflowMock.js';

const BOOKS = [
  { ID: 1, Title: 'Programming the SAP Web Application Server', Author: 'Karl Kessler', Stock: 3, Price: 49.9, Genre: 'Technical' },
  { ID: 2, Title: 'OData - The Best Way to REST', Author: 'Ralf Handl', Stock: 0, Genre: 'Technical' },
  { ID: 3, Title: 'Clean Code', Author: 'Robert C. Martin', Stock: 5, Price: 35.5, Genre: 'Technical' },
  { ID: 4, Title: 'The Pragmatic Programmer', Author: 'Andrew Hunt', Stock: 2, Price: 39.9, Genre: 'Technical' },
  { ID: 5, Title: 'Vue 3 Up and Running', Author: 'Evan You', Stock: 7, Price: 29.0, Genre: 'Technical' },
  { ID: 6, Title: 'A Game of Thrones', Author: 'George R. R. Martin', Stock: 12, Price: 22.0, Genre: 'Fantasy' },
  { ID: 7, Title: 'The Hobbit', Author: 'J. R. R. Tolkien', Stock: 9, Price: 18.5, Genre: 'Fantasy' },
  { ID: 8, Title: 'Dune', Author: 'Frank Herbert', Stock: 4, Price: 24.0, Genre: 'Sci-Fi' },
  { ID: 9, Title: 'Neuromancer', Author: 'William Gibson', Stock: 0, Price: 16.0, Genre: 'Sci-Fi' },
  { ID: 10, Title: 'Refactoring', Author: 'Martin Fowler', Stock: 6, Price: 42.0, Genre: 'Technical' },
];

function jsonResponse(status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 404 ? 'Not Found' : 'OK',
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => (text ? JSON.parse(text) : null),
    text: async () => text,
  };
}

// Minimal $filter parser: supports `field eq 'value'`, `field eq number`,
// `contains(field,'x')` (v4), and `and`/`or` conjunctions of those, including
// grouping parens produced by the FilterBuilder.
function applyFilter(rows, filter) {
  if (!filter) return rows;
  const expr = filter.replace(/\s+/g, ' ').trim();
  return rows.filter(row => evalFilter(expr, row));
}

// Strip one or more layers of grouping parens that wrap the entire expression,
// e.g. `(A and B)` -> `A and B`. Leaves function-call parens (contains(...)) alone.
function unwrapOuterParens(expr) {
  expr = expr.trim();
  while (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0, wrapsWhole = false;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') {
        depth--;
        if (depth === 0) { wrapsWhole = (i === expr.length - 1); break; }
      }
    }
    if (wrapsWhole) expr = expr.slice(1, -1).trim();
    else break;
  }
  return expr;
}

function evalFilter(expr, row) {
  expr = unwrapOuterParens(expr);
  // and / or (top-level, respecting nested parens)
  const orParts = splitTop(expr, ' or ');
  if (orParts.length > 1) return orParts.some(p => evalFilter(p, row));
  const andParts = splitTop(expr, ' and ');
  if (andParts.length > 1) return andParts.every(p => evalFilter(p, row));
  const term = expr.trim();
  // contains(field,'x')
  let m = term.match(/^contains\((\w+),'([^']*)'\)$/i);
  if (m) return String(row[m[1]] ?? '').toLowerCase().includes(m[2].toLowerCase());
  // field op value
  m = term.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/);
  if (m) {
    const val = parseValue(m[3]);
    const fv = row[m[1]];
    switch (m[2]) {
      case 'eq': return fv == val;
      case 'ne': return fv != val;
      case 'gt': return fv > val;
      case 'ge': return fv >= val;
      case 'lt': return fv < val;
      case 'le': return fv <= val;
    }
  }
  return true;
}

function splitTop(expr, sep) {
  const parts = [];
  let depth = 0, last = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') depth--;
    else if (depth === 0 && expr.slice(i, i + sep.length) === sep) {
      parts.push(expr.slice(last, i).trim());
      last = i + sep.length;
      i += sep.length - 1;
    }
  }
  parts.push(expr.slice(last).trim());
  return parts.length > 1 ? parts : [expr];
}

function parseValue(raw) {
  raw = raw.trim();
  if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function applyOrderby(rows, orderby) {
  if (!orderby) return rows;
  const specs = orderby.split(',').map(s => s.trim().split(/\s+/));
  return [...rows].sort((a, b) => {
    for (const [field, dir] of specs) {
      const av = a[field], bv = b[field];
      if (av < bv) return dir === 'desc' ? 1 : -1;
      if (av > bv) return dir === 'desc' ? -1 : 1;
    }
    return 0;
  });
}

function applySelect(rows, select) {
  if (!select) return rows;
  const fields = select.split(',').map(s => s.trim());
  return rows.map(r => Object.fromEntries(fields.filter(f => f in r).map(f => [f, r[f]])));
}

export class MockTransport {
  constructor() {
    this.data = [...BOOKS];
    this.nextId = this.data.length + 1;
    this.lastRequest = null;
    this.workflow = seedWorkflowItems();
    this.nextWorkflowId = this.workflow.length + 1;
  }

  async request({ url, method = 'GET', body }) {
    const u = new URL(url, 'http://mock');
    const path = u.pathname.replace(/\/$/, '');
    const q = u.searchParams;
    method = method.toUpperCase();

    this.lastRequest = { method, path, query: Object.fromEntries(q.entries()) };

    // --- WorkflowItems ---
    if (path === '/WorkflowItems' && method === 'GET') {
      return handleWorkflowList(this.workflow, q);
    }
    if (path === '/WorkflowItems' && method === 'POST') {
      const obj = typeof body === 'string' ? JSON.parse(body) : { ...body };
      obj.ID = this.nextWorkflowId++;
      this.workflow.push(obj);
      return jsonResponse(201, obj);
    }
    if (path.endsWith('/$count') && path.startsWith('/WorkflowItems')) {
      const base = path.replace(/\/\$count$/, '');
      if (base === '/WorkflowItems') {
        const rows = applyFilter(this.workflow, q.get('$filter'));
        return jsonResponse(200, String(rows.length), { 'content-type': 'text/plain' });
      }
    }
    {
      const byKey = path.match(/^\/WorkflowItems\((\d+)\)$/);
      if (byKey && method === 'GET') {
        const row = this.workflow.find(w => w.ID === Number(byKey[1]));
        return row ? jsonResponse(200, row) : jsonResponse(404, { error: { message: 'Workflow item not found' } });
      }
      if (byKey && method === 'PATCH') {
        const row = this.workflow.find(w => w.ID === Number(byKey[1]));
        if (!row) return jsonResponse(404, { error: { message: 'Workflow item not found' } });
        const patch = typeof body === 'string' ? JSON.parse(body) : body;
        Object.assign(row, patch);
        return jsonResponse(200, row);
      }
      const submit = path.match(/^\/WorkflowItems\((\d+)\)\/Submit$/);
      if (submit && method === 'POST') {
        const row = this.workflow.find(w => w.ID === Number(submit[1]));
        if (!row) return jsonResponse(404, { error: { message: 'Workflow item not found' } });
        row.Status = 'Done';
        return jsonResponse(200, row);
      }
    }

    // --- Books ---
    // GET /Books/$count
    if (path.endsWith('/$count') && method === 'GET') {
      const base = path.replace(/\/\$count$/, '');
      if (base.endsWith('/Books')) {
        let rows = applyFilter(this.data, q.get('$filter'));
        return jsonResponse(200, String(rows.length), { 'content-type': 'text/plain' });
      }
    }

    // GET /Books
    if (path === '/Books' && method === 'GET') {
      let rows = applyFilter(this.data, q.get('$filter'));
      rows = applyOrderby(rows, q.get('$orderby'));
      const top = q.get('$top') ? Number(q.get('$top')) : null;
      const skip = q.get('$skip') ? Number(q.get('$skip')) : 0;
      const total = rows.length;
      if (skip) rows = rows.slice(skip);
      if (top !== null) rows = rows.slice(0, top);
      rows = applySelect(rows, q.get('$select'));
      const body = { value: rows };
      if (q.get('$count') === 'true') body['@odata.count'] = total;
      return jsonResponse(200, body);
    }

    // POST /Books
    if (path === '/Books' && method === 'POST') {
      const obj = typeof body === 'string' ? JSON.parse(body) : body;
      obj.ID = this.nextId++;
      this.data.push(obj);
      return jsonResponse(201, obj);
    }

    // GET /Books(ID)
    const byKey = path.match(/^\/Books\((\d+)\)$/);
    if (byKey && method === 'GET') {
      const row = this.data.find(b => b.ID === Number(byKey[1]));
      return row ? jsonResponse(200, row) : jsonResponse(404, { error: { message: 'Not found' } });
    }

    return jsonResponse(404, { error: { message: `No mock route for ${method} ${path}` } });
  }
}

function handleWorkflowList(data, q) {
  let rows = applyFilter(data, q.get('$filter'));
  rows = applyOrderby(rows, q.get('$orderby'));
  const top = q.get('$top') ? Number(q.get('$top')) : null;
  const skip = q.get('$skip') ? Number(q.get('$skip')) : 0;
  const total = rows.length;
  if (skip) rows = rows.slice(skip);
  if (top !== null) rows = rows.slice(0, top);
  rows = applySelect(rows, q.get('$select'));
  const body = { value: rows };
  if (q.get('$count') === 'true') body['@odata.count'] = total;
  return jsonResponse(200, body);
}
