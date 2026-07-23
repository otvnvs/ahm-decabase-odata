export default async function runSuite(runner) {
	await runner.describe('Android WebView Core Configuration Inspection Module', async (expect) => {
	  expect.log("Initiating live application Chromium WebView layout analysis...");

	  const response = await fetch('/api/webview/diagnostics', { method: 'GET' });
	  expect.equal(response.status, 200, 'GET /api/webview/diagnostics returns operational 200 status');

	  const payload = await response.json();

	  // Validate structural integrity of response schemas
	  expect.equal(typeof payload.security_policy, 'object', 'Payload contains manifest security metrics');
	  expect.equal(typeof payload.cookie_engine, 'object', 'Payload contains session cookie configurations');
	  expect.equal(typeof payload.configurations, 'object', 'Payload contains active WebSettings profiles');
	  expect.equal(typeof payload.storage_allocation, 'object', 'Payload contains physical cache directory space maps');

	  // --- Network Traffic & SDK Security Policy Logs ---
	  expect.log("--- SECURITY COMPLIANCE POLICIES ---");
	  expect.log(`  Target SDK Directive: API Level ${payload.security_policy.target_sdk_compliance}`);
	  expect.log(`  Cleartext Traffic Allowed (HTTP?): ${payload.security_policy.uses_cleartext_traffic_allowed}`);

	  // --- Session Cookie Parameter Logs ---
	  expect.log("--- NATIVE COOKIE ENGINE STATUS ---");
	  expect.log(`  Accepting Incoming Third-Party Cookies: ${payload.cookie_engine.accept_cookies_enabled}`);
	  expect.log(`  Persistent Saved Cookies On Disk: ${payload.cookie_engine.has_cookies_stored}`);

	  // --- Core WebSettings Layout Property Logs ---
	  expect.log("--- ACTIVE WEBSETTINGS PARAMETERS ---");
	  expect.log(`  JavaScript Interface Execution Active: ${payload.configurations.javascript_enabled}`);
	  expect.log(`  DOM HTML5 LocalStorage Active: ${payload.configurations.dom_storage_enabled}`);
	  expect.log(`  Local File System Access Hook Allowed: ${payload.configurations.file_access_enabled}`);
	  expect.log(`  Rendering Pipeline Mixed Content Mode: ${payload.configurations.mixed_content_mode} (0=ALLOW, 1=NEVER, 2=COMPAT)`);
	  expect.log(`  Current Strategy Cache Mode Profile: ${payload.configurations.active_cache_mode}`);

	  // --- Physical Cache Disk Allocation Metrics ---
	  expect.log("--- PHYSICAL PERSISTENCE CACHE METRICS ---");
	  expect.log(`  Isolated Sandbox Workspace Path: ${payload.storage_allocation.webview_cache_directory_path}`);
	  
	  const cacheMB = (payload.storage_allocation.webview_cache_allocated_bytes / (1024 ** 2)).toFixed(2);
	  expect.log(`  WebView Cache Sector Allocation Size: ${cacheMB} MB`);

	  // Basic type assertions
	  expect.equal(typeof payload.security_policy.uses_cleartext_traffic_allowed, 'boolean', 'Security flags verified as boolean');
	  expect.equal(typeof payload.configurations.dom_storage_enabled, 'boolean', 'WebSettings flags verified as boolean');
	});
}
