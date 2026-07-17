# API reference

All entry points are ESM. Import paths:

- `@otvnvs/ahm-decabase-odata` — core
- `@otvnvs/ahm-decabase-odata/sap` — SAP Gateway
- `@otvnvs/ahm-decabase-odata/vue` — Vue 3

Requires Node >= 18 (global `fetch`, `AbortController`, `URL`, `btoa`).

## Core

### `ODataClient`

```js
new ODataClient(config)
```

`config`:

| field | type | default | description |
|---|---|---|---|
| `baseUrl` | `string` | `''` | service root prepended to all paths |
| `version` | `'v4' \| 'v2'` | `'v4'` | selects the protocol adapter |
| `auth` | `object \| () => headers` | — | `{ type: 'basic', username, password }`, `{ type: 'bearer', token }`, `{ type: 'custom', headers }`, or a function returning a headers object |
| `transport` | `object` | `FetchTransport` | implements `async request({ url, method, headers, body, timeoutMs })` |
| `adapter` | `object` | by `version` | `{ parseCollection, parseSingle, defaultParams }` |
| `timeoutMs` | `number` | `30000` | passed to the transport |
| `headers` | `object` | `{}` | static default headers |

Methods:

- `entitySet(name) -> EntitySet`
- `unboundAction(name, payload, options?) -> Promise<any>`
- `unboundFunction(name, params, options?) -> Promise<any>`
- `fetchMetadata() -> Promise<string>` (raw XML)
- `request(path, options) -> Promise<Response>` — raw escape hatch

Overridable hooks (subclasses): `_buildPath(path, params)`, `_applyAuth(headers)`, `_applyDefaultHeaders(headers, method, path)`, `_beforeRequest(req)`, `_onResponseError(req, response, retry)`.

### `EntitySet`

Returned by `client.entitySet(name)`. Each query method is chainable and mutates the set's query state.

Query:

- `select(...fields)` → `$select`
- `expand(...specs)` → `$expand` (string, or `{ path, select, filter, orderby, top, expand }`)
- `filter(spec)` → `$filter`; `spec` is a string or `(b: FilterBuilder) => string`
- `orderby(...specs)` → `$orderby`; spec is `'Field desc'` or `{ field, desc }`
- `top(n)`, `skip(n)`
- `count(enabled = true)` → `$count`
- `search(term)` → `$search`
- `set(name, value)` — raw param

Read:

- `list() -> Promise<{ value, count, nextLink }>`
- `first() -> Promise<object | null>` (sets `$top=1`)
- `get(key) -> Promise<object>`; `key` is a primitive or composite `{ ... }`
- `count() -> Promise<number>` (GET `EntitySet/$count`)

Write:

- `create(body, options?) -> Promise<object>` (POST)
- `update(key, body, options?) -> Promise<void>` (PUT)
- `patch(key, body, options?) -> Promise<void>` (PATCH)
- `delete(key, options?) -> Promise<void>` (DELETE)

Navigation & operations:

- `nav(key, property) -> EntitySet` (binds to `EntitySet(key)/property`)
- `callAction(key, actionName, payload?, options?) -> Promise<any>` (bound action; `key=null` for collection-bound)
- `callFunction(key, funcName, params?, options?) -> Promise<any>`

`options` is `{ headers }`.

### `ODataQuery`

The fluent builder `EntitySet` delegates to. Usable directly:

```js
import { ODataQuery } from '@otvnvs/ahm-decabase-odata';
const params = new ODataQuery('v4').select('ID').filter(b => b.eq('ID', 1)).toParams();
// { $select: 'ID', $filter: "ID eq 1" }
```

Same methods as the `EntitySet` query chain, plus `toParams() -> object`.

### `FilterBuilder`

```js
new FilterBuilder(version = 'v4')
```

Comparisons: `eq`, `ne`, `gt`, `ge`, `lt`, `le` — `(field, value) => string`.
Membership: `in(field, values[])`.
String functions: `contains(field, value)`, `startswith(field, value)`, `endswith(field, value)`.
Combinators: `and(...exprs)`, `or(...exprs)`, `not(expr)`.
Escape hatch: `raw(str)`.

`resolveFilter(spec, version)` accepts a string or `(builder) => expr` and returns the expression string.

### Transports

`FetchTransport({ timeoutMs?, mode?, credentials? })`

`BrokerTransport({ brokerUrl?, timeoutMs?, credentials? })` — CORS-bypassing proxy; captures `Set-Cookie` for session affinity.

`toPlainHeaders(headers)` — normalize `Headers`/object to a plain object.

### `ODataError`

```js
new ODataError(message, { status, statusText, body, endpoint })
```

Fields: `name`, `message`, `status`, `statusText`, `body`, `endpoint`.

`parseODataError(body)` — best-effort message extraction from v4/v2/text payloads; never throws.

### URL helpers

`joinUrl(base, path)`, `escapeString(str)`, `formatLiteral(value)` (strings, numbers, booleans, null, Date, arrays), `buildEntityPath(set, key)`, `appendQueryParams(path, params)`, `encodeODataValue(value)`.

`encodeODataValue` percent-encodes spaces but leaves OData-structural chars (`' ( ) , / : * !`) literal — required by strict SAP Gateway URI validation.

### Adapters

`v4Adapter`, `v2Adapter` — `{ version, defaultParams, parseCollection(body), parseSingle(body) }`.

## SAP (`/sap`)

### `SapODataClient`

```js
new SapODataClient(config)
```

`config` extends `ODataClient` with `sapClient?: string` and `csrf?: CsrfManager`. Auto-injects `X-CSRF-Token` (fetch/cache/retry on 403), `sap-client`, and `$format=json` (skipped on `$metadata`, `$count`, and bound action namespaces).

### `CsrfManager`

```js
new CsrfManager()
```

- `token` — current cached token (null when unset)
- `clear()` — invalidate
- `fetch({ transport, baseUrl, sapClient, applyAuth, timeoutMs }) -> Promise<string|null>`

### `DraftPipeline`

```js
new DraftPipeline(client, entitySet, keyField)
```

- `createHeader(body) -> Promise<object>` (captures `body[keyField]` as the draft key)
- `addItem(navigationProperty, body) -> Promise<object>`
- `activate(actionName) -> Promise<any>`
- `run({ header, items: [{ nav, body }], action }) -> Promise<any>`

### Auth

`basicAuth(username, password)`, `bearerAuth(token)`, `basicAuthHeader(username, password)` (UTF-8-safe).

## Vue (`/vue`)

Requires `vue` ^3.3 (optional peer dependency).

### `createODataStore(options)`

`options`:

| field | type | default | description |
|---|---|---|---|
| `persist` | `boolean` | `false` | mirror `config` to `localStorage` |
| `storageKey` | `string` | `'ahm_odata_store'` | persistence key |
| `clientClass` | `class` | `ODataClient` | e.g. `SapODataClient` |
| `initial` | `object` | defaults | initial config values |

Returns:

- `state`, `config`, `cache`, `status` — reactive
- `createClient(transport?)` — builds a client from current config
- `updateConfig(partial)`, `setMetadataCache(xml)`, `setEntityListCache(name, data)`, `clearEntityListCache(name)`, `setStatus({ connected?, lastError? })`, `reset()`

### `provideOData(store)` / `useOData()`

`provide`/`inject` wrappers around a Symbol key. `useOData()` returns `undefined` if nothing was provided.
