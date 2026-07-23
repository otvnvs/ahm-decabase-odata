export default async function runSuite(runner) {
  await runner.describe('Android Network Diagnostic Core Verification', async (expect) => {
    expect.log("=== BEGIN NETWORK HARDWARE COMPARISON SWEEP ===");
    expect.log("Diagnostic Tip: Run this test once with Wi-Fi ON, then turn Wi-Fi OFF and run it again to compare!");

    const response = await fetch('/api/network/diagnostics', { method: 'GET' });
    expect.equal(response.status, 200, 'GET /api/network/diagnostics returns operational 200 OK status');

    const payload = await response.json();

    // 1. Core Connection Layer Audit
    expect.log("--- [RAW LAYER] PHYSICAL INTERFACE METRICS ---");
    expect.log(`  -> Detected Hardware Interface: ${payload.interfaces.active_transport}`);
    expect.log(`  -> Raw Downstream Link Budget: ${payload.interfaces.link_downstream_kbps} Kbps`);
    expect.log(`  -> Raw Upstream Link Budget: ${payload.interfaces.link_upstream_kbps} Kbps`);
    
    // Convert to Mbps for clean console readability 
    const downMbps = (payload.interfaces.link_downstream_kbps / 1000).toFixed(2);
    const upMbps = (payload.interfaces.link_upstream_kbps / 1000).toFixed(2);
    expect.log(`  -> Calculated Bandwidth: ${downMbps} Mbps Down / ${upMbps} Mbps Up`);
    expect.log(`  -> OS Billing Flag (Is Metered?): ${payload.interfaces.is_network_metered}`);

    // 2. Comprehensive Proxy Routing Audit
    expect.log("--- [ROUTING LAYER] SYSTEM PROXY METRICS ---");
    expect.log(`  -> Global Network Intercept Proxy Active: ${payload.system_proxy.is_proxy_active}`);
    expect.log(`  -> Bound Proxy Host Name: ${payload.system_proxy.detected_host}`);
    expect.log(`  -> Bound Proxy Connection Port: ${payload.system_proxy.detected_port}`);

    // 3. DNS Lookup Engine Performance
    expect.log("--- [APPLICATION LAYER] SOCKET PERFORMANCE ---");
    expect.log(`  -> Handshake Destination: ${payload.dns_perf.diagnostic_target_host}`);
    expect.log(`  -> Name Resolution Status: ${payload.dns_perf.resolution_successful ? "SUCCESSFUL" : "FAILED"}`);
    expect.log(`  -> Dynamic IP Mapping Resolved: ${payload.dns_perf.resolved_ip_address}`);
    expect.log(`  -> Engine Round-Trip Delay: ${payload.dns_perf.resolution_latency_ms} ms`);

    // --- EXPECTED HARDWARE TOGGLE INSIGHTS TO LOOK FOR ---
    if (payload.interfaces.active_transport === 'WIFI') {
      expect.log("  [Radio Observation] Device is communicating via Wi-Fi. Notice that is_network_metered is usually FALSE.");
    } else if (payload.interfaces.active_transport === 'CELLULAR') {
      expect.log("  [Radio Observation] Device has swapped to Carrier Mobile Data. Notice if speeds drop and is_network_metered flips to TRUE.");
    } else if (payload.interfaces.active_transport === 'NONE') {
      expect.log("  [Radio Observation] CRITICAL LOCKDOWN - No active network transport detected! Socket layer diagnostics will show FAILED.");
    }

    // Baseline structural safety validation checkpoints
    expect.equal(typeof payload.interfaces.active_transport, 'string', 'Transport verification complete');
    expect.equal(typeof payload.dns_perf.resolution_successful, 'boolean', 'DNS evaluation check complete');
    expect.log("=== END NETWORK HARDWARE COMPARISON SWEEP ===");
  });
}
