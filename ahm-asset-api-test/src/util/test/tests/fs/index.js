export default async function runSuite(runner) {

  // --- NEW SUB-SUITE B: Automated Storage Block & Partition Diagnostics (Expanded Logging) ---
  await runner.describe('Android Disk Space Partition Verification', async (expect) => {
    expect.log("=== START EXPLICIT BLOCK FOOTPRINT EXTRACTION SWEEP ===");

    const response = await fetch('/api/fs/diskspace', { method: 'GET' });
    expect.equal(response.status, 200, 'GET /api/fs/diskspace returns valid 200 OK configuration status');

    const payload = await response.json();

    expect.equal(typeof payload.internal_partition, 'object', 'Payload includes flash drive statistics');
    expect.equal(typeof payload.secondary_partition, 'object', 'Payload includes removable SD card configuration metadata');
    expect.equal(typeof payload.app_sandbox_cache, 'object', 'Payload resolves application specific cache tracking footprints');

    // --- EXPANDED INTERNAL SYSTEM DRIVE LOGGING ---
    expect.log("--- [INTERNAL] RAW BYTE ANALYSIS ---");
    expect.log(`  Raw Partition Path: ${payload.internal_partition.partition_path}`);
    expect.log(`  Total Allocation Capacity: ${payload.internal_partition.total_space_bytes} bytes`);
    expect.log(`  Free Block Space Headroom: ${payload.internal_partition.available_space_bytes} bytes`);
    
    const intTotalGB = (payload.internal_partition.total_space_bytes / (1024 ** 3)).toFixed(2);
    const intAvailGB = (payload.internal_partition.available_space_bytes / (1024 ** 3)).toFixed(2);
    const intUsedGB = (intTotalGB - intAvailGB).toFixed(2);
    expect.log(`  Summary: ${intUsedGB} GB Used / ${intAvailGB} GB Free out of ${intTotalGB} GB Capacity`);

    // --- EXPANDED REMOVABLE MICRO-SD MOUNT LOGGING ---
    expect.log("--- [EXTERNAL] SUBSYSTEM MOUNT DETECTION ---");
    expect.log(`  Hardware Expansion Slot Occupied: ${payload.secondary_partition.removable_sdcard_mounted}`);
    expect.log(`  Hardware Partition Target Path: ${payload.secondary_partition.partition_path}`);
    expect.log(`  SD Total Capacity Space: ${payload.secondary_partition.total_space_bytes} bytes`);
    expect.log(`  SD Available Capacity Space: ${payload.secondary_partition.available_space_bytes} bytes`);

    // --- EXPANDED APP SANDBOX WORKSPACE LOGGING ---
    expect.log("--- [APPLICATION] APP SANDBOX WORKSPACE CACHE FOOTPRINT ---");
    expect.log(`  Sandbox App Cache Workspace Path: ${payload.app_sandbox_cache.sandbox_cache_path}`);
    expect.log(`  Raw Computed Cache Size: ${payload.app_sandbox_cache.active_cache_usage_bytes} bytes`);
    
    const appCacheKB = (payload.app_sandbox_cache.active_cache_usage_bytes / 1024).toFixed(2);
    if (appCacheKB > 1024) {
      expect.log(`  Calculated Cache Size: ${(appCacheKB / 1024).toFixed(2)} MB`);
    } else {
      expect.log(`  Calculated Cache Size: ${appCacheKB} KB`);
    }

    expect.equal(typeof payload.secondary_partition.removable_sdcard_mounted, 'boolean', 'Secondary check variable matches true/false flag state');
    expect.log("=== END EXPLICIT BLOCK FOOTPRINT EXTRACTION SWEEP ===");
  });


  // --- SUB-SUITE A: Existing Native File System Lifecycle Tasks ---
  await runner.describe('Native Sandbox Comprehensive Lifecycle', async (expect) => {
    const tempDir = 'comprehensive_lifecycle_test';
    const file1 = `${tempDir}/first_document.txt`;
    const file2 = `${tempDir}/second_document.json`;

    await fetch(`/api/fs/mkdir?path=${encodeURIComponent(tempDir)}&recursive=true`, { method: 'POST' });

    // CLEAN STANDARD: Pass the text string directly into the body field
    const content1 = 'Hello from the first file asset chunk';
    const write1Res = await fetch(`/api/fs/write?path=${encodeURIComponent(file1)}`, {
      method: 'POST',
      body: content1 
    });
    expect.equal(write1Res.status, 200, 'POST /write commits file1 data successfully via standard body');

    const read1Res = await fetch(`/api/fs/read?path=${encodeURIComponent(file1)}`);
    if (read1Res.ok) {
      const text1 = await read1Res.text();
      expect.equal(text1, content1, 'File1 data validation integrity matches');
    }

    // CLEAN STANDARD: Pass the JSON configuration string directly into the body field
    const content2 = JSON.stringify({ status: "active", index: 2 });
    const write2Res = await fetch(`/api/fs/write?path=${encodeURIComponent(file2)}`, {
      method: 'POST',
      body: content2 
    });
    expect.equal(write2Res.status, 200, 'POST /write commits file2 json payload successfully via standard body');

    const read2Res = await fetch(`/api/fs/read?path=${encodeURIComponent(file2)}`);
    if (read2Res.ok) {
      const text2 = await read2Res.text();
      expect.equal(text2, content2, 'File2 data validation integrity matches');
    }

    // Clean up temporary testing directories
    await fetch(`/api/fs/delete?path=${encodeURIComponent(tempDir)}&recursive=true`, { method: 'DELETE' });
  });

  await runner.describe('Native Sandbox Comprehensive Lifecycle', async (expect) => {
	// Append this right to the bottom of your runSuite execution tree:
	expect.log("--- DYNAMIC PATH VERIFICATION DIAGNOSTICS ---");
	const tempDir = 'comprehensive_lifecycle_test';
	const locationResponse = await fetch('/api/fs/locations', { method: 'GET' });
	if (locationResponse.ok) {
	    const dataMap = await locationResponse.json();
	    expect.log(`Active Storage Target Path Root: ${dataMap.locations.external_storage_root}`);
	    expect.log(`Verify this folder contents manually: ${dataMap.locations.external_storage_root}/${tempDir}`);
	}
  })

}
