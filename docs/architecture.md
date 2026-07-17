# Architecture

AHM Decabase OData is a layered OData client. The **core** is framework- and vendor-agnostic; **SAP** and **Vue** are opt-in layers that build on it.

```
┌───────────────────────────────────────────────┐
│  vue/   createODataStore, provideOData/useOData │  (optional, peer dep on vue)
├───────────────────────────────────────────────┤
│  sap/   SapODataClient, CsrfManager,           │  (optional)
│         DraftPipeline, auth                     │
├───────────────────────────────────────────────┤
│  core/  ODataClient, EntitySet, ODataQuery,     │  (required)
│         FilterBuilder, transport, url, error    │
│         adapters/ v4, v2                        │
└───────────────────────────────────────────────┘
```

Consumers import only what they need via subpath entry points: `@otvnvs/ahm-decabase-odata`, `.../sap`, `.../vue`.

## Core

### Request pipeline

`ODataClient._request({ path, params, method, body, headers })` is the single pipeline every operation funnels through:

1. **Headers** — `_applyAuth` injects `Authorization` (basic / bearer / custom / function); `_applyDefaultHeaders` sets `Accept` (JSON, or XML for `$metadata`), `Content-Type` for modifying methods, and any static `config.headers`.
2. **Path** — `_buildPath(path, params)` merges adapter defaults + caller params and percent-encodes values via `appendQueryParams`. Subclasses (SAP) override this to inject `sap-client` / `$format`.
3. **Hooks** — `_beforeRequest(config)` lets subclasses attach a CSRF token before dispatch. `_onResponseError(config, response, retry)` lets subclasses recover from a failure (SAP retries on 403).
4. **Transport** — `transport.request(config)` performs the HTTP call and returns a Response-like object (`{ status, ok, statusText, headers.get(), json(), text() }`).
5. **Errors** — non-2xx responses are parsed with `parseODataError` (handles v4 `error.message`, v2 `error.message.value`, and text fallbacks) and thrown as `ODataError` carrying `status`, `body`, and `endpoint`.

The hook design means the SAP layer extends behavior **without** the core knowing about SAP.

### Transport contract

A transport is any object implementing:

```js
async request({ url, method, headers, body, timeoutMs }) // -> { status, ok, headers: { get(name) }, json(), text() }
```

Two built-ins:

- **`FetchTransport`** — native `fetch` with `AbortController` timeout, `mode`/`credentials` configurable.
- **`BrokerTransport`** — routes requests through a local proxy (`/api/net/request` by default) to bypass CORS. It packages `{ url, method, headers, body }` into the broker envelope and re-hydrates a Response-like object. It also captures `Set-Cookie` from broker responses and echoes cookies back on subsequent requests (session affinity).

Because the transport is injectable, apps that need a CORS proxy, a native bridge (e.g. Android WebView), or a test double all use the same client code — only the transport changes.

### Query building

`ODataQuery` is a fluent builder that accumulates OData system query options into a params object:

- `select(...fields)` → `$select`
- `expand(...specs)` → `$expand` (strings or nested `{ path, select, filter, orderby, top, expand }`)
- `filter(spec)` → `$filter` (accepts a raw string **or** a `(builder) => expr` callback)
- `orderby(...specs)` → `$orderby`
- `top(n)` / `skip(n)` → `$top` / `$skip`
- `count()` → `$count` (v4) — the v2 adapter maps this to `$inlinecount=allpages`
- `search(term)` → `$search`
- `set(name, value)` — raw passthrough for anything not covered

Options are written into `params` in call order, so the emitted query string mirrors the order the caller chained them.

### FilterBuilder

`FilterBuilder` produces OData filter expressions with correct spacing and literal escaping. Strings are single-quoted with `'` doubled (`O'Brien` → `'O''Brien'`); numbers, booleans, `null`, `Date`, and arrays (for the `in` operator) are formatted by `formatLiteral`.

Version-aware: `contains(field, val)` emits `contains(...)` for v4 and `substringof(val, field)` for v2. This keeps version differences out of call sites.

### EntitySet

`EntitySet` owns the per-collection fluent query state and exposes the CRUD + navigation + operations API:

- `list()` / `first()` / `get(key)` / `count()`
- `create(body)` / `update(key, body)` / `patch(key, body)` / `delete(key)`
- `nav(key, property)` — returns a new `EntitySet` bound to a navigation path (`EntitySet(key)/property`)
- `callAction(key, actionName, payload)` — bound action; `callFunction(key, funcName, params)` — bound function
- Composite keys: pass an object (`{ A: 1, B: 'x' }`) → `EntitySet(A=1,B='x')`

### Protocol adapters

v2/v4 differences are isolated behind `{ parseCollection, parseSingle, defaultParams }`:

| | v4 | v2 |
|---|---|---|
| Collection payload | `{ value: [...], '@odata.count', '@odata.nextLink' }` | `{ d: { results: [...], __count, __next } }` |
| Single entity | the object itself | `{ d: { ... } }` |
| Default params | `{}` | `{ $format: 'json' }` |

The client picks its adapter from `version`; both can be imported directly.

## SAP layer (`/sap`)

### SapODataClient

Extends `ODataClient` and overrides two pipeline hooks:

- `_buildPath` — injects `sap-client` and `$format=json`, **except** on `$metadata`, `$count`, and bound action namespaces (paths whose last segment contains a `.` but doesn't start with `$`). SAP Gateway rejects `$format` on those.
- `_beforeRequest` — for modifying methods, attaches a cached `X-CSRF-Token`; if none cached, fetches one first.
- `_onResponseError` — on HTTP 403, clears the cached token, refetches, and retries the original request once.

CSRF state lives on a `CsrfManager` instance (one per client), not a module global — so multiple SAP clients don't share tokens.

### DraftPipeline

A generic RAP draft orchestrator with no domain coupling:

1. `createHeader(body)` — POST to the entity set; captures the draft UUID from a configurable key field.
2. `addItem(nav, body)` — POST to `EntitySet(key, IsActiveEntity=false)/nav`.
3. `activate(actionName)` — invoke the bound activation action.

`run({ header, items, action })` does all three in sequence. Callers supply the entity set name, the UUID field name, and the activation action namespace — the pipeline is otherwise domain-free.

### Auth helpers

`basicAuth(username, password)`, `bearerAuth(token)`, and `basicAuthHeader(...)` (UTF-8-safe, unlike raw `btoa` — non-Latin1 passwords encode correctly).

## Vue layer (`/vue`)

`createODataStore(options)` returns a reactive `{ state, config, cache, status, createClient, ... }` object:

- **`config`** — reactive OData client config (bindable in forms).
- **`cache`** — metadata XML + entity-list cache buckets.
- **`status`** — connection / last-error flags.
- **`createClient(transport?)`** — builds an `ODataClient` (or subclass via `clientClass`) snapshot from the current reactive config.
- Optional `persist: true` mirrors `config` to `localStorage` (configurable `storageKey`); `reset()` clears state and storage.

`provideOData(store)` / `useOData()` are thin `provide`/`inject` wrappers around a Symbol key, so a single store is shared across a component tree.

The store holds configuration; the core client does the work. This keeps the framework coupling in one optional module.
