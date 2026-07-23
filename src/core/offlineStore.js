/**
 * Lightweight, dependency-free IndexedDB wrapper to manage
 * the OData read-cache maps and mutation request outbox queues.
 * Includes a seamless in-memory fallback if browser storage is unavailable.
 */
export class OfflineIndexedDB {
  constructor(dbName = 'ahm_odata_offline_db', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this._db = null;
    
    // Polyfill fallback if running in a strict environment without a global indexedDB instance
    this.isFallback = typeof indexedDB === 'undefined';
    if (this.isFallback) {
      this._fallbackCache = new Map();
      this._fallbackOutbox = [];
      this._fallbackIdCounter = 1;
    }
  }

  _getDB() {
    if (this.isFallback) return Promise.resolve(null);
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('outbox')) {
            db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache', { keyPath: 'url' });
          }
        };

        request.onsuccess = (event) => {
          this._db = event.target.result;
          resolve(this._db);
        };

        request.onerror = (event) => reject(event.target.error);
      } catch (err) {
        // Gracefully drop back to runtime memory maps if open permissions fail
        this.isFallback = true;
        this._fallbackCache = new Map();
        this._fallbackOutbox = [];
        this._fallbackIdCounter = 1;
        resolve(null);
      }
    });
  }

  async getOutbox() {
    await this._getDB();
    if (this.isFallback) return [...this._fallbackOutbox];
    
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('outbox', 'readonly');
      const store = tx.objectStore('outbox');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async pushToOutbox(entry) {
    await this._getDB();
    if (this.isFallback) {
      const id = this._fallbackIdCounter++;
      this._fallbackOutbox.push({ id, ...entry, timestamp: Date.now() });
      return id;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      const request = store.add({
        url: entry.url,
        method: entry.method,
        body: entry.body,
        timestamp: Date.now(),
        entitySet: entry.entitySet
      });
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeFromOutbox(id) {
    await this._getDB();
    if (this.isFallback) {
      this._fallbackOutbox = this._fallbackOutbox.filter(x => x.id !== id);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCache(url) {
    await this._getDB();
    if (this.isFallback) return this._fallbackCache.get(url) || null;

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result?.data ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async setCache(url, data) {
    await this._getDB();
    if (this.isFallback) {
      this._fallbackCache.set(url, data);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      store.put({ url, data, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll() {
    await this._getDB();
    if (this.isFallback) {
      this._fallbackCache.clear();
      this._fallbackOutbox = [];
      return;
    }

    const stores = ['outbox', 'cache'];
    const tx = this._db.transaction(stores, 'readwrite');
    stores.forEach(s => tx.objectStore(s).clear());
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }
}

