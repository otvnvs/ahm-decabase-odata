// @otvnvs/ahm-decabase-odata — framework-agnostic OData v4/v2 client.
// Import SAP extensions from '@otvnvs/ahm-decabase-odata/sap'
// Import Vue bindings from '@otvnvs/ahm-decabase-odata/vue'

export { ODataClient, utf8ToBase64 } from './core/client.js';
export { EntitySet } from './core/entitySet.js';
export { ODataQuery } from './core/query.js';
export { FilterBuilder, resolveFilter } from './core/filter.js';
export { ODataError, parseODataError } from './core/error.js';
export { FetchTransport, BrokerTransport, toPlainHeaders } from './core/transport.js';
export {
  joinUrl,
  escapeString,
  formatLiteral,
  buildEntityPath,
  appendQueryParams,
  encodeODataValue,
} from './core/url.js';
export { v4Adapter } from './adapters/v4.js';
export { v2Adapter } from './adapters/v2.js';
