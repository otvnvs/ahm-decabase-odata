export default async function runSuite(runner) {
  await runner.describe('Native JVM WebSocket Lifecycle Module', async (expect) => {
    expect.log("Opening new lifecycle verification socket connection stream...");

    const ws = new WebSocket("ws://virtual-local-bridge/api/ws/testing-suite");
    let openEventPayloadReceived = null;
    
    const lifecycleChallenge = new Promise((resolve, reject) => {
      const dropTimer = setTimeout(() => {
        ws.close();
        reject(new Error("Lifecycle hook evaluation timed out waiting for welcome event frame."));
      }, 4000);

      ws.onopen = () => {
        expect.log("Frontend socket client state transitioned to OPEN.");
        // We do NOT send a message manually here. 
        // We expect Java's @WebSocketOnOpen interceptor to push a payload automatically.
      };

      ws.onmessage = (event) => {
        expect.log(`[CLIENT RECV] Raw lifecycle frame text: ${event.data}`);
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.status === 'connected') {
            openEventPayloadReceived = payload;
            clearTimeout(dropTimer);
            
            // Cleanly close the socket. This will trigger Java's @WebSocketOnClose hook.
            expect.log("Closing connection sequence to trigger native disconnect logic checks...");
            ws.close();
            resolve(openEventPayloadReceived);
          }
        } catch (err) {
          clearTimeout(dropTimer);
          ws.close();
          reject(err);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(dropTimer);
        reject(err);
      };
    });

    try {
      const connectionMetadata = await lifecycleChallenge;
      
      // Run validations proving Java executed the automated connect routing sequence
      expect.equal(connectionMetadata.status, 'connected', 'Lifecycle response state reflects active connection allocation signatures');
      expect.equal(connectionMetadata.message, 'Welcome from Native Android JVM Lifecycle Handler', 'Direct confirmation string matches explicit Java-side payload output parameters');
      
      expect.log(`Lifecycle challenge completed smoothly. Verified native session identifier: ${connectionMetadata.assigned_id}`);
    } catch (error) {
      expect.equal(true, false, `WebSocket Lifecycle framework validation collapsed context error: ${error.message}`);
    }
  });
}

