# Custom Test Runner Documentation

A lightweight, event-driven asynchronous test runner for JavaScript applications. It supports standard value assertions, comparative inequalities, deep structural comparisons, error catching, and integrated suite logging.

---

## Installation & Setup

Save the test runner code into a file (e.g., `testRunner.js`). You can then import `createTestRunner` into your test suites or test execution script.

```javascript
import { createTestRunner } from './testRunner.js';
```

---

## API Reference

### `createTestRunner(onLogEvent)`
Initializes a new test runner instance.
* **Arguments:** `onLogEvent` *(Function)* - A callback function that receives event payloads as tests execute.
* **Returns:** An object containing `describe` and `getResults`.

### The `assert` Object
Passed directly into the `describe` callback function. It exposes the following methods:

| Method | Description |
| :--- | :--- |
| `assert.equal(actual, expected, [msg])` | Asserts loose or strict identity equality (`===`). |
| `assert.notEqual(actual, expected, [msg])` | Asserts inequality (`!==`). |
| `assert.ok(expression, [msg])` | Asserts that the expression evaluates to truthy. |
| `assert.greaterThan(actual, expected, [msg])` | Asserts that `actual > expected`. |
| `assert.greaterThanOrEqual(actual, expected, [msg])` | Asserts that `actual >= expected`. |
| `assert.lessThan(actual, expected, [msg])` | Asserts that `actual < expected`. |
| `assert.lessThanOrEqual(actual, expected, [msg])` | Asserts that `actual <= expected`. |
| `assert.deepEqual(actual, expected, [msg])` | Compares arrays or objects structurally via JSON serialization. |
| `assert.throws(fn, [msg])` | Asserts that an asynchronous or synchronous function throws an error. |
| `assert.log(message, [data])` | Emits a custom time-stamped log message linked to the active suite. |

---

## Usage Example

Below is a complete example demonstrating how to initialize the runner, hook into its event listener, execute test blocks, and read out final test summaries.

```javascript
import { createTestRunner } from './testRunner.js';

// 1. Initialize a reporter to handle real-time logs
const eventReporter = (event) => {
  switch (event.type) {
    case 'suite-start':
      console.log(`\nStarting Suite: ${event.name}`);
      break;
    case 'assertion':
      if (event.status === 'PASS') {
        console.log(`  PASS: ${event.message}`);
      } else if (event.status === 'FAIL') {
        console.error(`  FAIL: ${event.message} (Expected ${event.expected}, Got ${event.actual})`);
      } else {
        console.error(`  CRITICAL ERROR: ${event.message}`);
      }
      break;
    case 'log':
      console.log(`  [LOG] [${event.timestamp}] ${event.message}`, event.data || '');
      break;
  }
};

const runner = createTestRunner(eventReporter);

// 2. Define and run test suites
const runTests = async () => {
  
  // Math and comparative validations
  await runner.describe('Math Operations', async (assert) => {
    const value = 10 + 5;
    
    assert.equal(value, 15, '10 + 5 should equal 15');
    assert.greaterThan(value, 10, 'Result should be greater than 10');
    assert.lessThanOrEqual(value, 15, 'Result should be less than or equal to 15');
    assert.notEqual(value, 20, 'Result should not equal 20');
  });

  // Array and Structure validations
  await runner.describe('User Account Logic', async (assert) => {
    const user = { id: 1, roles: ['admin', 'editor'] };
    
    assert.ok(user.id, 'User ID should exist');
    assert.deepEqual(user.roles, ['admin', 'editor'], 'Roles array matches expected structure');
    
    // In-test structural logging
    assert.log('Inspecting active permissions', user.roles);
  });

  // Error handling validations
  await runner.describe('Error Boundaries', async (assert) => {
    const processData = async () => {
      throw new Error('Invalid schema configurations');
    };

    await assert.throws(processData, 'Processing malformed data should fail');
  });

  // 3. Extract final statistics
  const results = runner.getResults();
  console.log('\n--- Test Execution Summary ---');
  console.log(JSON.stringify(results, null, 2));
};

runTests();
```

---

## Event Payload Formats

### Assertion Event
```json
{
  "type": "assertion",
  "status": "FAIL",
  "message": "Result should be greater than 10",
  "expected": 10,
  "actual": 8,
  "operator": ">"
}
```

### Log Event
```json
{
  "type": "log",
  "suite": "User Account Logic",
  "message": "Inspecting active permissions",
  "timestamp": "2026-07-08T00:15:00.000Z",
  "data": ["admin", "editor"]
}
```

