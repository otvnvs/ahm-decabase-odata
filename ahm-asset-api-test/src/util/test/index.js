import { createTestRunner } from './runner.js';

// Helper to isolate file names from full relative paths
const getSuiteName = (path) => {
  const parts = path.split('/');
  // Returns the folder name right before 'index.js'
  return parts[parts.length - 2] || path;
};

export const runApiTests = async (onLogEvent, targetSuiteName = null) => {
  const runner = createTestRunner(onLogEvent);
  const testModules = import.meta.glob('./tests/**/index.js', { eager: true });

  for (const path in testModules) {
    const suiteName = getSuiteName(path);
    
    // If a specific test target is supplied, skip modules that do not match
    if (targetSuiteName && suiteName.toLowerCase() !== targetSuiteName.toLowerCase()) {
      continue;
    }

    const suiteModule = testModules[path];
    if (typeof suiteModule.default === 'function') {
      try {
        await suiteModule.default(runner);
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (err) {
        runner.getResults().stats.errors.push({ suite: path, message: err.message });
      }
    }
  }

  return runner.getResults();
};

// NEW LOGIC: Scans directory paths and extracts an array of active test suite keys
export const getAvailableTestsList = () => {
  const testModules = import.meta.glob('./tests/**/index.js', { eager: false });
  return Object.keys(testModules).map(path => getSuiteName(path));
};

