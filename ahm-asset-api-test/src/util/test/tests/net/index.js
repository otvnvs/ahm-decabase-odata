import runDownload from './download.js';
import runRequest from './request.js';
import runDiagnostics from './diagnostics.js';
export default async function runSuite(runner) {
    await runDownload(runner);
    await runRequest(runner);
    await runDiagnostics(runner);
}
