import { SapODataClient, basicAuth } from '@otvnvs/ahm-decabase-odata/sap';
import { BrokerTransport } from '@otvnvs/ahm-decabase-odata';

// ============================================================================
// SAP S/4HANA OData v4 service configuration.
// Credentials are loaded from .env.local (gitignored) via Vite's env support.
// See .env.example for the template. On desktop the service worker returns
// mock data; on Android the native Java broker forwards to the real SAP service.
// ============================================================================
const SAP_BASE_URL = import.meta.env.VITE_SAP_BASE_URL || 'https://s4hana2025.professorsoft.com:44300/sap/opu/odata4/sap/zgr_ui_poscan_o4/srvd_a2x/sap/zgr_ui_poscan_o4/0001';
const SAP_USERNAME = import.meta.env.VITE_SAP_USERNAME || 'YOUR_USERNAME';
const SAP_PASSWORD = import.meta.env.VITE_SAP_PASSWORD || 'YOUR_PASSWORD';

const makeClient = () => new SapODataClient({
  baseUrl: SAP_BASE_URL,
  version: 'v4',
  auth: basicAuth(SAP_USERNAME, SAP_PASSWORD),
  transport: new BrokerTransport({ brokerUrl: '/api/net/request', timeoutMs: 15000 }),
});

// Shared state — the runner executes describe blocks sequentially, so these
// are populated by the $metadata test and consumed by later tests.
let discoveredEntitySets = [];
let entitySet = null;
let keyProp = null;
let keyValue = null;

export default async function runSuite(runner) {

  await runner.describe('Decabase OData: $metadata discovery', async (expect) => {
    if (SAP_USERNAME === 'YOUR_USERNAME') {
      expect.log('WARNING: credentials are still placeholders — set SAP_USERNAME / SAP_PASSWORD in this file before running on device.');
    }

    const client = makeClient();
    const metadata = await client.fetchMetadata();
    expect.ok(typeof metadata === 'string', '$metadata returns an XML string');
    expect.ok(metadata.length > 0, '$metadata is non-empty');

    // Parse EntitySet names from CSDL XML (works with or without namespace prefix)
    discoveredEntitySets = [...metadata.matchAll(/EntitySet\s+Name="([^"]+)"/g)].map(m => m[1]);
    expect.ok(discoveredEntitySets.length > 0, `discovered ${discoveredEntitySets.length} entity sets from $metadata`);

    entitySet = discoveredEntitySets[0];
    expect.log(`Available entity sets: ${discoveredEntitySets.join(', ')}`);
    expect.log(`Testing against: ${entitySet}`);
  });

  await runner.describe('Decabase OData: list() via broker', async (expect) => {
    expect.ok(entitySet, 'entity set discovered from $metadata');
    const client = makeClient();
    const result = await client.entitySet(entitySet).top(5).withCount(true).list();
    expect.ok(Array.isArray(result.value), 'list() returns a value array through the broker');
    expect.ok(result.value.length > 0, 'list() returns at least one item');
    expect.ok(typeof result.count === 'number', 'list() returns @odata.count');

    // Discover the key property heuristically (ID, *ID, *Id, or first property)
    const first = result.value[0];
    keyProp = Object.keys(first).find(k => k === 'ID' || k.endsWith('ID') || k.endsWith('Id')) || Object.keys(first)[0];
    keyValue = first[keyProp];
    expect.log(`First item ${keyProp}=${keyValue}`);
    expect.log(`Properties: ${Object.keys(first).join(', ')}`);
  });

  await runner.describe('Decabase OData: $count via broker', async (expect) => {
    const client = makeClient();
    const count = await client.entitySet(entitySet).count();
    expect.equal(typeof count, 'number', 'count() returns a number');
    expect.ok(count >= 1, `count() >= 1 (got ${count})`);
  });

  await runner.describe('Decabase OData: get(key) via broker', async (expect) => {
    const client = makeClient();
    const fetched = await client.entitySet(entitySet).get(keyValue);
    expect.ok(fetched !== null, 'get(key) returns a non-null entity');
    expect.deepEqual(fetched[keyProp], keyValue, 'get(key) returns the entity with the requested key');
  });

  await runner.describe('Decabase OData: first() via broker', async (expect) => {
    const client = makeClient();
    const first = await client.entitySet(entitySet).first();
    expect.ok(first !== null, 'first() returns a non-null entity');
    expect.ok(typeof first[keyProp] !== 'undefined', 'first() returns an entity with the key property');
  });

  await runner.describe('Decabase OData: $filter via broker', async (expect) => {
    const client = makeClient();
    // Find the first string property to filter on
    const list = await client.entitySet(entitySet).top(1).list();
    const entity = list.value[0];
    const stringEntry = Object.entries(entity).find(
      ([k, v]) => typeof v === 'string' && v.length > 0 && k !== keyProp
    );

    if (stringEntry) {
      const [prop, val] = stringEntry;
      const filtered = await client.entitySet(entitySet)
        .filter(b => b.eq(prop, val))
        .top(10)
        .list();
      expect.ok(filtered.value.length >= 1, `$filter(${prop} eq '${val}') returns at least one match`);
      expect.ok(filtered.value.every(r => r[prop] === val), 'all filtered rows match the filter');
      expect.log(`Filtered on ${prop}='${val}': ${filtered.value.length} matches`);
    } else {
      expect.log('No suitable string property found for filter test, skipping');
    }
  });

  await runner.describe('Decabase OData: CSRF token handshake', async (expect) => {
    // Verify the SAP CSRF token can be fetched through the broker.
    // This exercises the _beforeRequest hook in SapODataClient that runs
    // before every modifying request (POST/PATCH/DELETE).
    const client = makeClient();
    const token = await client._fetchCsrf();
    expect.ok(typeof token === 'string', 'CSRF token fetched as a string');
    expect.ok(token.length > 0, 'CSRF token is non-empty');
    expect.equal(client.csrf.token, token, 'CSRF token cached on the client');
    expect.log(`CSRF token: ${token.substring(0, 20)}...`);
  });

  await runner.describe('Decabase OData: error path (404 via broker)', async (expect) => {
    // A 404 from the backend surfaces as an ODataError through the broker.
    const client = makeClient();
    await expect.throws(
      async () => { await client.entitySet(entitySet).get(999999); },
      'get(missing key) throws an ODataError for a 404 from the broker'
    );
  });
}
