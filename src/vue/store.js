// Vue 3 reactive store for OData client configuration + cache.
// Framework-coupled counterpart to the core ODataClient. Holds config reactively
// (for UI binding), optional localStorage persistence, and an entity/metadata cache.
// Call createClient() to build an ODataClient snapshot from the current config.

import { reactive, watch, toRaw } from 'vue';
import { ODataClient } from '../core/client.js';

const DEFAULT_CONFIG = {
  baseUrl: '',
  version: 'v4',
  auth: null,
  timeoutMs: 30000,
  sapClient: '',
  useDummyData: false,
};

export function createODataStore(options = {}) {
  const {
    persist = false,
    storageKey = 'ahm_odata_store',
    clientClass = ODataClient,
    initial = {},
  } = options;

  const defaults = { ...DEFAULT_CONFIG, ...initial };
  const state = reactive({
    config: loadPersisted(persist, storageKey, defaults),
    cache: { metadataRawXml: '', entityLists: {} },
    status: { connected: false, lastError: null },
  });

  if (persist && typeof localStorage !== 'undefined') {
    watch(
      () => state.config,
      (cfg) => savePersisted(storageKey, cfg),
      { deep: true },
    );
  }

  /** Build an ODataClient (or subclass) snapshot from the current reactive config. */
  function createClient(transport) {
    const raw = toRaw(state.config);
    const cfg = {
      baseUrl: raw.baseUrl,
      version: raw.version,
      auth: raw.auth,
      timeoutMs: raw.timeoutMs,
    };
    if (raw.sapClient) cfg.sapClient = raw.sapClient;
    if (transport) cfg.transport = transport;
    return new clientClass(cfg);
  }

  return {
    state,
    config: state.config,
    cache: state.cache,
    status: state.status,
    createClient,
    updateConfig(partial) {
      Object.assign(state.config, partial);
    },
    setMetadataCache(rawXml) {
      state.cache.metadataRawXml = rawXml;
    },
    setEntityListCache(name, data) {
      state.cache.entityLists[name] = data;
    },
    clearEntityListCache(name) {
      delete state.cache.entityLists[name];
    },
    setStatus({ connected, lastError } = {}) {
      if (connected !== undefined) state.status.connected = connected;
      if (lastError !== undefined) state.status.lastError = lastError;
    },
    reset() {
      Object.assign(state.config, { ...DEFAULT_CONFIG, ...initial });
      state.cache.metadataRawXml = '';
      state.cache.entityLists = {};
      state.status.connected = false;
      state.status.lastError = null;
      if (persist && typeof localStorage !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    },
  };
}

function loadPersisted(persist, storageKey, defaults) {
  if (!persist || typeof localStorage === 'undefined') return { ...defaults };
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { ...defaults };
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return { ...defaults };
  }
}

function savePersisted(storageKey, cfg) {
  try {
    const raw = toRaw(cfg);
    // Never persist the raw auth secrets object directly if the caller marks it sensitive;
    // persistence of credentials is the caller's responsibility. We persist config as-is.
    localStorage.setItem(storageKey, JSON.stringify(raw));
  } catch {
    /* ignore quota / serialization errors */
  }
}
