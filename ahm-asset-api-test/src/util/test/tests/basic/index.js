export default async function runSuite(runner) {
  await runner.describe('Comprehensive Native HTTP Operations', async (expect) => {
    
    // =========================================================================
    // STEP 1: GET METHOD - Query Parameters and Response Header Extractions
    // =========================================================================
    expect.log('Initializing GET validation step targeting parameter queries...');
    const getUrl = `/api/example/get-test?tracking_id=probe_alpha_99&filter=active_records`;
    
    const getResponse = await fetch(getUrl, { method: 'GET' });
    expect.equal(getResponse.status, 200, 'GET endpoint resolved operational status 200');
    
    // Inspect custom header key-values returned from native Java response blocks
    const serverEngineHeader = getResponse.headers.get('X-Server-Response-Engine');
    const echoTrackingHeader = getResponse.headers.get('X-Echo-Tracking-ID');
    expect.equal(serverEngineHeader, 'Android-Native-JVM', 'Verified custom header value map alignment');
    expect.equal(echoTrackingHeader, 'probe_alpha_99', 'Verified dynamic header key parameters echo back');

    if (getResponse.ok) {
      const getData = await getResponse.json();
      expect.log(`GET Response data JSON decoded: ${JSON.stringify(getData)}`);
      expect.equal(getData.received_tracking_id, 'probe_alpha_99', 'Query param key 1 extracted cleanly');
      expect.equal(getData.received_filter, 'active_records', 'Query param key 2 extracted cleanly');
    }

    // =========================================================================
    // STEP 2: POST METHOD - Body Text Transpiling and Custom Status Injection
    // =========================================================================
    expect.log('Initializing POST validation step with structured request payloads...');
    const postPayload = { requested_status_code: 201, message_payload: "POST Pipeline Committed" };
    
    const postResponse = await fetch('/api/example/mutation-test', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Client-Profile': 'Suite-Core-Client'
      },
      body: JSON.stringify(postPayload)
    });
    
    expect.equal(postResponse.status, 201, 'POST endpoint processed dynamic code status 201 cleanly');
    expect.equal(postResponse.headers.get('X-Processed-By-Method'), 'POST', 'POST execution verified via header');

    if (postResponse.ok) {
      const postData = await postResponse.json();
      expect.log(`POST Response payload matching: ${JSON.stringify(postData)}`);
      expect.equal(postData.echo_message, 'POST Pipeline Committed', 'Data body parsed natively successfully');
      expect.equal(postData.detected_profile_header, 'Suite-Core-Client', 'Inbound request header captured by Java');
    }

    // =========================================================================
    // STEP 3: PUT METHOD - Dynamic State Mutations
    // =========================================================================
    expect.log('Initializing PUT layout tracking configurations operations...');
    const putPayload = { requested_status_code: 200, message_payload: "PUT Update Sequence Done" };
    
    const putResponse = await fetch('/api/example/mutation-test', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putPayload)
    });
    expect.equal(putResponse.status, 200, 'PUT endpoint processed operation cleanly');
    expect.equal(putResponse.headers.get('X-Processed-By-Method'), 'PUT', 'PUT route confirmed by response header');

    // =========================================================================
    // STEP 4: PATCH METHOD - Partial Segment Modifications
    // =========================================================================
    expect.log('Initializing PATCH operational route checks...');
    const patchPayload = { requested_status_code: 202, message_payload: "PATCH Structural Layout Modification" };
    
    const patchResponse = await fetch('/api/example/mutation-test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload)
    });
    expect.equal(patchResponse.status, 202, 'PATCH endpoint processed operation status 202');
    expect.equal(patchResponse.headers.get('X-Processed-By-Method'), 'PATCH', 'PATCH routing boundary verified');

    // =========================================================================
    // STEP 5: DELETE METHOD - Purging Active System Context Parameters
    // =========================================================================
    expect.log('Initializing DELETE teardown execution tests...');
    const deletePayload = { requested_status_code: 200, message_payload: "Wiped asset context parameters folder tree" };

    const deleteResponse = await fetch('/api/example/mutation-test', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }, // <-- This header was present!
      body: JSON.stringify(deletePayload)
    });    
    expect.equal(deleteResponse.status, 200, 'DELETE request processed successfully across active layers');
    expect.equal(deleteResponse.headers.get('X-Processed-By-Method'), 'DELETE', 'DELETE method verification complete');
    
    if (deleteResponse.ok) {
      const deleteData = await deleteResponse.json();
      expect.log(`DELETE Result metadata confirmation string: ${deleteData.echo_message}`);
    }
  });
}

