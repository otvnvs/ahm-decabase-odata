import { describe, it, expect } from 'vitest';
import { ODataClient } from '../src/core/client.js';
import { v2Adapter } from '../src/adapters/v2.js';
import { MockTransport, pathOf } from './helpers/mockTransport.js';

function makeV2Client(responder, config = {}) {
  const transport = new MockTransport(responder);
  return { transport, client: new ODataClient({ baseUrl: 'https://host', version: 'v2', transport, ...config }) };
}

describe('v2 adapter parsing', () => {
  it('parses collection from d.results with __count and __next', () => {
    const result = v2Adapter.parseCollection({
      d: { results: [{ id: 1 }, { id: 2 }], __count: '2', __next: 'next-link' },
    });
    expect(result.value).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.nextLink).toBe('next-link');
  });

  it('parses single from d', () => {
    expect(v2Adapter.parseSingle({ d: { id: 5 } })).toEqual({ id: 5 });
  });

  it('handles empty/null bodies', () => {
    expect(v2Adapter.parseCollection(null)).toEqual({ value: [], count: null, nextLink: null });
    expect(v2Adapter.parseSingle(null)).toBeNull();
  });

  it('exposes $format=json as default param', () => {
    expect(v2Adapter.defaultParams).toEqual({ $format: 'json' });
  });
});

describe('v2 client integration', () => {
  it('injects $format=json into requests by default', async () => {
    const { client, transport } = makeV2Client(() => ({ body: { d: { results: [] } } }));
    await client.entitySet('Orders').list();
    expect(pathOf(transport.calls[0].url)).toContain('$format=json');
  });

  it('parses v2 collection response through the client', async () => {
    const { client } = makeV2Client(() => ({
      body: { d: { results: [{ id: 1 }, { id: 2 }], __count: '2' } },
    }));
    const result = await client.entitySet('Orders').list();
    expect(result.value).toHaveLength(2);
    expect(result.count).toBe(2);
  });

  it('parses v2 single response through the client', async () => {
    const { client } = makeV2Client(() => ({ body: { d: { id: 9, name: 'x' } } }));
    const order = await client.entitySet('Orders').get(9);
    expect(order.id).toBe(9);
  });

  it('uses v2 filter functions via FilterBuilder', async () => {
    const { client, transport } = makeV2Client(() => ({ body: { d: { results: [] } } }));
    await client.entitySet('Orders').filter(b => b.contains('Name', 'abc')).list();
    expect(pathOf(transport.calls[0].url)).toContain("substringof('abc',Name)");
  });

  it('parses v2-style error message.value', async () => {
    const { client } = makeV2Client(() => ({
      status: 400,
      body: { error: { message: { value: 'v2 validation failed' } } },
    }));
    await expect(client.entitySet('Orders').list()).rejects.toMatchObject({
      name: 'ODataError',
      message: 'v2 validation failed',
      status: 400,
    });
  });
});
