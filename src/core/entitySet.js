// EntitySet: CRUD + navigation + bound actions/functions over an OData entity set.

import { ODataQuery } from './query.js';
import { buildEntityPath } from './url.js';

export class EntitySet {
  constructor(client, name, parentPath = '') {
    this.client = client;
    this.name = name;
    this.parentPath = parentPath;
    this.query = new ODataQuery(client.version);
  }

  // --- query-option delegators (chainable) ---
  select(...f) { this.query.select(...f); return this; }
  expand(...s) { this.query.expand(...s); return this; }
  filter(spec) { this.query.filter(spec); return this; }
  orderby(...s) { this.query.orderby(...s); return this; }
  top(n) { this.query.top(n); return this; }
  skip(n) { this.query.skip(n); return this; }
  withCount(enabled = true) { this.query.count(enabled); return this; }
  search(term) { this.query.search(term); return this; }
  set(name, value) { this.query.set(name, value); return this; }

  // --- path helpers ---
  collectionPath() {
    return this.parentPath ? `${this.parentPath}${this.name}` : this.name;
  }

  entityPath(key) {
    return buildEntityPath(this.collectionPath(), key);
  }

  /**
   * Return a new EntitySet bound to a navigation property of a keyed entity,
   * e.g. entitySet.nav('GoodsReceipt', 'Item') -> "GoodsReceipt(...)/Item".
   * `key` may be a primitive or a composite-key object.
   */
  nav(key, property) {
    const parent = buildEntityPath(this.collectionPath(), key);
    return new EntitySet(this.client, property, `${parent}/`);
  }

  // --- read ---
  async list() {
    const response = await this.client._request({ path: this.collectionPath(), params: this.query.toParams(), method: 'GET' });
    return this.client.adapter.parseCollection(await parseBody(response));
  }

  async first() {
    this.query.top(1);
    const response = await this.client._request({ path: this.collectionPath(), params: this.query.toParams(), method: 'GET' });
    const { value } = this.client.adapter.parseCollection(await parseBody(response));
    return value[0] ?? null;
  }

  async get(key) {
    const response = await this.client._request({ path: this.entityPath(key), params: this.query.toParams(), method: 'GET' });
    return this.client.adapter.parseSingle(await parseBody(response));
  }

  /**
   * GET EntitySet/$count -> raw integer total.
   * Honors $filter and $search when set; ignores $select/$expand/$top/$skip.
   */
  async count() {
    const countParams = {};
    if (this.query.params.$filter) countParams.$filter = this.query.params.$filter;
    if (this.query.params.$search) countParams.$search = this.query.params.$search;
    const response = await this.client._request({ path: `${this.collectionPath()}/$count`, params: countParams, method: 'GET' });
    const text = (await response.text()).trim();
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }

  // --- write ---
  async create(body, options = {}) {
    const response = await this.client._request({
      path: this.collectionPath(),
      method: 'POST',
      body,
      headers: options.headers,
    });
    return this.client.adapter.parseSingle(await parseBody(response));
  }

  async update(key, body, options = {}) {
    await this.client._request({
      path: this.entityPath(key),
      method: 'PUT',
      body,
      headers: options.headers,
    });
  }

  async patch(key, body, options = {}) {
    await this.client._request({
      path: this.entityPath(key),
      method: 'PATCH',
      body,
      headers: options.headers,
    });
  }

  async delete(key, options = {}) {
    await this.client._request({
      path: this.entityPath(key),
      method: 'DELETE',
      headers: options.headers,
    });
  }

  // --- bound operations ---
  /**
   * Invoke a bound action: EntitySet(key)/actionName.
   * `key` may be a primitive, composite-key object, or null for collection-bound.
   */
  async callAction(key, actionName, payload = {}, options = {}) {
    const base = key === null ? this.collectionPath() : this.entityPath(key);
    const path = `${base}/${actionName}`;
    const response = await this.client._request({
      path,
      method: 'POST',
      body: payload,
      headers: options.headers,
    });
    return parseOptionalBody(response);
  }

  /**
   * Invoke a bound function: EntitySet(key)/funcName(param=val,...).
   * `params` is a map of name -> literal value.
   */
  async callFunction(key, funcName, params = {}, options = {}) {
    const base = key === null ? this.collectionPath() : this.entityPath(key);
    const args = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    const path = args ? `${base}/${funcName}(${args})` : `${base}/${funcName}()`;
    const response = await this.client._request({ path, method: 'GET', headers: options.headers });
    return parseOptionalBody(response);
  }
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function parseOptionalBody(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}
