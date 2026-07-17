// provide/inject composable for sharing an OData store across a Vue 3 app.

import { provide, inject } from 'vue';

const ODATA_STORE_KEY = Symbol('ahm-odata-store');

/** Provide an OData store (from createODataStore) to descendant components. */
export function provideOData(store) {
  provide(ODATA_STORE_KEY, store);
}

/** Inject the shared OData store. Returns undefined if none was provided. */
export function useOData() {
  return inject(ODATA_STORE_KEY);
}
