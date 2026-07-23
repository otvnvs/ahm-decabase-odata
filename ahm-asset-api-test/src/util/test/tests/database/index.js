export default async function runSuite(runner) {

await runner.describe('SQLite Database Parameterized Prepared Engine Module', async (expect) => {
  expect.log("Initializing dynamic parameterized query execution tests...");

  const pathsResponse = await fetch('/api/fs/locations', { method: 'GET' });
  const pathPayload = await pathsResponse.json();
  const targetDbPath = `${pathPayload.locations.sandbox_databases_root}/prepared_test.db`;

  // 1. Initialize file asset
  await fetch('/api/database/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetDbPath })
  });

  // 2. Setup testing schema structure layout
  await fetch('/api/database/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetDbPath, sql: 'CREATE TABLE device_faults (id INT, error_tag TEXT, severity REAL);' })
  });

  // 3. RUN PARAMETERIZED INSERTION OPERATION
  expect.log("[Prepared Action] Running parameterized injection mutation...");
  const insertSql = "INSERT INTO device_faults (id, error_tag, severity) VALUES (?, ?, ?);";
  const insertArgs = [104, 'webview_crash_null_pointer', 89.65];

  const execResponse = await fetch('/api/database/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetDbPath, sql: insertSql, args: insertArgs })
  });

  expect.equal(execResponse.status, 200, 'POST /api/database/execute accepts and compiles parameterized arguments array');
  const execPayload = await execResponse.json();
  expect.equal(execPayload.status, 'success', 'Compiled statement mutation committed successfully');

  // 4. RUN PARAMETERIZED SELECTION FETCH QUERY
  expect.log("[Prepared Action] Querying via data-bound placeholders matching token arguments...");
  const selectSql = "SELECT * FROM device_faults WHERE error_tag = ? AND severity > ?;";
  const selectArgs = ['webview_crash_null_pointer', 50.0];

  const queryResponse = await fetch('/api/database/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetDbPath, sql: selectSql, args: selectArgs })
  });

  expect.equal(queryResponse.status, 200, 'POST /api/database/query returns compiled query output records');
  const queryPayload = await queryResponse.json();
  
  // --- ADDED VERIFICATION LOGGING ---
  expect.log("--- EXPANDED DATA RECORD VERIFICATION ---");
  expect.log(`  Raw Response Payload Status: ${queryPayload.status}`);
  expect.log(`  Total Returned Row Record Count: ${queryPayload.row_count}`);

  if (queryPayload.row_count > 0) {
    const targetRecord = queryPayload.rows[0]; // Extract first row match from response array
    
    expect.log("  Inspecting Column-To-JS Type Bindings:");
    expect.log(`    [Column: id] Value: ${targetRecord.id} | JS Type: ${typeof targetRecord.id}`);
    expect.log(`    [Column: error_tag] Value: "${targetRecord.error_tag}" | JS Type: ${typeof targetRecord.error_tag}`);
    expect.log(`    [Column: severity] Value: ${targetRecord.severity}% | JS Type: ${typeof targetRecord.severity}`);

    // Strict type safety validations
    expect.equal(typeof targetRecord.id, 'number', 'Verification: ID preserved as native JavaScript number format');
    expect.equal(typeof targetRecord.error_tag, 'string', 'Verification: Error tag preserved as native JavaScript string format');
    expect.equal(typeof targetRecord.severity, 'number', 'Verification: Severity preserved as native JavaScript float format');
    expect.equal(targetRecord.id, 104, 'Value Check: Extracted unique entry ID matches injection boundary criteria');
  } else {
    expect.log("  Critical: Argument matching returned no valid rows from memory store.");
  }

  expect.equal(queryPayload.row_count, 1, 'Data-bound result row fetched correctly');

  // 5. Automated database asset cleanup
  await fetch('/api/database/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetDbPath })
  });
});


}
