<p align="center">
  <img src="https://raw.githubusercontent.com/otvnvs/ahm-decabase-odata/main/decabase.svg" alt="Decabase" width="120">
</p>

<h1 align="center">AHM Decabase OData</h1>

<p align="center">
  A framework-agnostic OData v4/v2 client library with optional SAP Gateway and Vue 3 layers.
</p>

<p align="center">
  <a href="https://otvnvs.github.io/ahm-decabase-odata/">Live demo</a>
  ·
  <a href="./example">Example app</a>
  ·
  <a href="./docs/architecture.md">Architecture</a>
  ·
  <a href="./docs/api.md">API reference</a>
</p>

- **Core**: fluent query builder, typed CRUD, navigation properties, bound actions/functions, pluggable transport.
- **SAP** (`/sap`): automatic X-CSRF-Token handling, `sap-client` injection, `$format=json`, and a generic RAP draft pipeline.
- **Vue** (`/vue`): reactive config store with optional persistence, plus `provide`/`inject`.

Plain ESM JavaScript, no build step. Requires Node >= 18 (uses global `fetch`, `AbortController`, `URL`, `btoa`).

## Install

From GitHub Packages (configure `~/.npmrc` with your auth token first):

```bash
npm install @otvnvs/ahm-decabase-odata
```

Or directly from git:

```bash
npm install git+https://github.com/otvnvs/ahm-decabase-odata.git
```

## Quick start (core)

```js
import { ODataClient, FetchTransport } from '@otvnvs/ahm-decabase-odata';

const client = new ODataClient({
  baseUrl: 'https://example.com/odata/v4/catalog',
  version: 'v4',                              // or 'v2'
  auth: { type: 'basic', username: 'u', password: 'p' },
  transport: new FetchTransport(),            // default if omitted
  timeoutMs: 15000,
});

// fluent query: $select, $expand, $filter, $orderby, $top, $skip, $count, $search
const { value, count } = await client.entitySet('Books')
  .select('ID', 'Title')
  .expand({ path: 'Author', select: 'Name' })
  .filter(b => b.and(b.eq('Stock', 0), b.contains('Title', 'odata')))
  .orderby({ field: 'Title', desc: true })
  .top(10)
  .list();
```

## CRUD

```js
const books = client.entitySet('Books');

await books.create({ Title: 'New', Stock: 1 });
await books.get(123);
await books.patch(123, { Stock: 2 }, { headers: { 'If-Match': '*' } });
await books.update(123, { Title: 'Renamed', Stock: 2 });
await books.delete(123);
await books.count();                                    // GET Books/$count
```

Composite keys are supported:

```js
await client.entitySet('Items').get({ OrderID: 1, ItemNo: 10 });  // Items(OrderID=1,ItemNo='10')
```

## Navigation and bound operations

```js
// navigation: Orders(123)/Items
await client.entitySet('Orders').nav(123, 'Items').list();

// bound action: Orders(123)/Confirm
await client.entitySet('Orders').callAction(123, 'Confirm', {});

// unbound action / function
await client.unboundAction('Refresh');
await client.unboundFunction('TopSeller', { category: 'books' });
```

## v2 support

Set `version: 'v2'`. The adapter parses `d.results` / `__count`, injects `$format=json`, and `FilterBuilder.contains` maps to `substringof`.

## SAP Gateway (`/sap`)

```js
import { SapODataClient, DraftPipeline, basicAuth } from '@otvnvs/ahm-decabase-odata/sap';

const sap = new SapODataClient({
  baseUrl: 'https://host/sap/opu/odata4/sap/zgr_ui_grdoc_o4/srvd_a2x/sap/zgr_ui_grdoc_o4/0001',
  version: 'v4',
  auth: basicAuth('user', 'pass'),
  sapClient: '100',
  transport: new FetchTransport(),
});

// CSRF tokens are fetched and cached automatically on mutating requests,
// and refreshed + retried transparently on HTTP 403.

// Generic RAP draft pipeline (create header -> add items -> activate):
const draft = new DraftPipeline(sap, 'GoodsReceipt', 'GoodsReceiptUUID');
await draft.run({
  header: { PurchaseOrder: 'PO-1', PostingDate: '2026-06-22' },
  items: [{ nav: '_Item', body: { PurchaseOrderItem: '00010', Material: 'M1' } }],
  action: 'com.sap.gateway.srvd_a2x.zgr_ui_grdoc_o4.v0001.Activate',
});
```

`$format=json` is auto-appended except on `$metadata`, `$count`, and bound action namespaces.

## Transports

Two built-in transports, or supply your own (implement `async request({ url, method, headers, body, timeoutMs })` returning a Response-like object):

- `FetchTransport` — direct `fetch` with `AbortController` timeout.
- `BrokerTransport` — routes requests through a local proxy to bypass CORS (mirrors the `/api/net/request` envelope pattern):

```js
import { BrokerTransport } from '@otvnvs/ahm-decabase-odata';
new BrokerTransport({ brokerUrl: '/api/net/request' });
```

## Vue 3 (`/vue`)

Requires `vue` ^3.3 as a peer dependency.

```js
import { createODataStore, provideOData, useOData } from '@otvnvs/ahm-decabase-odata/vue';
import { SapODataClient } from '@otvnvs/ahm-decabase-odata/sap';

const store = createODataStore({
  persist: true,                                  // optional localStorage persistence
  clientClass: SapODataClient,
  initial: { baseUrl: 'https://host/srv', version: 'v4', sapClient: '100' },
});

// in a root component
provideOData(store);

// in any descendant
const { config, createClient, updateConfig } = useOData();
const client = createClient();                   // builds a client from current reactive config
```

## Example app

A live, interactive demo is deployed to GitHub Pages:

**https://otvnvs.github.io/ahm-decabase-odata/**

It exercises the core API (`entitySet`, `filter`, `orderby`, `top`, `select`, `count`, `create`) against an in-memory mock OData v4 transport — no backend required. Source is in [`./example`](./example). Run it locally:

```bash
cd example
npm install
npm run dev
```

To point the demo at a live OData service, swap the `MockTransport` in `example/src/App.vue` for `new FetchTransport()` and set a real `baseUrl`.


## Testing

Use `npm run test` or `npx vitest run` to run the tests. To run against SAP CAP Odata server, first run CAP server:

```bash
cd odata-server
npm install
cds deploy
cds watch
```

After that, run `npm run test:live` or `npx vitest run test/live-server.test.js`

## Documentation

- [Architecture](./docs/architecture.md) — layering, transport contract, protocol adapters, SAP CSRF/draft design.
- [API reference](./docs/api.md) — full public surface with signatures.

## Project layout

```
src/
  core/     client, entitySet, query, filter, transport, url, error
  adapters/ v4, v2
  sap/      SapODataClient, csrf, draft pipeline, auth
  vue/      createODataStore, provide/inject
```

## Develop

```bash
npm install
npm test
```

## License

MIT
