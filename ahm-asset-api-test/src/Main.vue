
<template>
  <div class="app-layout">
    <header class="app-header">
        <!-- Mobile History D-Pad Controls -->
        <div class="mobile-history-controls">
          <button 
            @click="triggerMobileHistoryUp" 
            :disabled="!terminalInstance"
            class="history-btn" 
            title="History Up"
          >
            ▲
          </button>
          <button 
            @click="handleHistoryDown" 
            :disabled="!terminalInstance"
            class="history-btn" 
            title="History Down"
          >
            ▼
          </button>
        </div>
      <div class="action-bar">
        <button 
          @click="handleCopyLogs" 
          :disabled="!terminalInstance" 
          class="action-btn copy-btn"
        >
          {{ isCopying ? 'Copied' : 'Copy Logs' }}
        </button>
        <button 
          @click="handleRunTests(null)" 
          :disabled="isRunning || !terminalInstance" 
          class="action-btn run-btn"
        >
          {{ isRunning ? 'Running' : 'Rerun Suite' }}
        </button>


      </div>
    </header>
    <main class="console-wrapper">
      <TestTerminal 
        @ready="onTerminalReady" 
        @command="handleTerminalCommand"
        @history-up="handleHistoryUp"
        @history-down="handleHistoryDown"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TestTerminal from './components/TestTerminal.vue';
import { runApiTests, getAvailableTestsList } from './util/test/index.js';

const USE_MOCKS = true;
const PROMPT_HEAD = '\r\n\x1b[1;32m$ \x1b[0m';
const STORAGE_KEY = 'ahm-asset-api-test';

const terminalInstance = ref(null);
const isRunning = ref(false);
const isCopying = ref(false);

const history = ref([]);
const historyIndex = ref(-1);
const currentInputCache = ref('');

const onTerminalReady = (term) => {
  terminalInstance.value = term;
};

const loadHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    history.value = saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to parse history:', err);
    history.value = [];
  }
};

const saveCommandToHistory = (commandText) => {
  if (!commandText || commandText.trim() === '') return;
  if (history.value[history.value.length - 1] === commandText) return;

  history.value.push(commandText);
  if (history.value.length > 100) history.value.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
};

const handleHistoryUp = (currentBuffer) => {
  if (history.value.length === 0) return;

  if (historyIndex.value === -1) {
    currentInputCache.value = currentBuffer;
    historyIndex.value = history.value.length - 1;
  } else if (historyIndex.value > 0) {
    historyIndex.value--;
  }

  updateTerminalInputLine(history.value[historyIndex.value]);
};

const handleHistoryDown = () => {
  if (historyIndex.value === -1) return;

  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++;
    updateTerminalInputLine(history.value[historyIndex.value]);
  } else {
    historyIndex.value = -1;
    updateTerminalInputLine(currentInputCache.value);
  }
};

const updateTerminalInputLine = (text) => {
  if (!terminalInstance.value) return;
  
  terminalInstance.value.write('\r\x1b[2K'); 
  terminalInstance.value.write(`\x1b[1;32m$ \x1b[0m${text}`);
  
  if (typeof terminalInstance.value.setCommandBuffer === 'function') {
    terminalInstance.value.setCommandBuffer(text);
  }
};

onMounted(async () => {
  loadHistory();
  
  const isAndroidEnv = /Android/i.test(navigator.userAgent);
  if ('serviceWorker' in navigator) {
    if (USE_MOCKS && !isAndroidEnv) {
      try {
        const registration = await navigator.serviceWorker.register('/mock-worker.js');
        console.log('Service Worker mock environment active.');
        if (!navigator.serviceWorker.controller) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                window.location.reload();
              }
            });
          });
        }
      } catch (err) {
        console.error('Service Worker registration failed:', err);
      }
    } else {
      const activeRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of activeRegistrations) {
        await reg.unregister();
      }
    }
  }

  const checkInterval = setInterval(async () => {
    if (terminalInstance.value) {
      clearInterval(checkInterval);
      await handleTerminalCommand('help');
    }
  }, 50);
});
const handleTerminalCommand = async (rawInput) => {
  if (!terminalInstance.value) return;
  
  terminalInstance.value.write('\r\n');
  if (rawInput === '') {
    terminalInstance.value.write(PROMPT_HEAD);
    return;
  }

  saveCommandToHistory(rawInput);
  historyIndex.value = -1;
  currentInputCache.value = '';

  const inputParts = rawInput.split(/\s+/);
  const coreCommand = inputParts[0];
  const targetArgument = inputParts[1] || null;

  switch (coreCommand) {
    case 'help':
      terminalInstance.value.writeln('\x1b[1;36mAvailable Automation Shell Commands:\x1b[0m');
      terminalInstance.value.writeln('  tests        - Lists all auto-discovered test suite profiles');
      terminalInstance.value.writeln('  run          - Triggers all discovered backend test blocks');
      terminalInstance.value.writeln('  run [target] - Triggers an isolated specific suite profile (e.g. /run fs)');
      terminalInstance.value.writeln('  clear        - Purges visible canvas rows from terminal history');
      terminalInstance.value.writeln('  copy         - Snapshots complete viewport traces onto clipboard');
      terminalInstance.value.writeln('  post target  - HTTP posts viewport traces to target URL');
      terminalInstance.value.writeln('  help         - Renders this clean operational reference table');
      break;
    case 'tests':
      const list = getAvailableTestsList();
      if (list.length === 0) {
        terminalInstance.value.writeln('\x1b[33mNo test suite modules detected inside tests/ layout directory.\x1b[0m');
      } else {
        terminalInstance.value.writeln('\x1b[1;36mDiscovered Test Suites:\x1b[0m');
        list.forEach(name => terminalInstance.value.writeln(`* ${name}`));
      }
      break;
    case 'run':
      if (isRunning.value) {
        terminalInstance.value.writeln('\x1b[1;31m[ERROR] Test suite execution loop is already active.\x1b[0m');
      } else {
        await handleRunTests(targetArgument);
        return;
      }
      break;
    case 'clear':
      terminalInstance.value.clear();
      break;
    case 'copy':
      await handleCopyLogs();
      terminalInstance.value.writeln('\x1b[1;32mSystem console buffer trace snapshotted successfully to clipboard.\x1b[0m');
      break;
    case 'post':
      try {
        await handlePostLogs(targetArgument);
        terminalInstance.value.writeln('\x1b[1;32mPosted to ' + targetArgument + '.\x1b[0m');
      } catch (e) {
        terminalInstance.value.writeln('\x1b[1;31m[ERROR] ' + ('Failed to post to ' + targetArgument + ': ' + e.toString()) + '\x1b[0m');
      }
      break;
    default:
      terminalInstance.value.writeln(`\x1b[1;31mUnknown shell instruction: "${coreCommand}". Type /help for assistance.\x1b[0m`);
      break;
  }
  
  terminalInstance.value.write(PROMPT_HEAD);
};

const handleRunTests = async (targetSuite = null) => {
  if (!terminalInstance.value || isRunning.value) return;
  isRunning.value = true;
  terminalInstance.value.clear();

  const isIntercepted = !!navigator.serviceWorker.controller;
  terminalInstance.value.writeln(`\x1b[1;33mMode: ${isIntercepted ? 'Mock Engine Active' : 'Native Hardware Connected'}\x1b[0m`);
  
  if (targetSuite) {
    terminalInstance.value.writeln(`\x1b[90mExecuting targeted slice isolation run for: "${targetSuite}"\x1b[0m`);
  }

  const logToTerminalRealTime = (log) => {
    if (log.type === 'suite-start') {
      terminalInstance.value.writeln(`\n\x1b[1;35m[Suite] ${log.name}\x1b[0m`);
    } else if (log.type === 'assertion') {
      if (log.status === 'PASS') {
        terminalInstance.value.writeln(`\x1b[32m[PASS]\x1b[0m ${log.message}`);
      } else if (log.status === 'FAIL') {
        terminalInstance.value.writeln(`\x1b[31m[FAIL]\x1b[0m ${log.message}`);
        terminalInstance.value.writeln(`\x1b[33m(i) Expected: "${log.expected}" | Got: "${log.actual}"\x1b[0m`);
      } else if (log.status === 'ERROR') {
        terminalInstance.value.writeln(`\x1b[31m[ERROR]\x1b[0m ${log.message}: ${log.error}`);
      }
    } else if (log.type === 'log') {
      terminalInstance.value.writeln(`\x1b[36m[LOG]\x1b[0m ${log.message}`);
      if (log.data) {
        const dataStr = typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : log.data;
        const indentedData = dataStr.split('\n').map(line => `${line}`).join('\n');
        terminalInstance.value.writeln(`\x1b[90m${indentedData}\x1b[0m`);
      }
    }
  };

  const results = await runApiTests(logToTerminalRealTime, targetSuite);
  
  if (results.stats.total === 0 && targetSuite) {
    terminalInstance.value.writeln(`\n\x1b[31m[ERROR] No matching suite discovered matching name string: "${targetSuite}"\x1b[0m`);
  } else {
    terminalInstance.value.writeln('\n\x1b[1;36mEXECUTION COMPLETE\x1b[0m');
    terminalInstance.value.writeln(`Passed: \x1b[32m${results.stats.passed}\x1b[0m`);
    terminalInstance.value.writeln(`Failed: \x1b[31m${results.stats.failed}\x1b[0m`);
    terminalInstance.value.writeln('---------------------------------------');
  }
  
  terminalInstance.value.write(PROMPT_HEAD);
  isRunning.value = false;
};

const handleCopyLogs = async () => {
  if (!terminalInstance.value || isCopying.value) return;
  try {
    terminalInstance.value.selectAll();
    const logBufferText = terminalInstance.value.getSelection();
    terminalInstance.value.clearSelection();
    
    if (!logBufferText) return;
    
    await navigator.clipboard.writeText(logBufferText.trim());
    isCopying.value = true;
    setTimeout(() => {
      isCopying.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy active console text strings to clipboard:', err);
  }
};

//const Logs = async (url) => {
//  if (!terminalInstance.value || isCopying.value) return;
//  if (!url) return;
//  
//  try {
//    terminalInstance.value.selectAll();
//    const logBufferText = terminalInstance.value.getSelection();
//    terminalInstance.value.clearSelection();
//    
//    if (!logBufferText) return;
//    
//    isCopying.value = true;
//    
//    await fetch(url, {
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//      },
//      body: JSON.stringify({ logs: logBufferText }),
//    });
//    
//    setTimeout(() => {
//      isCopying.value = false;
//    }, 2000);
//  } catch (err) {
//    console.error('Failed to post terminal logs to the server:', err);
//    isCopying.value = false;
//    throw err;
//  }
//};

//const handlePostLogs = async (url) => {
//  if (!terminalInstance.value || isCopying.value) return;
//  if (!url) return;
//
//  try {
//    terminalInstance.value.selectAll();
//    const logBufferText = terminalInstance.value.getSelection();
//    terminalInstance.value.clearSelection();
//
//    if (!logBufferText) return;
//
//    isCopying.value = true;
//
//    // Route payload through the Cross-Origin Network Proxy Broker
//    await fetch('/api/net/request', {
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//      },
//      body: JSON.stringify({
//        url: url,
//        method: 'POST',
//        headers: {
//          'Content-Type': 'text/plain',
//        },
//        body: logBufferText
//      }),
//    });
//
//    setTimeout(() => {
//      isCopying.value = false;
//    }, 2000);
//  } catch (err) {
//    console.error('Failed to post terminal logs to the server via request:', err);
//    isCopying.value = false;
//    throw err;
//  }
//};
const handlePostLogs = async (url) => {
  if (!terminalInstance.value || isCopying.value) return;
  if (!url) return;

  try {
    terminalInstance.value.selectAll();
    const logBufferText = terminalInstance.value.getSelection();
    terminalInstance.value.clearSelection();

    if (!logBufferText) return;

    isCopying.value = true;

    // Dispatch to the broker endpoint path
    await fetch('/api/net/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // ENCLOSING EVERYTHING IN THE OFFICIAL FETCH 'BODY' PARAMETER:
      body: JSON.stringify({
        timeout_ms: 15000, 
        request: { 
          url: url, 
          method: 'POST', 
          headers: { 
            'Content-Type': 'text/plain',
          },
          body: logBufferText.trim()
        }
      })
    });

    setTimeout(() => {
      isCopying.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to post terminal logs to the server via request:', err);
    isCopying.value = false;
    throw err;
  }
};

const triggerMobileHistoryUp = () => {
  if (!terminalInstance.value) return;
  
  // Try to safely retrieve the current uncommitted input line from the terminal cache
  // fall back to currentInputCache if it's already midway through navigating history
  let activeText = '';
  
  // If your xterm instance tracks the buffer line, or we use our fallback cache:
  if (historyIndex.value === -1) {
    // If you want to dynamically pull what the user typed before clicking up,
    // we use the local ref cache or fallback to an empty string to avoid clearing it.
    activeText = currentInputCache.value || '';
  }
  
  handleHistoryUp(activeText);
};


</script>

<style>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: #000000 !important;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  overflow: hidden !important;
  overscroll-behavior: none !important;
}
#app {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background-color: #000000 !important;
}
::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #000000;
  box-sizing: border-box;
}
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: #0c0c0c;
  border-bottom: 1px solid #1a1a1a;
  box-sizing: border-box;
  height: 48px;
  flex-shrink: 0;
}
.app-title {
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: -0.01em;
  color: #a3a3a3;
}
.action-bar {
  display: flex;
  gap: 8px;
}
.action-btn {
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.copy-btn {
  background-color: #1c1917;
  color: #d6d3d1;
  border: 1px solid #2e2a24;
}
.copy-btn:active {
  background-color: #26221f;
}
.run-btn {
  background-color: #2563eb;
  color: #ffffff;
}
.run-btn:active {
  background-color: #1d4ed8;
}
.action-btn:disabled {
  background-color: #171717;
  color: #525252;
  border-color: transparent;
  cursor: not-allowed;
}
.console-wrapper {
  flex: 1;
  width: 100%;
  background-color: #000000;
  overflow: hidden;
  box-sizing: border-box;
}

/* -------------------------------------------------------------------------------- */
/* HISTORY BUTTONS */
/* -------------------------------------------------------------------------------- */

.mobile-history-controls {
  display: flex;
  background-color: #171717;
  border: 1px solid #262626;
  border-radius: 6px;
  overflow: hidden;
  height: 28px; /* Slightly shorter than main action buttons to look nested */
}

.history-btn {
  background: transparent;
  border: none;
  color: #a3a3a3;
  font-size: 0.65rem;
  width: 28px;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: background-color 0.15s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.history-btn:first-child {
  border-right: 1px solid #262626;
}

.history-btn:active:not(:disabled) {
  background-color: #262626;
  color: #ffffff;
}

.history-btn:disabled {
  color: #404040;
  cursor: not-allowed;
}

</style>

