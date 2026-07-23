//export const createTestRunner = (onLogEvent) => {
//  let activeSuite = '';
//  const summary = { total: 0, passed: 0, failed: 0, errors: [] };
//
//  const emit = (eventPayload) => {
//    if (typeof onLogEvent === 'function') {
//      onLogEvent(eventPayload);
//    }
//  };
//
//  const assert = {
//    equal: (actual, expected, message) => {
//      summary.total++;
//      const isPassed = actual === expected;
//      if (isPassed) {
//        summary.passed++;
//      } else {
//        summary.failed++;
//        summary.errors.push({ suite: activeSuite, message, expected, actual });
//      }
//      emit({ type: 'assertion', status: isPassed ? 'PASS' : 'FAIL', message, expected, actual });
//    },
//    ok: (expression, message) => {
//      assert.equal(!!expression, true, message);
//    },
//    // New log method available inside tests
//    log: (message, data = null) => {
//      emit({
//        type: 'log',
//        suite: activeSuite,
//        message,
//        timestamp: new Date().toISOString(),
//        data
//      });
//    }
//  };
//
//  return {
//    describe: async (suiteName, testFn) => {
//      activeSuite = suiteName;
//      emit({ type: 'suite-start', name: suiteName });
//      try {
//        await testFn(assert);
//      } catch (err) {
//        summary.failed++;
//        summary.errors.push({ suite: activeSuite, message: err.message });
//        emit({ type: 'assertion', status: 'ERROR', message: 'Suite encountered a critical exception', error: err.message });
//      }
//    },
//    getResults: () => {
//      return { success: summary.failed === 0, stats: { ...summary } };
//    }
//  };
//};
//--------------------------------------------------------------------------------
export const createTestRunner = (onLogEvent) => {
  let activeSuite = '';
  const summary = { total: 0, passed: 0, failed: 0, errors: [] };

  const emit = (eventPayload) => {
    if (typeof onLogEvent === 'function') {
      onLogEvent(eventPayload);
    }
  };

  // Helper to standardise assertion tracking and emission
  const registerAssertion = (isPassed, actual, expected, message, operator) => {
    summary.total++;
    const defaultMessage = message || `Expected ${operator} assertion`;
    
    if (isPassed) {
      summary.passed++;
    } else {
      summary.failed++;
      summary.errors.push({ suite: activeSuite, message: defaultMessage, expected, actual, operator });
    }
    
    emit({ 
      type: 'assertion', 
      status: isPassed ? 'PASS' : 'FAIL', 
      message: defaultMessage, 
      expected, 
      actual,
      operator 
    });
  };

  const assert = {
    // 1. Existing core methods updated to use helper
    equal: (actual, expected, message) => {
      registerAssertion(actual === expected, actual, expected, message, '===');
    },
    ok: (expression, message) => {
      assert.equal(!!expression, true, message || 'Expected expression to be truthy');
    },
    log: (message, data = null) => {
      emit({
        type: 'log',
        suite: activeSuite,
        message,
        timestamp: new Date().toISOString(),
        data
      });
    },

    // 2. Your requested extensions
    notEqual: (actual, expected, message) => {
      registerAssertion(actual !== expected, actual, expected, message, '!==');
    },
    greaterThan: (actual, expected, message) => {
      registerAssertion(actual > expected, actual, expected, message, '>');
    },
    greaterThanOrEqual: (actual, expected, message) => {
      registerAssertion(actual >= expected, actual, expected, message, '>=');
    },
    lessThan: (actual, expected, message) => {
      registerAssertion(actual < expected, actual, expected, message, '<');
    },
    lessThanOrEqual: (actual, expected, message) => {
      registerAssertion(actual <= expected, actual, expected, message, '<=');
    },

    // 3. Recommended practical additions
    deepEqual: (actual, expected, message) => {
      const isPassed = JSON.stringify(actual) === JSON.stringify(expected);
      registerAssertion(isPassed, actual, expected, message, 'deepEqual');
    },
    throws: async (fn, message) => {
      let threw = false;
      let caughtError = null;
      try {
        await fn();
      } catch (err) {
        threw = true;
        caughtError = err.message;
      }
      registerAssertion(threw, caughtError, 'An error to be thrown', message, 'throws');
    }
  };

  return {
    describe: async (suiteName, testFn) => {
      activeSuite = suiteName;
      emit({ type: 'suite-start', name: suiteName });
      try {
        await testFn(assert);
      } catch (err) {
        summary.failed++;
        summary.errors.push({ suite: activeSuite, message: err.message });
        emit({ type: 'assertion', status: 'ERROR', message: 'Suite encountered a critical exception', error: err.message });
      }
    },
    getResults: () => {
      return { success: summary.failed === 0, stats: { ...summary } };
    }
  };
};

