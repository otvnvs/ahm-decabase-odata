export default async function runSuite(runner) {

await runner.describe('Device Info API Inspection Module', async (expect) => {
  expect.log("Initiating Android native hardware/OS verification diagnostics...");
  
  const response = await fetch('/api/device/info', { method: 'GET' });
  expect.equal(response.status, 200, 'GET /api/device/info returns successful 200 OK status');

  const payload = await response.json();
  
  // Structural Schema Assertions
  expect.equal(typeof payload.hardware, 'object', 'Payload contains hardware config object');
  expect.equal(typeof payload.os, 'object', 'Payload contains OS specification object');
  expect.equal(typeof payload.build, 'object', 'Payload contains firmware build object');
  expect.equal(typeof payload.cpu, 'object', 'Payload contains CPU architecture configurations');
  expect.equal(typeof payload.memory, 'object', 'Payload contains RAM profile stats');
  expect.equal(typeof payload.display, 'object', 'Payload contains screen dimensions');
  expect.equal(typeof payload.storage, 'object', 'Payload contains device storage allocation');
  expect.equal(typeof payload.webview_engine, 'object', 'Payload contains webview metadata');
  expect.equal(typeof payload.battery, 'object', 'Payload contains power metrics');
  expect.equal(typeof payload.locale, 'object', 'Payload contains regional localization info');

  // --- Hardware, OS, & Build Details ---
  expect.log("--- HARDWARE & VERSION METRICS ---");
  expect.log(`  Device Model: ${payload.hardware.manufacturer} ${payload.hardware.model} (${payload.hardware.brand})`);
  expect.log(`  OS Instance: Android ${payload.os.release_version} (API level ${payload.os.sdk_int})`);
  expect.log(`  Security Update: Patch level context reported on ${payload.os.security_patch}`);

  // --- CPU Architecture ---
  expect.log("--- CPU METRICS ---");
  if (payload.cpu.supported_abis) {
    expect.log(`  Supported ABIs: ${payload.cpu.supported_abis.join(', ')}`);
  }

  // --- Memory Profile ---
  expect.log("--- MEMORY (RAM) METRICS ---");
  if (payload.memory.total_ram_bytes) {
    const totalGB = (payload.memory.total_ram_bytes / (1024 ** 3)).toFixed(2);
    const availGB = (payload.memory.avail_ram_bytes / (1024 ** 3)).toFixed(2);
    expect.log(`  RAM Status: ${availGB} GB available of ${totalGB} GB total capacity`);
    expect.log(`  Low Memory System State Warning: ${payload.memory.low_memory_flag}`);
  }

  // --- Display & Rendering Configuration ---
  expect.log("--- DISPLAY & SCREEN RENDERING METRICS ---");
  expect.log(`  Window Resolution: ${payload.display.width_pixels}px x ${payload.display.height_pixels}px`);
  expect.log(`  Layout Scale Factor: ${payload.display.density_scale}x (${payload.display.density_dpi} DPI)`);
  expect.log(`  Hardware Accelerated Window Pipeline: ${payload.display.hardware_acceleration_enabled}`);

  // --- WebView Core Provider Details ---
  expect.log("--- WEBVIEW CORE ENGINE METRICS ---");
  if (payload.webview_engine.package_name) {
    expect.log(`  WebView Provider Package: ${payload.webview_engine.package_name}`);
    expect.log(`  WebView Core Chromium Version: ${payload.webview_engine.version_name}`);
  } else {
    expect.log(`  WebView Engine Identification status: ${payload.webview_engine.status || "Unknown fallback path"}`);
  }

  // --- Power & Battery Core Diagnostics ---
  expect.log("--- POWER & BATTERY DIAGNOSTICS ---");
  if (payload.battery.percentage !== undefined) {
    expect.log(`  Battery Charge Capacity: ${payload.battery.percentage.toFixed(1)}%`);
    expect.log(`  Battery Core Temperature: ${payload.battery.temperature_celsius}°C`);
    expect.log(`  Power Input Active: ${payload.battery.is_charging} (Connected via source: ${payload.battery.plugged_source})`);
  }

  // --- Localization Configurations ---
  expect.log("--- NATIVE LOCALE CONFIGURATIONS ---");
  expect.log(`  Device System Locale: ${payload.locale.language_tag} (${payload.locale.display_name})`);

  // --- System Storage Allocations ---
  expect.log("--- SYSTEM STORAGE METRICS ---");
  if (payload.storage.total_storage_bytes) {
    const totalStorageGB = (payload.storage.total_storage_bytes / (1024 ** 3)).toFixed(2);
    const availStorageGB = (payload.storage.available_storage_bytes / (1024 ** 3)).toFixed(2);
    expect.log(`  Internal Storage Configuration: ${availStorageGB} GB free out of ${totalStorageGB} GB layout`);
  }

  expect.equal(typeof payload.hardware.manufacturer, 'string', 'Hardware field verification complete');
});


}
