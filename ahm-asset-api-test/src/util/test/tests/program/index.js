export default async function runSuite(runner) {

await runner.describe('Application Program Runtime Context Module', async (expect) => {
  expect.log("Booting diagnostic thread validation for running program context...");
  
  const response = await fetch('/api/program/info', { method: 'GET' });
  expect.equal(response.status, 200, 'GET /api/program/info returns operational 200 status');

  const payload = await response.json();
  
  // Verify structural integrity of data models
  expect.equal(typeof payload.process, 'object', 'Payload contains a verified process tracking map');
  expect.equal(typeof payload.jvm_memory, 'object', 'Payload contains underlying Java heap memory bounds');
  expect.equal(typeof payload.threading, 'object', 'Payload resolves active concurrent threading telemetry');
  expect.equal(typeof payload.timeline, 'object', 'Payload captures up-time continuous execution timelines');
  expect.equal(typeof payload.package, 'object', 'Payload matches application package manifest signatures');

  // --- Process Identity Mapping Logs ---
  expect.log("--- NATIVE CONTAINER PROCESS PROPERTIES ---");
  expect.log(`  Process ID (PID): ${payload.process.pid}`);
  expect.log(`  User ID (UID): ${payload.process.uid}`);
  expect.log(`  Enforced 64-Bit Mode: ${payload.process.is_64bit}`);

  // --- JVM Virtual Machine Heap Resource Breakdown ---
  expect.log("--- JVM INTERNAL HEAP ALLOCATION MATRIX ---");
  expect.log(`  Free Heap Bytes: ${payload.jvm_memory.free_heap_bytes} bytes`);
  expect.log(`  Total Heap Bytes: ${payload.jvm_memory.total_heap_bytes} bytes`);
  expect.log(`  Max Heap Bytes: ${payload.jvm_memory.max_heap_bytes} bytes`);
  
  const heapMaxMB = (payload.jvm_memory.max_heap_bytes / (1024 ** 2)).toFixed(2);
  const heapTotalMB = (payload.jvm_memory.total_heap_bytes / (1024 ** 2)).toFixed(2);
  const heapFreeMB = (payload.jvm_memory.free_heap_bytes / (1024 ** 2)).toFixed(2);
  expect.log(`  Summary: Free Headroom ${heapFreeMB} MB out of ${heapTotalMB} MB current (${heapMaxMB} MB hard cap)`);

  // --- Concurrency Load Metrics ---
  expect.log("--- RUNTIME CONCURRENCY POOLS ---");
  expect.log(`  Active Thread Count: ${payload.threading.active_thread_count}`);
  
  const threadsAreValid = payload.threading.active_thread_count > 0;
  expect.equal(threadsAreValid, true, 'Active thread count is positive and reporting live loops');

  // --- Container Duration Profiling ---
  expect.log("--- INSTANCE LIFESPAN LOGS ---");
  expect.log(`  Raw App Uptime: ${payload.timeline.app_uptime_ms} ms`);
  const uptimeMinutes = (payload.timeline.app_uptime_ms / 60000).toFixed(2);
  expect.log(`  Calculated Run Duration: ${uptimeMinutes} minutes`);

  // --- Manifest and Application Meta Checks ---
  expect.log("--- APPLICATION METADATA SIGNATURES ---");
  expect.log(`  Package Binder State: ${payload.package.status}`);
  expect.log(`  Unique Package Identifier: ${payload.package.package_name}`);
  expect.log(`  Build Profile Version String: ${payload.package.version_name}`);
  expect.log(`  Target Android API Directive: SDK ${payload.package.target_sdk}`);
  expect.log(`  Internal Version Build Code: ${payload.package.version_code}`);
  expect.log(`  Raw First Install Epoch: ${payload.package.first_install_time} ms`);
  
  const installDate = new Date(payload.package.first_install_time);
  expect.log(`  Initial Device Installation ISO Date: ${installDate.toISOString()}`);

  expect.equal(payload.package.status, 'success', 'Package manifest block reports flawless retrieval validation');
});


}
