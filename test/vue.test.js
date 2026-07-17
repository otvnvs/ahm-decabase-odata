import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { createApp, h } from 'vue';
import { createODataStore, provideOData, useOData } from '../src/vue/index.js';
import { SapODataClient } from '../src/sap/client.js';
import { MockTransport, pathOf } from './helpers/mockTransport.js';

beforeEach(() => {
  localStorage.clear();
});

describe('createODataStore', () => {
  it('exposes reactive config, cache, and status', () => {
    const store = createODataStore();
    expect(store.config.baseUrl).toBe('');
    expect(store.cache.metadataRawXml).toBe('');
    expect(store.cache.entityLists).toEqual({});
    expect(store.status.connected).toBe(false);
  });

  it('updateConfig merges reactively', async () => {
    const store = createODataStore();
    store.updateConfig({ baseUrl: 'https://host', version: 'v2' });
    await nextTick();
    expect(store.config.baseUrl).toBe('https://host');
    expect(store.config.version).toBe('v2');
  });

  it('createClient builds a working ODataClient from config', async () => {
    const store = createODataStore({ initial: { baseUrl: 'https://host' } });
    const transport = new MockTransport(() => ({ body: { value: [{ id: 1 }] } }));
    const client = store.createClient(transport);
    const result = await client.entitySet('Orders').list();
    expect(result.value).toHaveLength(1);
    expect(pathOf(transport.calls[0].url)).toBe('Orders');
  });

  it('createClient can build a SapODataClient via clientClass option', async () => {
    const store = createODataStore({
      initial: { baseUrl: 'https://host/srv', sapClient: '100' },
      clientClass: SapODataClient,
    });
    const transport = new MockTransport((req) => {
      if (req.method === 'GET' && req.headers.get('X-CSRF-Token') === 'Fetch') {
        return { status: 200, headers: { 'x-csrf-token': 'T' }, body: {} };
      }
      return { status: 200, body: {} };
    });
    const client = store.createClient(transport);
    expect(client).toBeInstanceOf(SapODataClient);
    await client.entitySet('Orders').create({ id: 1 });
    const post = transport.calls.find(c => c.method === 'POST');
    expect(pathOf(post.url)).toContain('sap-client=100');
    expect(pathOf(post.url)).toContain('$format=json');
  });
});

describe('store cache + status helpers', () => {
  it('sets and clears metadata + entity list caches', () => {
    const store = createODataStore();
    store.setMetadataCache('<Edmx/>');
    expect(store.cache.metadataRawXml).toBe('<Edmx/>');

    store.setEntityListCache('Orders', [{ id: 1 }]);
    expect(store.cache.entityLists.Orders).toHaveLength(1);

    store.clearEntityListCache('Orders');
    expect(store.cache.entityLists.Orders).toBeUndefined();
  });

  it('setStatus updates connection + error', () => {
    const store = createODataStore();
    store.setStatus({ connected: true, lastError: null });
    expect(store.status.connected).toBe(true);
    store.setStatus({ lastError: 'boom' });
    expect(store.status.lastError).toBe('boom');
  });

  it('reset restores defaults and clears cache', () => {
    const store = createODataStore({ initial: { baseUrl: 'https://host' } });
    store.updateConfig({ baseUrl: 'https://other' });
    store.setEntityListCache('Orders', [{ id: 1 }]);
    store.setStatus({ connected: true, lastError: 'x' });

    store.reset();
    expect(store.config.baseUrl).toBe('https://host');
    expect(store.cache.entityLists).toEqual({});
    expect(store.status.connected).toBe(false);
    expect(store.status.lastError).toBe(null);
  });
});

describe('store persistence', () => {
  it('persists config to localStorage and reloads it', async () => {
    const key = 'test_store';
    const store = createODataStore({ persist: true, storageKey: key, initial: { baseUrl: 'https://host' } });
    store.updateConfig({ baseUrl: 'https://persisted' });
    await nextTick();

    const saved = JSON.parse(localStorage.getItem(key));
    expect(saved.baseUrl).toBe('https://persisted');

    const store2 = createODataStore({ persist: true, storageKey: key });
    expect(store2.config.baseUrl).toBe('https://persisted');
  });

  it('reset removes persisted storage', async () => {
    const key = 'test_store_reset';
    const store = createODataStore({ persist: true, storageKey: key });
    store.updateConfig({ baseUrl: 'https://x' });
    await nextTick();
    expect(localStorage.getItem(key)).not.toBeNull();

    store.reset();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('does not persist when persist is false', async () => {
    const key = 'test_nopersist';
    const store = createODataStore({ persist: false, storageKey: key });
    store.updateConfig({ baseUrl: 'https://x' });
    await nextTick();
    expect(localStorage.getItem(key)).toBeNull();
  });
});

describe('provide / inject', () => {
  it('shares a store through provideOData / useOData', () => {
    const store = createODataStore({ initial: { baseUrl: 'https://shared' } });
    let injected;

    const Child = {
      setup() {
        injected = useOData();
        return () => h('div');
      },
    };

    const Root = {
      setup() {
        provideOData(store);
        return () => h(Child);
      },
    };

    const app = createApp(Root);
    app.mount(document.createElement('div'));

    expect(injected).toBe(store);
    expect(injected.config.baseUrl).toBe('https://shared');
  });

  it('useOData returns undefined when nothing provided', () => {
    let injected = 'untouched';
    const Root = {
      setup() {
        injected = useOData();
        return () => h('div');
      },
    };
    const app = createApp(Root);
    app.mount(document.createElement('div'));
    expect(injected).toBeUndefined();
  });
});
