# Android Hybrid Mobile API Test Asset

# Developer Architecture Guide

This project is a hybrid Vue 3 / Vite web application optimized to run inside a sandboxed Android WebView container. It communicates with a native Android backend via intercepted HTTPS network boundaries (`/api/*`) and standardizes testing using an in-app console dashboard.

---

## Key System Files

*   **`./src/Main.vue`**  
    The application root layout. Handles initialization, environment checks, and binds the visual console view. It automatically injects the Service Worker proxy when debugging on desktop.
*   **`./src/components/TestTerminal.vue`**  
    A encapsulated text console module powered by `xterm.js`. Handles edge-to-edge canvas formatting on mobile device screens.
*   **`./src/util/test/runner.js`**  
    The core testing framework engine. Provides BDD-style layout primitives (`describe`, `expect`) and feeds formatted ANSI color messages back to the active console terminal instance.
*   **`./src/util/test/index.js`**  
    The integration test workspace. Orchestrates real functional verification tasks against your `App`, `Fs`, `Maintenance`, and `Net` native backend system paths.
*   **`./public/mock-worker.js`**  
    The desktop service worker proxy layer. Intercepts outbound browser network connections targeting `/api/*` on desktop to simulate Android data structures. It is completely bypassed on physical devices.
*   **`./vite.config.js`**  
    The project bundler configuration. Compiles Vue single-file components and enforces absolute relative assets pathing (`base: './'`) required for local storage execution.

---

## How to Modify and Extend the Code

### To Add a New API Test Case
Open `./src/util/test/index.js`, navigate to the relevant `describe` block, and use a standard `fetch` call paired with the assertion wrapper:

```javascript
export default async function runSuite(runner) {
  await runner.describe('Your API Module Title', async (expect) => {
    expect.log("informationa log: testing123");
    const response = await fetch('/api/your/new-route?param=value', { method: 'POST' });
    expect.equal(response.status, 200, 'POST /new-route returns operational status code');
    const payload = await response.json();
    expect.equal(payload.status, 'success', 'Payload state matches expected output criteria');
  });
}
```

### To Update a Desktop Response Stub
If your native Android Java controllers change, update the corresponding path interception block inside `./public/mock-worker.js`:

```javascript
if (path === '/api/your/new-route') {
  return jsonResponse({ status: 'success', customValue: 'your_mock_value' });
}
```

### To Run and Verify Changes
1.  **Local Desktop Browser Mode:** Execute `npm run dev`. Open `http://localhost:5173`. The Service Worker will boot up automatically, intercept your API routes, and execute the full test suite in your desktop browser.
2.  **Android Phone Production Build:** Run `npm run build`. Transfer the generated `dist/` directory contents directly into your Android native app production assets folder workspace (`www`).
