import runBasicSuite from './basic.js';
import runSsl from './ssl.js';

export default async function runSuite(runner) {
    //await runBasicSuite(runner);
    await runSsl(runner);
}
