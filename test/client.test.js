import { describe, it, expect } from 'vitest';
import { ODataClient } from '../src/core/client.js';
import { ODataError } from '../src/core/error.js';
import { MockTransport, pathOf } from './helpers/mockTransport.js';

function makeClient(responder, config = {}) {
  const transport = new MockTransport(responder);
  return { transport, client: new ODataClient({ baseUrl: 'https://host', transport, ...config }) };
}

describe('ODataClient basics', () => {
  it('defaults to v4', () => {
    const { client } = makeClient(() => ({ body: { value: [] } }));
    expect(client.version).toBe('v4');
    expect(client.adapter.version).toBe('v4');
  });

  it('applies basic auth header (UTF-8 safe)', async () => {
    const { client, transport } = makeClient(() => ({ body: { value: [] } }), {
      auth: { type: 'basic', username: 'user', password: 'pass' },
    });
    await client.entitySet('Orders').list();
    const auth = transport.calls[0].headers.get('Authorization');
    expect(auth).toBe(`Basic ${btoa('user:pass')}`);
  });

  it('applies bearer auth header', async () => {
    const { client, transport } = makeClient(() => ({ body: { value: [] } }), {
      auth: { type: 'bearer', token: 'tok' },
    });
    await client.entitySet('Orders').list();
    expect(transport.calls[0].headers.get('Authorization')).toBe('Bearer tok');
  });

  it('sets Accept and Content-Type defaults', async () => {
    const { client, transport } = makeClient(() => ({ body: {} }));
    await client.entitySet('Orders').create({ id: 1 });
    expect(transport.calls[0].headers.get('Accept')).toBe('application/json');
    expect(transport.calls[0].headers.get('Content-Type')).toBe('application/json');
  });

  it('uses XML Accept for $metadata', async () => {
    const { client, transport } = makeClient(() => ({ body: '<Edmx/>' }));
    await client.fetchMetadata();
    expect(transport.calls[0].headers.get('Accept')).toBe('application/xml, text/xml, */*');
  });
});

describe('entitySet read operations', () => {
  it('list builds URL and parses v4 collection', async () => {
    const { client, transport } = makeClient(() => ({
      body: { value: [{ id: 1 }, { id: 2 }], '@odata.count': 2 },
    }));
    const result = await client.entitySet('Orders')
      .select('id')
      .filter(b => b.eq('status', 'OPEN'))
      .expand('Items')
      .top(10)
      .list();

    expect(pathOf(transport.calls[0].url)).toBe(
      "Orders?$select=id&$filter=status%20eq%20'OPEN'&$expand=Items&$top=10"
    );
    expect(result.value).toHaveLength(2);
    expect(result.count).toBe(2);
  });

  it('get by single key', async () => {
    const { client, transport } = makeClient(() => ({ body: { id: 5, name: 'x' } }));
    const order = await client.entitySet('Orders').get(5);
    expect(pathOf(transport.calls[0].url)).toBe('Orders(5)');
    expect(order.id).toBe(5);
  });

  it('get by composite key', async () => {
    const { client, transport } = makeClient(() => ({ body: {} }));
    await client.entitySet('Items').get({ A: 1, B: 'x' });
    expect(pathOf(transport.calls[0].url)).toBe("Items(A=1,B='x')");
  });

  it('first returns null when empty', async () => {
    const { client } = makeClient(() => ({ body: { value: [] } }));
    expect(await client.entitySet('Orders').first()).toBeNull();
  });

  it('count returns raw integer', async () => {
    const { client, transport } = makeClient(() => ({ body: '42' }));
    const n = await client.entitySet('Orders').filter(b => b.eq('status', 'OPEN')).count();
    expect(pathOf(transport.calls[0].url)).toBe("Orders/$count?$filter=status%20eq%20'OPEN'");
    expect(n).toBe(42);
  });
});

describe('entitySet write operations', () => {
  it('create POSTs and returns parsed single', async () => {
    const { client, transport } = makeClient(() => ({ body: { id: 9 } }));
    const created = await client.entitySet('Orders').create({ name: 'new' });
    expect(pathOf(transport.calls[0].url)).toBe('Orders');
    expect(transport.calls[0].method).toBe('POST');
    expect(transport.calls[0].body).toBe(JSON.stringify({ name: 'new' }));
    expect(created.id).toBe(9);
  });

  it('patch sends PATCH with body and custom headers', async () => {
    const { client, transport } = makeClient(() => ({ body: '' }));
    await client.entitySet('Orders').patch(9, { name: 'x' }, { headers: { 'If-Match': '*' } });
    expect(pathOf(transport.calls[0].url)).toBe('Orders(9)');
    expect(transport.calls[0].method).toBe('PATCH');
    expect(transport.calls[0].body).toBe(JSON.stringify({ name: 'x' }));
    expect(transport.calls[0].headers.get('If-Match')).toBe('*');
  });

  it('update sends PUT', async () => {
    const { client, transport } = makeClient(() => ({ body: '' }));
    await client.entitySet('Orders').update(9, { name: 'x' });
    expect(transport.calls[0].method).toBe('PUT');
    expect(pathOf(transport.calls[0].url)).toBe('Orders(9)');
  });

  it('delete sends DELETE', async () => {
    const { client, transport } = makeClient(() => ({ body: '' }));
    await client.entitySet('Orders').delete(9);
    expect(transport.calls[0].method).toBe('DELETE');
    expect(pathOf(transport.calls[0].url)).toBe('Orders(9)');
  });
});

describe('navigation and bound operations', () => {
  it('nav returns a bound entity set', async () => {
    const { client, transport } = makeClient(() => ({ body: { value: [] } }));
    await client.entitySet('GoodsReceipt').nav({ Uuid: 'abc', IsActiveEntity: false }, 'Item').list();
    expect(pathOf(transport.calls[0].url)).toBe(
      "GoodsReceipt(Uuid='abc',IsActiveEntity=false)/Item"
    );
  });

  it('nav then create POSTs to navigation path', async () => {
    const { client, transport } = makeClient(() => ({ body: {} }));
    await client.entitySet('GoodsReceipt').nav('abc', 'Item').create({ qty: 1 });
    expect(pathOf(transport.calls[0].url)).toBe("GoodsReceipt('abc')/Item");
    expect(transport.calls[0].method).toBe('POST');
  });

  it('callAction builds bound action path', async () => {
    const { client, transport } = makeClient(() => ({ body: { IsActiveEntity: true } }));
    const res = await client.entitySet('GoodsReceipt')
      .callAction({ Uuid: 'abc', IsActiveEntity: false }, 'com.sap.v0001.Activate', {});
    expect(pathOf(transport.calls[0].url)).toBe(
      "GoodsReceipt(Uuid='abc',IsActiveEntity=false)/com.sap.v0001.Activate"
    );
    expect(transport.calls[0].method).toBe('POST');
    expect(res.IsActiveEntity).toBe(true);
  });

  it('unboundAction calls service-root action', async () => {
    const { client, transport } = makeClient(() => ({ body: {} }));
    await client.unboundAction('DoThing', { arg: 1 });
    expect(pathOf(transport.calls[0].url)).toBe('DoThing');
    expect(transport.calls[0].method).toBe('POST');
  });
});

describe('error handling', () => {
  it('throws ODataError with parsed message on non-2xx', async () => {
    const { client } = makeClient(() => ({
      status: 400,
      body: { error: { code: 'E001', message: 'Bad input' } },
    }));
    await expect(client.entitySet('Orders').list()).rejects.toMatchObject({
      name: 'ODataError',
      status: 400,
      message: 'Bad input',
    });
  });

  it('parses v2-style error message.value', async () => {
    const { client } = makeClient(() => ({
      status: 500,
      body: { error: { message: { value: 'v2 boom' } } },
    }));
    await expect(client.entitySet('Orders').list()).rejects.toMatchObject({
      message: 'v2 boom',
      status: 500,
    });
  });

  it('ODataError exposes endpoint and body', async () => {
    const { client } = makeClient(() => ({ status: 403, body: 'Forbidden' }));
    try {
      await client.entitySet('Orders').list();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ODataError);
      expect(err.status).toBe(403);
      expect(err.endpoint).toContain('Orders');
    }
  });
});
