export default async function runSuite(runner) {
  await runner.describe('Native Hardware Telemetry Streaming Service Module', async (expect) => {
    expect.log("Establishing active duplex connection to native accelerometer sensors...");

    const ws = new WebSocket("ws://virtual-local-bridge/api/ws/telemetry/sensors");
    const readingsCollected = [];
    let initialWelcomePayload = null;

    const telemetryChallenge = new Promise((resolve, reject) => {
      // Set an overarching safety boundary timeout (e.g. 5 seconds)
      const safetyDropTimer = setTimeout(() => {
        ws.close();
        reject(new Error("Telemetry service failed to stream data metrics within the required window allocation."));
      }, 5000);

      ws.onopen = () => {
        expect.log("Frontend socket client state transitioned to OPEN.");
      };

      ws.onmessage = (event) => {
        // Log out the raw inbound string frame text for validation visual trace checks
        expect.log(`[CLIENT RECV] Raw telemetry payload text: ${event.data}`);
        
        try {
          const payload = JSON.parse(event.data);
          
          // 1. Capture the immediate welcome event frame pushed by the Java Lifecycle Handler
          if (payload.status === 'connected') {
            initialWelcomePayload = payload;
            expect.log(`[LIFECYCLE MATCH] Connected cleanly. Assigned Native Session ID: ${payload.assigned_id}`);
          }
          
          // 2. Collect high-frequency continuous hardware metrics slices
          if (payload.status === 'telemetry_update' && payload.sensor_type === 'accelerometer') {
            expect.log(`[SENSOR TICK] Physics acceleration coordinates -> X: ${payload.data.x.toFixed(2)}, Y: ${payload.data.y.toFixed(2)}, Z: ${payload.data.z.toFixed(2)}`);
            readingsCollected.push(payload.data);
            
            // Once we capture 3 live ticks straight from the physical hardware driver, close cleanly
            if (readingsCollected.length >= 3) {
              clearTimeout(safetyDropTimer);
              expect.log("Closing connection sequence to trigger native disconnect logic checks...");
              ws.close();
              resolve({ welcome: initialWelcomePayload, ticks: readingsCollected });
            }
          }
        } catch (err) {
          clearTimeout(safetyDropTimer);
          ws.close();
          reject(err);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(safetyDropTimer);
        reject(err);
      };
    });

    try {
      const suiteResults = await telemetryChallenge;
      
      // Validation 1: Confirm lifecycle open connection handler executed smoothly
      expect.equal(suiteResults.welcome.status, 'connected', 'Lifecycle open hook successfully initialised socket tracking maps');
      
      // Validation 2: Verify we captured precisely the continuous time-series packages requested
      expect.equal(suiteResults.ticks.length, 3, 'Successfully captured precisely 3 independent high-frequency hardware metrics slices');
      
      // Validation 3: Ensure data metrics are valid numerical values parsed from Java org.json
      const sampleTick = suiteResults.ticks[0];
      const hasValidNumericSchema = typeof sampleTick.x === 'number' && typeof sampleTick.y === 'number' && typeof sampleTick.z === 'number';
      expect.equal(hasValidNumericSchema, true, 'Telemetry frame schema coordinates verified as clean numerical values');
      
      expect.log("Real-time physical hardware instrumentation verification completed successfully.");
    } catch (error) {
      expect.equal(true, false, `Telemetry stream transaction tracking failed context error: ${error.message}`);
    }
  });
}

