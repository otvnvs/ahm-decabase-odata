import runBasicSuite from './basic.js';
import runStripSuite from './stripComponents.js';
import runStripComplexSuite from './stripComponentsComplex.js';
import runListSuite from './list.js';

export default async function runSuite(runner) {
    await runBasicSuite(runner);
    //await runStripSuite(runner);
    //await runStripComplexSuite(runner);
    //await runListSuite(runner);
}

