const mockFs = new Set(['manifest.json']);
let mockConfig = { autoUpdate: "false", interval: "1800", url: "" };

// Helper to assemble standardized JSON response structures
const jsonResponse = (data, status = 200, headers = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
};

// ---------------------------------------------------------------------------
// In-memory OData v4 mock for the /api/net/request broker.
// Simulates a WorkflowItems entity set so the decabase_odata test suite can
// exercise BrokerTransport + ODataClient on desktop without a real backend.
// On Android this is bypassed — the native Java broker forwards to a live
// OData service.
// ---------------------------------------------------------------------------

// SAP S/4HANA OData v4 service mock (zgr_ui_poscan_o4).
// On Android the Java broker forwards to the real service; on desktop the
// service worker returns this mock so the same test code runs in both.
const SAP_SERVICE_ROOT = '/sap/opu/odata4/sap/zgr_ui_poscan_o4/srvd_a2x/sap/zgr_ui_poscan_o4/0001';

const SAP_MOCK_DATA = [
  { ID: 1, Description: 'Purchase Order 4500000001', Status: 'Open', Supplier: 'Acme Corp' },
  { ID: 2, Description: 'Purchase Order 4500000002', Status: 'Closed', Supplier: 'Globex Inc' },
  { ID: 3, Description: 'Purchase Order 4500000003', Status: 'Pending', Supplier: 'Initech' },
  { ID: 4, Description: 'Purchase Order 4500000004', Status: 'Open', Supplier: 'Umbrella Corp' },
  { ID: 5, Description: 'Purchase Order 4500000005', Status: 'Closed', Supplier: 'Wayne Enterprises' },
];

const MOCK_SAP_METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="ZGR_UI_POSCAN_O4">
      <EntityType Name="PurchaseOrder">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Description" Type="Edm.String"/>
        <Property Name="Status" Type="Edm.String"/>
        <Property Name="Supplier" Type="Edm.String"/>
      </EntityType>
      <EntityContainer Name="ZGR_UI_POSCAN_O4">
        <EntitySet Name="PurchaseOrder" EntityType="ZGR_UI_POSCAN_O4.PurchaseOrder"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
const WORKFLOW_SEED = [
  { ID: 1, Title: 'Approve purchase order 4500000001', Assignee: 'A. Mokoena', Status: 'Open', Priority: 'High', DueDate: '2026-07-19' },
  { ID: 2, Title: 'Review goods receipt for PO 4500000002', Assignee: 'J. Singh', Status: 'InProgress', Priority: 'Medium', DueDate: '2026-07-21' },
  { ID: 3, Title: 'Verify vendor master for Acme Corp', Assignee: 'L. Ferreira', Status: 'Pending', Priority: 'Low', DueDate: '2026-07-25' },
  { ID: 4, Title: 'Confirm stock transfer order 4500000003', Assignee: 'A. Mokoena', Status: 'Open', Priority: 'Medium', DueDate: '2026-07-20' },
  { ID: 5, Title: 'Reconcile invoice 5100000123', Assignee: 'R. Nakamura', Status: 'Done', Priority: 'High', DueDate: '2026-07-15' },
  { ID: 6, Title: 'Inspect damaged shipment GR-8842', Assignee: 'J. Singh', Status: 'Open', Priority: 'High', DueDate: '2026-07-18' },
];
let workflowData = WORKFLOW_SEED.map(r => ({ ...r }));
let workflowNextId = workflowData.length + 1;

function odataJsonResponse(status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { status, headers: { 'content-type': 'application/json', ...headers }, body: text };
}

function parseODataValue(raw) {
  raw = raw.trim();
  if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function unwrapOuterParens(expr) {
  expr = expr.trim();
  while (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0, wrapsWhole = false;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') { depth--; if (depth === 0) { wrapsWhole = (i === expr.length - 1); break; } }
    }
    if (wrapsWhole) expr = expr.slice(1, -1).trim(); else break;
  }
  return expr;
}

function splitTop(expr, sep) {
  const parts = []; let depth = 0, last = 0;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') depth--;
    else if (depth === 0 && expr.slice(i, i + sep.length) === sep) {
      parts.push(expr.slice(last, i).trim()); last = i + sep.length; i += sep.length - 1;
    }
  }
  parts.push(expr.slice(last).trim());
  return parts.length > 1 ? parts : [expr];
}

function evalFilter(expr, row) {
  expr = unwrapOuterParens(expr);
  const orParts = splitTop(expr, ' or ');
  if (orParts.length > 1) return orParts.some(p => evalFilter(p, row));
  const andParts = splitTop(expr, ' and ');
  if (andParts.length > 1) return andParts.every(p => evalFilter(p, row));
  const term = expr.trim();
  let m = term.match(/^contains\((\w+),'([^']*)'\)$/i);
  if (m) return String(row[m[1]] ?? '').toLowerCase().includes(m[2].toLowerCase());
  m = term.match(/^(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/);
  if (m) {
    const val = parseODataValue(m[3]); const fv = row[m[1]];
    switch (m[2]) {
      case 'eq': return fv == val;
      case 'ne': return fv != val;
      case 'gt': return fv > val;
      case 'ge': return fv >= val;
      case 'lt': return fv < val;
      case 'le': return fv <= val;
    }
  }
  return true;
}

function applyFilter(rows, filter) {
  if (!filter) return rows;
  return rows.filter(row => evalFilter(filter.replace(/\s+/g, ' ').trim(), row));
}

function applyOrderby(rows, orderby) {
  if (!orderby) return rows;
  const specs = orderby.split(',').map(s => s.trim().split(/\s+/));
  return [...rows].sort((a, b) => {
    for (const [field, dir] of specs) {
      const av = a[field], bv = b[field];
      if (av < bv) return dir === 'desc' ? 1 : -1;
      if (av > bv) return dir === 'desc' ? -1 : 1;
    }
    return 0;
  });
}

function applySelect(rows, select) {
  if (!select) return rows;
  const fields = select.split(',').map(s => s.trim());
  return rows.map(r => Object.fromEntries(fields.filter(f => f in r).map(f => [f, r[f]])));
}

function handleODataBroker(envelope) {
  const inner = envelope.request || {};
  const innerUrl = new URL(inner.url || '', 'http://odata-mock');
  const path = innerUrl.pathname.replace(/\/$/, '');
  const q = innerUrl.searchParams;
  const method = (inner.method || 'GET').toUpperCase();
  const innerBody = inner.body;

  // GET /WorkflowItems/$count
  if (path.endsWith('/$count') && method === 'GET') {
    const base = path.replace(/\/\$count$/, '');
    if (base.endsWith('/WorkflowItems')) {
      const rows = applyFilter(workflowData, q.get('$filter'));
      return odataJsonResponse(200, String(rows.length), { 'content-type': 'text/plain' });
    }
  }

  // GET /WorkflowItems
  if (path === '/WorkflowItems' && method === 'GET') {
    let rows = applyFilter(workflowData, q.get('$filter'));
    rows = applyOrderby(rows, q.get('$orderby'));
    const top = q.get('$top') ? Number(q.get('$top')) : null;
    const skip = q.get('$skip') ? Number(q.get('$skip')) : 0;
    const total = rows.length;
    if (skip) rows = rows.slice(skip);
    if (top !== null) rows = rows.slice(0, top);
    rows = applySelect(rows, q.get('$select'));
    const body = { value: rows };
    if (q.get('$count') === 'true') body['@odata.count'] = total;
    return odataJsonResponse(200, body);
  }

  // POST /WorkflowItems
  if (path === '/WorkflowItems' && method === 'POST') {
    const obj = typeof innerBody === 'string' ? JSON.parse(innerBody) : { ...innerBody };
    obj.ID = workflowNextId++;
    workflowData.push(obj);
    return odataJsonResponse(201, obj);
  }

  // /WorkflowItems(ID)...
  const byKey = path.match(/^\/WorkflowItems\((\d+)\)$/);
  if (byKey) {
    const row = workflowData.find(w => w.ID === Number(byKey[1]));
    if (method === 'GET') {
      return row ? odataJsonResponse(200, row) : odataJsonResponse(404, { error: { message: 'Not found' } });
    }
    if (method === 'PATCH') {
      if (!row) return odataJsonResponse(404, { error: { message: 'Not found' } });
      Object.assign(row, typeof innerBody === 'string' ? JSON.parse(innerBody) : innerBody);
      return odataJsonResponse(200, row);
    }
  }

  // POST /WorkflowItems(ID)/Submit  (bound action -> Status = Done)
  const submit = path.match(/^\/WorkflowItems\((\d+)\)\/Submit$/);
  if (submit && method === 'POST') {
    const row = workflowData.find(w => w.ID === Number(submit[1]));
    if (!row) return odataJsonResponse(404, { error: { message: 'Not found' } });
    row.Status = 'Done';
    return odataJsonResponse(200, row);
  }

  return odataJsonResponse(404, { error: { message: `No OData mock route for ${method} ${path}` } });
}

// Handle SAP OData v4 service URLs (zgr_ui_poscan_o4).
// Routes: service root (CSRF handshake), $metadata, entity set list/count/get.
function handleSapODataBroker(envelope, innerPath, innerUrl) {
  const inner = envelope.request || {};
  const q = innerUrl.searchParams;
  const method = (inner.method || 'GET').toUpperCase();
  const innerBody = inner.body;

  // Service root — SAP CSRF handshake returns x-csrf-token header
  if (innerPath === SAP_SERVICE_ROOT) {
    return odataJsonResponse(200, { value: [] }, { 'x-csrf-token': 'mock-csrf-token-abc123' });
  }

  // $metadata
  if (innerPath === SAP_SERVICE_ROOT + '/$metadata') {
    return { status: 200, headers: { 'content-type': 'application/xml' }, body: MOCK_SAP_METADATA };
  }

  // Entity set operations — path relative to service root
  const relative = innerPath.slice(SAP_SERVICE_ROOT.length + 1);

  // $count
  if (relative.endsWith('/$count') && method === 'GET') {
    const rows = applyFilter(SAP_MOCK_DATA, q.get('$filter'));
    return odataJsonResponse(200, String(rows.length), { 'content-type': 'text/plain' });
  }

  // Get by key: EntitySet(key) — handles numeric and string keys
  const byKey = relative.match(/^(\w+)\((.+)\)$/);
  if (byKey && method === 'GET' && !byKey[2].includes('/')) {
    const keyRaw = byKey[2].trim();
    let keyValue = keyRaw;
    if (keyRaw.startsWith("'")) keyValue = keyRaw.slice(1, -1).replace(/''/g, "'");
    else if (/^\d+$/.test(keyRaw)) keyValue = Number(keyRaw);
    const row = SAP_MOCK_DATA.find(r => String(r.ID) === String(keyValue));
    return row ? odataJsonResponse(200, row) : odataJsonResponse(404, { error: { message: 'Not found' } });
  }

  // List: EntitySet (simple name, no parens)
  if (/^\w+$/.test(relative) && method === 'GET') {
    let rows = applyFilter(SAP_MOCK_DATA, q.get('$filter'));
    rows = applyOrderby(rows, q.get('$orderby'));
    const top = q.get('$top') ? Number(q.get('$top')) : null;
    const skip = q.get('$skip') ? Number(q.get('$skip')) : 0;
    const total = rows.length;
    if (skip) rows = rows.slice(skip);
    if (top !== null) rows = rows.slice(0, top);
    rows = applySelect(rows, q.get('$select'));
    const body = { value: rows };
    if (q.get('$count') === 'true') body['@odata.count'] = total;
    return odataJsonResponse(200, body);
  }

  return odataJsonResponse(404, { error: { message: `No SAP mock route for ${method} ${innerPath}` } });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept all outgoing fetch operations seamlessly
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);



  // Filter requests matching your Android Native API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        // Realistic network latency delay
        await new Promise(r => setTimeout(r, 100));
        const path = url.pathname;
        const params = url.searchParams;

        // --- App Controller Mocks ---
        if (path === '/api/app/device-status') {
          return jsonResponse({ status: 'active', userAgent: 'Mock-Desktop-Browser' }, 200, {
            'X-Powered-By': 'Android Native Framework Interceptor'
          });
        }
        if (path === '/api/app/export-localstorage') {
          return jsonResponse({ status: 'success' });
        }
        if (path === '/api/app/import-localstorage') {
          return jsonResponse({ theme: 'dark', cachedToken: 'test_token_abc123' });
        }

        // --- FS Controller Mocks ---
        if (path === '/api/fs/mkdir' || path === '/api/fs/write') {
          const target = params.get('path');
          if (target) mockFs.add(target);
          return jsonResponse({ status: 'success' });
        }
        if (path === '/api/fs/read') {
          return new Response('{"active":true}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (path === '/api/fs/list') {
          return jsonResponse({ status: 'success', files: Array.from(mockFs) });
        }
        if (path === '/api/fs/zip' || path === '/api/fs/unzip') {
          return jsonResponse({ status: 'success', archiveSize: 4096 });
        }
        if (path === '/api/fs/delete') {
          const target = params.get('path');
          if (target) mockFs.delete(target);
          return jsonResponse({ status: 'success' });
        }

        // --- Maintenance Controller Mocks ---
        if (path === '/api/maintenance/config') {
          return jsonResponse(mockConfig);
        }
        if (path === '/api/maintenance/save') {
          mockConfig.autoUpdate = params.get('autoUpdate') || "false";
          mockConfig.interval = params.get('interval') || "0";
          mockConfig.url = params.get('url') || "";
          return jsonResponse({ status: 'success' });
        }
        if (path === '/api/maintenance/sync-sd') {
          return jsonResponse({ status: 'success' });
        }

        // --- Network Proxy Mocks ---
        if (path === '/api/net/proxy') {
          return jsonResponse({
            status: 200,
            body: JSON.stringify({ id: 1, info: "Mocked Upstream Redirect via Service Worker" })
          });
        }

        // /api/net/request — the broker used by BrokerTransport.
        // Parses the { timeout_ms, request: { url, method, headers, body } }
        // envelope and routes OData-shaped URLs through the in-memory mock.
        // Non-OData URLs fall through to the original passthrough behavior.
        if (path === '/api/net/request') {
          const envelope = await event.request.json();
          const inner = envelope.request || {};
          const innerUrl = new URL(inner.url || '', 'http://odata-mock');
          const innerPath = innerUrl.pathname.replace(/\/$/, '');

          // SAP OData v4 service mock (zgr_ui_poscan_o4)
          if (innerPath === SAP_SERVICE_ROOT || innerPath.startsWith(SAP_SERVICE_ROOT + '/')) {
            return jsonResponse(handleSapODataBroker(envelope, innerPath, innerUrl));
          }

          // WorkflowItems mock
          if (innerPath.startsWith('/WorkflowItems') || innerPath.includes('/WorkflowItems')) {
            const result = handleODataBroker(envelope);
            return jsonResponse(result);
          }
          // Passthrough echo for non-OData broker requests
          return jsonResponse({
            status: 200,
            headers: { 'content-type': 'text/plain' },
            body: `Broker mock passthrough for ${inner.method || 'GET'} ${inner.url || ''}`
          });
        }

	if (path === '/api/net/download') {
	  return jsonResponse({
	    status: "success",
	    message: "Resource downloaded successfully via native pipeline.",
	    local_path: params.get('path') || "Download/fallback.txt",
	    file_size_bytes: 1024
	  });
	}

        return new Response('Mock Path Not Found', { status: 404 });
      })()
    );
  }
});

