import { OfflineIndexedDB } from './offlineStore.js';

export class OfflineTransportDecorator {
  constructor(innerTransport, options = {}) {
    this.innerTransport = innerTransport;
    this.db = options.db || new OfflineIndexedDB();
    this.isOnlineOverride = options.isOnlineOverride ?? null;
    this.onSyncSuccess = options.onSyncSuccess || (() => {});
    this.onSyncError = options.onSyncError || (() => {});
  }

  get isOnline() {
    if (this.isOnlineOverride !== null) {
      return typeof this.isOnlineOverride === 'function' 
        ? this.isOnlineOverride() 
        : this.isOnlineOverride;
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  async request(config) {
    const method = (config.method || 'GET').toUpperCase();

    if (method === 'GET' || method === 'HEAD') {
      if (this.isOnline) {
        try {
          const response = await this.innerTransport.request(config);
          if (response.ok && config.url && !config.url.includes('$metadata')) {
            const rawText = await response.text();
            await this.db.setCache(config.url, rawText);
            return {
              ...response,
              text: async () => rawText,
              json: async () => JSON.parse(rawText)
            };
          }
          return response;
        } catch (error) {
          return this._serveFromCache(config.url, error);
        }
      } else {
        return this._serveFromCache(config.url);
      }
    }

    if (!this.isOnline) {
      const entitySet = this._extractEntitySet(config.url);
      const outboxId = await this.db.pushToOutbox({
        url: config.url,
        method,
        body: config.body,
        entitySet
      });

      return {
        status: 202,
        ok: true,
        statusText: 'Accepted (Offline Queued)',
        headers: { get: () => null },
        json: async () => ({ id: outboxId, _offlineQueued: true }),
        text: async () => JSON.stringify({ id: outboxId, _offlineQueued: true })
      };
    }

    return this.innerTransport.request(config);
  }

  async _serveFromCache(url, originalError = null) {
    const cachedData = await this.db.getCache(url);
    if (cachedData !== null) {
      return {
        status: 200,
        ok: true,
        statusText: 'OK (Cached Copy)',
        headers: { get: (n) => n.toLowerCase() === 'content-type' ? 'application/json' : null },
        json: async () => JSON.parse(cachedData),
        text: async () => cachedData
      };
    }
    throw originalError || new Error(`Offline: No cached data found for URI tracking line (${url})`);
  }

  _extractEntitySet(urlStr) {
    try {
      const urlObj = urlStr.split('?')[0];
      const parts = urlObj.split('/');
      return parts[parts.length - 1] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

//  async synchronizeQueue(activeClientInstance = null) {
//    const queue = await this.db.getOutbox();
//    if (queue.length === 0) return true;
//
//    let totalSuccess = true;
//
//    for (const item of queue) {
//      try {
//        const config = {
//          url: item.url,
//          method: item.method,
//          body: item.body,
//          headers: new Headers()
//        };
//
//        if (activeClientInstance && typeof activeClientInstance._applyAuth === 'function') {
//          activeClientInstance._applyAuth(config.headers);
//          activeClientInstance._applyDefaultHeaders(config.headers, item.method, item.url);
//          
//          if (typeof activeClientInstance._beforeRequest === 'function') {
//            const wrappedReqConfig = { url: item.url, method: item.method, headers: config.headers, body: item.body };
//            await activeClientInstance._beforeRequest(wrappedReqConfig);
//          }
//        }
//
//        const res = await this.innerTransport.request(config);
//
//        if (res.ok) {
//          await this.db.removeFromOutbox(item.id);
//          this.onSyncSuccess(item);
//        } else {
//          totalSuccess = false;
//          this.onSyncError(item, new Error(`HTTP Error Status: ${res.status}`));
//        }
//      } catch (err) {
//        totalSuccess = false;
//        this.onSyncError(item, err);
//      }
//    }
//
//    return totalSuccess;
//  }
// src/core/offlineTransport.js

  async synchronizeQueue(activeClientInstance = null) {
    const queue = await this.db.getOutbox();
    if (queue.length === 0) return true;

    let totalSuccess = true;

    for (const item of queue) {
      try {
        let response;
        
        if (activeClientInstance && typeof activeClientInstance.request === 'function') {
          // Play back the request through the client instance to capture all OData formatting rules
          response = await activeClientInstance.request(item.url, {
            method: item.method,
            body: item.body
          });
        } else {
          // Fall back to direct transport if no client context is supplied
          response = await this.innerTransport.request({
            url: item.url,
            method: item.method,
            body: item.body
          });
        }

        if (response && response.ok) {
          await this.db.removeFromOutbox(item.id);
          this.onSyncSuccess(item);
        } else {
          totalSuccess = false;
          this.onSyncError(item, new Error(`HTTP Error Status: ${response?.status ?? 'Unknown'}`));
        }
      } catch (err) {
        totalSuccess = false;
        this.onSyncError(item, err);
      }
    }

    return totalSuccess;
  }

}

