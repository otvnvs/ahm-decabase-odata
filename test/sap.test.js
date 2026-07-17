import { describe, it, expect } from 'vitest';
import { SapODataClient } from '../src/sap/client.js';
import { DraftPipeline } from '../src/sap/draft.js';
import { basicAuth } from '../src/sap/auth.js';
import { MockTransport, pathOf } from './helpers/mockTransport.js';

function makeSapClient(responder, config = {}) {
  const transport = new MockTransport(responder);
  return {
    transport,
    client: new SapODataClient({ baseUrl: 'https://host/srv', transport, sapClient: '100', ...config }),
  };
}

describe('SapODataClient path building', () => {
  it('injects $format=json and sap-client on collection GET', async () => {
    const { client, transport } = makeSapClient(() => ({ body: { value: [] } }));
    await client.entitySet('Orders').list();
    const url = pathOf(transport.calls[0].url);
    expect(url).toContain('$format=json');
    expect(url).toContain('sap-client=100');
  });

  it('skips $format for $metadata', async () => {
    const { client, transport } = makeSapClient(() => ({ body: '<Edmx/>' }));
    await client.fetchMetadata();
    const url = pathOf(transport.calls[0].url);
    expect(url).not.toContain('$format');
    expect(url).toContain('sap-client=100');
  });

  it('skips $format for $count', async () => {
    const { client, transport } = makeSapClient(() => ({ body: '7' }));
    await client.entitySet('Orders').count();
    const url = pathOf(transport.calls[0].url);
    expect(url).toContain('/$count');
    expect(url).not.toContain('$format');
  });

  it('skips $format for bound action namespaces', async () => {
    const { client, transport } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'T' }, body: {} };
      }
      return { status: 200, body: { IsActiveEntity: true } };
    });
    await client.entitySet('GoodsReceipt').callAction({ Uuid: 'u', IsActiveEntity: false }, 'com.sap.v0001.Activate', {});
    const actionCall = transport.calls.find(c => c.method === 'POST' && pathOf(c.url).includes('com.sap.v0001.Activate'));
    const url = pathOf(actionCall.url);
    expect(url).toContain('com.sap.v0001.Activate');
    expect(url).not.toContain('$format');
  });

  it('respects an explicit $format from the caller', async () => {
    const { client, transport } = makeSapClient(() => ({ body: { value: [] } }));
    await client.entitySet('Orders').set('$format', 'xml').list();
    const url = pathOf(transport.calls[0].url);
    expect(url).toContain('$format=xml');
    expect(url).not.toContain('$format=json');
  });
});

describe('SapODataClient CSRF handling', () => {
  it('fetches and attaches a CSRF token on modifying requests', async () => {
    const { client, transport } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'TOKEN-A' }, body: {} };
      }
      return { status: 200, body: {} };
    });

    await client.entitySet('Orders').create({ id: 1 });

    // first call = CSRF fetch (GET, Fetch header)
    expect(transport.calls[0].method).toBe('GET');
    expect(transport.calls[0].headers.get('X-CSRF-Token')).toBe('Fetch');
    // second call = the actual POST with the token attached
    expect(transport.calls[1].method).toBe('POST');
    expect(transport.calls[1].headers.get('X-CSRF-Token')).toBe('TOKEN-A');
  });

  it('does not fetch CSRF for GET requests', async () => {
    const { client, transport } = makeSapClient(() => ({ body: { value: [] } }));
    await client.entitySet('Orders').list();
    expect(transport.calls).toHaveLength(1);
    expect(transport.calls[0].method).toBe('GET');
  });

  it('retries on 403 with a fresh token', async () => {
    let postAttempts = 0;
    const { client, transport } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        // first fetch -> stale token, second fetch -> fresh token
        return { status: 200, headers: { 'x-csrf-token': postAttempts === 0 ? 'STALE' : 'FRESH' }, body: {} };
      }
      if (req.method === 'POST') {
        postAttempts++;
        if (postAttempts === 1) return { status: 403, body: { error: { message: 'csrf expired' } } };
        return { status: 200, body: { ok: true } };
      }
      return { status: 200, body: {} };
    });

    const result = await client.entitySet('Orders').create({ id: 1 });
    expect(result.ok).toBe(true);

    // Sequence: CSRF fetch (STALE) -> POST (403) -> CSRF fetch (FRESH) -> POST (200)
    const methods = transport.calls.map(c => c.method);
    expect(methods).toEqual(['GET', 'POST', 'GET', 'POST']);
    // last POST used the fresh token
    expect(transport.calls[3].headers.get('X-CSRF-Token')).toBe('FRESH');
  });

  it('reuses cached CSRF token across multiple modifying requests', async () => {
    const { client, transport } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'CACHED' }, body: {} };
      }
      return { status: 200, body: {} };
    });

    await client.entitySet('Orders').create({ id: 1 });
    await client.entitySet('Orders').create({ id: 2 });

    // one CSRF fetch + two POSTs
    expect(transport.calls).toHaveLength(3);
    expect(transport.calls[1].headers.get('X-CSRF-Token')).toBe('CACHED');
    expect(transport.calls[2].headers.get('X-CSRF-Token')).toBe('CACHED');
  });
});

describe('DraftPipeline', () => {
  it('runs create -> add items -> activate', async () => {
    const { client, transport } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'T' }, body: {} };
      }
      const p = pathOf(req.url);
      // header POST: targets "GoodsReceipt" with no key parens and no navigation/action
      if (req.method === 'POST' && p.includes('GoodsReceipt') && !p.includes('GoodsReceipt(') && !p.includes('Activate')) {
        return { status: 201, body: { GoodsReceiptUUID: 'uuid-1', IsActiveEntity: false } };
      }
      // item POST
      if (req.method === 'POST' && p.includes('/_Item')) {
        return { status: 201, body: { ok: true } };
      }
      // activate action POST
      if (req.method === 'POST' && p.includes('/com.sap.v0001.Activate')) {
        return { status: 200, body: { IsActiveEntity: true } };
      }
      return { status: 200, body: {} };
    });

    const draft = new DraftPipeline(client, 'GoodsReceipt', 'GoodsReceiptUUID');
    const header = await draft.createHeader({ PurchaseOrder: 'PO-1' });
    expect(header.GoodsReceiptUUID).toBe('uuid-1');

    await draft.addItem('_Item', { PurchaseOrderItem: '00010' });
    const activated = await draft.activate('com.sap.v0001.Activate');
    expect(activated.IsActiveEntity).toBe(true);

    // Verify the item POST targeted the draft navigation path with composite key
    const itemPost = transport.calls.find(
      c => c.method === 'POST' && pathOf(c.url).includes("GoodsReceipt(GoodsReceiptUUID='uuid-1',IsActiveEntity=false)/_Item")
    );
    expect(itemPost).toBeTruthy();
  });

  it('run() executes the full pipeline', async () => {
    const { client } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'T' }, body: {} };
      }
      const p = pathOf(req.url);
      if (req.method === 'POST' && p.includes('GoodsReceipt') && !p.includes('GoodsReceipt(') && !p.includes('Activate')) {
        return { status: 201, body: { GoodsReceiptUUID: 'u2' } };
      }
      if (req.method === 'POST' && p.includes('/com.sap.v0001.Activate')) {
        return { status: 200, body: { IsActiveEntity: true } };
      }
      return { status: 200, body: {} };
    });

    const draft = new DraftPipeline(client, 'GoodsReceipt', 'GoodsReceiptUUID');
    const result = await draft.run({
      header: { PurchaseOrder: 'PO-2' },
      items: [{ nav: '_Item', body: { PurchaseOrderItem: '00010' } }],
      action: 'com.sap.v0001.Activate',
    });
    expect(result.IsActiveEntity).toBe(true);
  });

  it('throws if addItem/activate called before createHeader', async () => {
    const { client } = makeSapClient(() => ({ body: {} }));
    const draft = new DraftPipeline(client, 'GoodsReceipt', 'GoodsReceiptUUID');
    await expect(draft.addItem('_Item', {})).rejects.toThrow(/createHeader/);
    await expect(draft.activate('x')).rejects.toThrow(/createHeader/);
  });

  it('throws if header response lacks the key field', async () => {
    const { client } = makeSapClient((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'T' }, body: {} };
      }
      return { status: 201, body: { somethingElse: 1 } };
    });
    const draft = new DraftPipeline(client, 'GoodsReceipt', 'GoodsReceiptUUID');
    await expect(draft.createHeader({})).rejects.toThrow(/GoodsReceiptUUID/);
  });
});

describe('SapODataClient auth', () => {
  it('uses basicAuth helper config', async () => {
    const { client, transport } = makeSapClient(() => ({ body: { value: [] } }), {
      auth: basicAuth('user', 'pw'),
    });
    await client.entitySet('Orders').list();
    expect(transport.calls[0].headers.get('Authorization')).toBe(`Basic ${btoa('user:pw')}`);
  });
});
