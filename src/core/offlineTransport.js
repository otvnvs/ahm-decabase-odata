import { toPlainHeaders } from './transport.js';

function debugLog(phase, details) {
  process.stderr.write(`\n🔍 [OFFLINE DIAGNOSTIC] [${phase}] ${JSON.stringify(details, null, 2)}\n`);
}

function cleanUrlPath(urlStr) {
  if (!urlStr) return '';
  const str = String(urlStr);
  const idx = str.indexOf('?');
  return idx === -1 ? str : str.substring(0, idx);
}

// Formal wrapper structure to prevent the client engine from hitting prototype getter validation issues
function createClientCompatibleResponse(status, textBody) {
  const isOk = status >= 200 && status < 300;
  return {
    status: status,
    get ok() { return isOk; }, // Implemented as a getter matching native Response patterns
    statusText: isOk ? 'OK' : 'Error',
    headers: {
      get: (n) => n.toLowerCase() === 'content-type' ? 'application/json' : null
    },
    json: async () => JSON.parse(textBody),
    text: async () => textBody
  };
}

export class OfflineTransportDecorator {
  constructor(innerTransport) {
    this.innerTransport = innerTransport;
    this._isOnline = true;
    this.outbox = [];
    this.cache = new Map();
  }

  setOnline(status) {
    this._isOnline = !!status;
    debugLog('STATE_CHANGE', { isOnline: this._isOnline });
  }

  async request(config) {
    const method = (config.method || 'GET').toUpperCase();

    try {
      // --- READ PIPELINE (GET / HEAD) ---
      if (method === 'GET' || method === 'HEAD') {
        debugLog('INTERCEPT_READ_TRIGGER', { method, url: config.url, isOnline: this._isOnline });
        
        if (this._isOnline) {
          debugLog('READ_LIVE_ROUTING_START', { url: config.url });
          const response = await this.innerTransport.request(config);
          debugLog('READ_LIVE_ROUTING_END', { url: config.url, status: response.status, ok: response.ok });
          
          if (response.ok && config.url && !config.url.includes('$metadata')) {
            const rawText = await response.text();
            const plainUrlKey = cleanUrlPath(config.url);
            
            debugLog('CACHE_WRITE_SAVE', { originalUrl: config.url, calculatedKey: plainUrlKey });
            this.cache.set(plainUrlKey, rawText);
            
            return createClientCompatibleResponse(response.status, rawText);
          }
          return response;
        } else {
          // --- OFFLINE READ FALLBACK ---
          const lookupKey = cleanUrlPath(config.url);
          const cachedData = this.cache.get(lookupKey);
          
          debugLog('CACHE_LOOKUP_OFFLINE', { requestedUrl: config.url, matchedKey: lookupKey, hit: cachedData !== undefined });
          
          if (cachedData !== undefined) {
            return createClientCompatibleResponse(200, cachedData);
          }
          throw new Error(`Offline Error: No cache entry found for key: ${lookupKey}`);
        }
      }

      // --- MUTATION PIPELINE (POST / PATCH / PUT / DELETE) ---
      if (!this._isOnline) {
        const plainHeaders = toPlainHeaders(config.headers);
        debugLog('INTERCEPT_MUTATION_OFFLINE', { method, url: config.url, headers: plainHeaders });

        this.outbox.push({
          url: config.url,
          method,
          body: config.body, 
          headers: plainHeaders
        });

        return createClientCompatibleResponse(202, JSON.stringify({ _offlineQueued: true }));
      }

      debugLog('INTERCEPT_MUTATION_ONLINE', { method, url: config.url });
      return this.innerTransport.request(config);

    } catch (fatalInterceptionError) {
      debugLog('CRITICAL_DECORATOR_CRASH', {
        method,
        url: config.url,
        errorMessage: fatalInterceptionError.message
      });
      throw fatalInterceptionError;
    }
  }

  async synchronizeQueue(activeClientInstance = null) {
    debugLog('SYNC_START', { outboxLength: this.outbox.length });
    if (this.outbox.length === 0) return true;

    const pendingItems = [...this.outbox];
    this.outbox = [];

    for (const item of pendingItems) {
      try {
        const nativeHeadersInstance = new Headers();
        if (item.headers) {
          for (const [key, val] of Object.entries(item.headers)) {
            nativeHeadersInstance.set(key, val);
          }
        }

        if (activeClientInstance && activeClientInstance.config && activeClientInstance.config.auth) {
          const auth = activeClientInstance.config.auth;
          if (auth.type === 'basic' && auth.username != null) {
            const encoded = btoa(`${auth.username}:${auth.password || ''}`);
            nativeHeadersInstance.set('authorization', `Basic ${encoded}`);
          }
        }

        const cleanUrl = cleanUrlPath(item.url);

        const requestConfig = {
          url: cleanUrl,
          method: item.method,
          body: item.body, 
          headers: nativeHeadersInstance 
        };

        debugLog('REPLAY_REQUEST_DISPATCH', {
          url: requestConfig.url,
          method: requestConfig.method,
          headers: toPlainHeaders(requestConfig.headers),
          body: requestConfig.body
        });

        const rawResponse = await this.innerTransport.request(requestConfig);
        const status = rawResponse.status ?? 200;
        const ok = status >= 200 && status < 300;

        debugLog('REPLAY_REQUEST_RESPONSE', { status, ok });

        if (!ok) {
          this.outbox.unshift(item, ...pendingItems.slice(pendingItems.indexOf(item) + 1));
          return false;
        }
      } catch (err) {
        debugLog('REPLAY_FATAL_EXCEPTION', { error: err.message, stack: err.stack });
        this.outbox.unshift(item, ...pendingItems.slice(pendingItems.indexOf(item) + 1));
        return false;
      }
    }

    debugLog('SYNC_COMPLETE', { success: true });
    return true;
  }
}

