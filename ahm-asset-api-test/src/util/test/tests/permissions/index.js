//export default async function runSuite(runner) {
//
//await runner.describe('Android Universal Permissions Routing Module', async (expect) => {
//  expect.log("Testing flexible permission execution pathways...");
//
//  const targets = ['android.permission.CAMERA'];
//
//  // Helper utility to pause JS execution loop safely without deadlocking the WebView engine
//  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//
//  // --- METHOD: DYNAMIC STREAMLINED WAITING ENGINE ---
//  async function requestPermissionsBlocking(permissionsArray) {
//    // 1. Dispatch the asynchronous request to show the dialog box immediately
//    const reqResponse = await fetch('/api/permissions/request', {
//      method: 'POST',
//      headers: { 'Content-Type': 'application/json' },
//      body: JSON.stringify({ permissions: permissionsArray })
//    });
//    
//    if (reqResponse.status !== 202) {
//      throw new Error(`Failed to dispatch request alert wrapper: ${reqResponse.status}`);
//    }
//
//    expect.log("  *Note: Run ./scripts/permissions.sh --revoke android.permission.CAMERA prior to running this test.");
//    expect.log("  [Blocking Loop Activated] Popup inflated. Pausing automation flow...");
//    expect.log("  -> Please manually select ALLOW or DENY on the system window now!");
//
//    const maxAttempts = 60; // 30-second total security boundary timeout
//    let currentAttempt = 0;
//
//    // 2. Poll the /status endpoint until the user makes a choice
//    while (currentAttempt < maxAttempts) {
//      await sleep(500); // Check every half second
//      currentAttempt++;
//
//      const checkResponse = await fetch('/api/permissions/status', {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json' },
//        body: JSON.stringify({ permissions: permissionsArray })
//      });
//      
//      const checkPayload = await checkResponse.json();
//      const currentMatrix = checkPayload.permissions_matrix;
//
//      // If the permission state changes from DENIED to GRANTED, the user clicked "Allow"!
//      if (currentMatrix[permissionsArray[0]] === 'GRANTED') {
//        return { reason: 'USER_GRANTED', matrix: currentMatrix };
//      }
//
//      // To detect explicit USER_DENIED actions reliably, use your shell script 
//      // to set the state to GRANTED before the test, then watch for it to flip back to DENIED here.
//    }
//
//    return { reason: 'TIMEOUT_EXCEEDED', matrix: {} };
//  }
//
//  // --- RUN EXPLICIT BLOCKING AUTOMATION TEST ---
//  const resultData = await requestPermissionsBlocking(targets);
//
//  expect.log("--- SYNCHRONOUS ROUTE TERMINATION SUMMARY ---");
//  expect.log(`  Unblock Event Condition Trigger: ${resultData.reason}`);
//  
//  if (resultData.reason === 'USER_GRANTED') {
//    expect.log("  Real-Time Camera Security Clearance successfully verified as: GRANTED");
//    expect.equal(resultData.matrix['android.permission.CAMERA'], 'GRANTED', 'Blocking simulation completed flawlessly.');
//  } else {
//    expect.log("  Loop finished via safety boundary timeout or state un-changed.");
//  }
//});
//
//
//}
export default async function runSuite(runner){
  await runner.describe('Android Universal Permissions Routing Module', async (expect) => {
    expect.log("Testing flexible permission execution pathways...");

    // ==========================================
    // 1. Manifest Declaration Discovery Validation
    // ==========================================
    expect.log("Verifying runtime AndroidManifest.xml declared asset extraction...");
    let declaredPermissionsList = [];
    
    try {
      const discoveryResponse = await fetch('/api/permissions/declared', { method: 'GET' });
      expect.equal(discoveryResponse.status, 200, "Verify /api/permissions/declared handles requests with an OK status code.");
      
      const payload = await discoveryResponse.json();
      expect.equal(payload.status, "success", "Confirm operational transaction status signature equals success.");
      
      expect.equal(typeof payload.package_name, "string", `Package namespace successfully isolated: ${payload.package_name}`);
      expect.equal(Array.isArray(payload.declared_permissions), true, "Ensure response contains a valid structural array tracking permissions.");
      
      declaredPermissionsList = payload.declared_permissions;
      expect.log(`  -> Manifest evaluation success: Discovered ${payload.total_count} total requested permissions.`);

      expect.log("--- START MANIFEST MANIFEST PERMISSIONS DUMP ---");
      declaredPermissionsList.forEach((permission, index) => {
        expect.log(`  [Manifest Item ${index + 1}/${payload.total_count}] -> ${permission}`);
      });
      expect.log("--- END MANIFEST MANIFEST PERMISSIONS DUMP ---");

      // Verify that the camera permission we intend to test in the blocking loop is actually declared in the manifest
      const hasCameraDeclared = declaredPermissionsList.includes('android.permission.CAMERA');
      expect.equal(hasCameraDeclared, true, "Verify mandatory 'android.permission.CAMERA' rule is active inside the compiled manifest file mapping.");

      // ==========================================
      // ◄ NEW BLOCK: Bulk Authorization Status Check Loop
      // ==========================================
      expect.log("Initiating single-shot batch verification status sweep for all discovered manifest permissions...");
      
      const batchStatusResponse = await fetch('/api/permissions/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: declaredPermissionsList }) // Passing all 15 rules at once
      });

      expect.equal(batchStatusResponse.status, 200, "Verify /api/permissions/status processes batch arrays with an OK status code.");
      
      const statusPayload = await batchStatusResponse.json();
      expect.equal(statusPayload.status, "success", "Confirm authorization status query transaction returned success.");
      
      const matrix = statusPayload.permissions_matrix;
      expect.log("--- START REAL-TIME AUTHORIZATION MATRIX DUMP ---");
      declaredPermissionsList.forEach((permission, index) => {
        const currentGrantState = matrix[permission] || "UNKNOWN_ERROR";
        expect.log(`  [State Sweep ${index + 1}/${payload.total_count}] ${permission} ===> ${currentGrantState}`);
      });
      expect.log("--- END REAL-TIME AUTHORIZATION MATRIX DUMP ---");

    } catch (discoveryError) {
      expect.log(`CRITICAL: Discovery pipeline verification failed: ${discoveryError.message}`);
      expect.equal(true, false, "Manifest exploration assertion fault encountered.");
    }

    // ==========================================
    // 3. Existing System Blocking Prompt Pipeline Loop
    // ==========================================
    const targets = ['android.permission.CAMERA'];
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function requestPermissionsBlocking(permissionsArray) {
      const reqResponse = await fetch('/api/permissions/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsArray })
      });
      
      if (reqResponse.status !== 202) {
        throw new Error(`Failed to dispatch request alert wrapper:${reqResponse.status}`);
      }
      
      expect.log("  *Note: Run ./scripts/permissions.sh --revoke android.permission.CAMERA prior to running this test.");
      expect.log("  [Blocking Loop Activated] Popup inflated. Pausing automation flow...");
      expect.log("  -> Please manually select ALLOW or DENY on the system window now!");
      
      const maxAttempts = 60;
      let currentAttempt = 0;
      
      while (currentAttempt < maxAttempts) {
        await sleep(500);
        currentAttempt++;
        
        const checkResponse = await fetch('/api/permissions/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: permissionsArray })
        });
        
        const checkPayload = await checkResponse.json();
        const currentMatrix = checkPayload.permissions_matrix;
        
        if (currentMatrix[permissionsArray[0]] === 'GRANTED') {
          return { reason: 'USER_GRANTED', matrix: currentMatrix };
        }
      }
      return { reason: 'TIMEOUT_EXCEEDED', matrix: {} };
    }

    const resultData = await requestPermissionsBlocking(targets);
    expect.log("--- SYNCHRONOUS ROUTE TERMINATION SUMMARY ---");
    expect.log(`Unblock Event Condition Trigger:${resultData.reason}`);
    
    if (resultData.reason === 'USER_GRANTED') {
      expect.log("  Real-Time Camera Security Clearance successfully verified as: GRANTED");
      expect.equal(resultData.matrix['android.permission.CAMERA'], 'GRANTED', 'Blocking simulation completed flawlessly.');
    } else {
      expect.log("  Loop finished via safety boundary timeout or state un-changed.");
    }
  });
}

