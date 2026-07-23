//import { describe, it, expect } from 'vitest';
//import { ODataClient } from '../src/core/client.js';
//import { FetchTransport } from '../src/core/transport.js';
//import { basicAuth } from '../src/sap/auth.js';
//
//const SERVER_URL = 'http://localhost:4004/odata/v4/test';
//
//describe('Direct CAP Server Integration Suite', () => {
//
//  it('Verifies 401 Unauthorized restriction when tokens are missing', async () => {
//    const client = new ODataClient({
//      baseUrl: SERVER_URL,
//      transport: new FetchTransport()
//    });
//
//    // Request missing auth headers should reject with an HTTP 401 status
//    await expect(client.entitySet('Data').list()).rejects.toMatchObject({
//      status: 401
//    });
//  });
//
//  it('Successfully reads data rows from live SQLite using "bob" credentials', async () => {
//    const client = new ODataClient({
//      baseUrl: SERVER_URL,
//      auth: basicAuth('bob', '123'), // Role: authenticated-user
//      transport: new FetchTransport()
//    });
//
//    const result = await client.entitySet('Data').list();
//    expect(result.value).toBeInstanceOf(Array);
//    console.log(`\n✅ Read success: Found ${result.value.length} rows in CAP backend.`);
//  });
//
//  it('Enforces server-level RBAC restrictions (Bob gets a 403 on mutations)', async () => {
//    const client = new ODataClient({
//      baseUrl: SERVER_URL,
//      auth: basicAuth('bob', '123'),
//      transport: new FetchTransport()
//    });
//
//    // Bob only has READ authorization. Creating data should trigger an HTTP 403 Forbidden.
//    await expect(
//      client.entitySet('Data').create({ x: 10, y: 20 })
//    ).rejects.toMatchObject({
//      status: 403
//    });
//  });
//
//  it('Allows mutating modifications under "alice" administrative rights', async () => {
//    const client = new ODataClient({
//      baseUrl: SERVER_URL,
//      auth: basicAuth('alice', '123'), // Role: admin
//      transport: new FetchTransport()
//    });
//
//    const randomX = Math.floor(Math.random() * 5000);
//    const randomY = Math.floor(Math.random() * 5000);
//
//    const created = await client.entitySet('Data').create({ x: randomX, y: randomY });
//    expect(created).toBeDefined();
//    expect(created.x).toBe(randomX);
//
//    console.log(`\n🚀 [INSPECTION NOTICE]: Alice created record with x=${randomX}, y=${randomY} permanently.`);
//  });
//});
//--------------------------------------------------------------------------------
import { describe, it, expect, beforeAll } from 'vitest';
import { ODataClient } from '../src/core/client.js';
import { FetchTransport } from '../src/core/transport.js';
import { basicAuth } from '../src/sap/auth.js';
import { OfflineTransportDecorator } from '../src/core/offlineTransport.js';


const SERVER_URL = 'http://localhost:4004/odata/v4/test';

// Common client instantiation helpers for clean roles separation
const getAdminClient = () => new ODataClient({
  baseUrl: SERVER_URL,
  auth: basicAuth('alice', '123'),
  transport: new FetchTransport()
});

const getUserClient = () => new ODataClient({
  baseUrl: SERVER_URL,
  auth: basicAuth('bob', '123'),
  transport: new FetchTransport()
});

describe('Direct CAP Server Integration Suite', () => {

  // --- CORE SYSTEM REGRESSION PROTECTION TESTS ---
  it('Verifies 401 Unauthorized restriction when tokens are missing', async () => {
    const client = new ODataClient({ baseUrl: SERVER_URL, transport: new FetchTransport() });
    await expect(client.entitySet('Data').list()).rejects.toMatchObject({ status: 401 });
  });

  it('Successfully reads data rows from live SQLite using "bob" credentials', async () => {
    const client = getUserClient();
    const result = await client.entitySet('Data').list();
    expect(result.value).toBeInstanceOf(Array);
  });

  it('Enforces server-level RBAC restrictions (Bob gets a 403 on mutations)', async () => {
    const client = getUserClient();
    await expect(client.entitySet('Data').create({ x: 10, y: 20 })).rejects.toMatchObject({ status: 403 });
  });

  it('Allows mutating modifications under "alice" administrative rights', async () => {
    const client = getAdminClient();
    const randomX = Math.floor(Math.random() * 5000);
    const created = await client.entitySet('Data').create({ x: randomX, y: 111 });
    expect(created.x).toBe(randomX);
  });


  // --- NEW ADVANCED FANCY ODATA QUERY SECTIONS ---

  describe('Fancy Selection, Filtering, and Pagination Operations', () => {
    
    it('Executes complex multi-conditional $filter criteria mappings', async () => {
      const client = getUserClient();

      // Find products that are NOT discontinued AND have a price greater than 200
      const result = await client.entitySet('Products')
        .filter(b => b.and(
          b.eq('IsDiscontinued', false),
          b.gt('Price', 200)
        ))
        .list();

      expect(result.value).toBeInstanceOf(Array);
      expect(result.value.length).toBeGreaterThanOrEqual(1);

      // Verify server-side filter evaluation correctness
      result.value.forEach(product => {
        expect(product.IsDiscontinued).toBe(false);
        expect(Number(product.Price)).toBeGreaterThan(200);
      });
    });

    it('Executes string matching filters using OData v4 contains() function', async () => {
      const client = getUserClient();

      // Look for products containing the string fragment 'Laser' in their Name
      const result = await client.entitySet('Products')
        .filter(b => b.contains('Name', 'Laser'))
        .list();

      expect(result.value).toBeInstanceOf(Array);
      expect(result.value.length).toBeGreaterThanOrEqual(1);
      expect(result.value[0].Name).toContain('Laser');
    });

    it('Leverages withCount(true) to accurately map server-side metadata totals', async () => {
      const client = getUserClient();

      // Fetch a maximum of 2 records but capture total rows passing the filter criteria
      const result = await client.entitySet('Products')
        .top(2)
        .orderby('Price desc')
        .withCount(true)
        .list();

      expect(result.value).toHaveLength(2);
      // Ensures the @odata.count property maps perfectly to your client total parameter
      expect(typeof result.count).toBe('number');
      expect(result.count).toBeGreaterThanOrEqual(4);
      
      // Ensure ordering precedence rules hold true (89500 table seed value must lead)
      expect(Number(result.value[0].Price)).toBeGreaterThan(Number(result.value[1].Price));
    });
  });

  describe('Fancy Relational Graph Expansions ($expand)', () => {

    it('Performs single-level structural composition expansions', async () => {
      const client = getUserClient();

      // Read products and expand their related child orderItems inline
      const result = await client.entitySet('Products')
        .filter(b => b.eq('SKU', 'SKU-SENS-77X'))
        .expand('orderItems')
        .list();

      expect(result.value).toHaveLength(1);
      const product = result.value[0];
      
      // Verify that relational entities are safely extracted and mapped as an array
      expect(product.orderItems).toBeInstanceOf(Array);
      expect(product.orderItems.length).toBeGreaterThanOrEqual(2);
      expect(product.orderItems[0].OrderNumber).toBeDefined();
    });

    it('Builds high-complexity nested $expand blocks with deep parameter sets', async () => {
      const client = getUserClient();

      // Exercise your query builder's deep sub-segment options compilation
      // Items -> Products( expanded with orderItems filtered by dynamic constraints )
      const result = await client.entitySet('Products')
        .expand({
          path: 'orderItems',
          select: ['OrderNumber', 'Quantity'],
          filter: b => b.gt('Quantity', 5),
          orderby: 'Quantity desc'
        })
        .list();

      expect(result.value).toBeInstanceOf(Array);
      
      // Find a product that contains valid orders to check parameter compilation effects
      const sensoryProduct = result.value.find(p => p.SKU === 'SKU-SENS-77X');
      if (sensoryProduct && sensoryProduct.orderItems) {
        sensoryProduct.orderItems.forEach(item => {
          // Fields omitted by select statement parameters should be omitted by CAP server
          expect(item.DeliveryDate).toBeUndefined();
          // Filter threshold parameters must be strictly observed by backend engine records
          expect(item.Quantity).toBeGreaterThan(5);
        });
      }
    });
  });

  describe('Deep Transactional Inserts', () => {
    
    it('Allows administrative roles to create parent-child graphs simultaneously', async () => {
      const client = getAdminClient();
      const uniqueSuffix = Math.floor(Math.random() * 10000);
      
      const newProductPayload = {
        SKU: `SKU-DEEP-${uniqueSuffix}`,
        Name: `Integrated Stepper Motor S-${uniqueSuffix}`,
        Category: 'Motors',
        Price: 480.00,
        StockCount: 20,
        IsDiscontinued: false,
        // Embedded compositional child lines array
        orderItems: [
          {
            OrderNumber: `ORD-DEEP-${uniqueSuffix}`,
            Quantity: 15,
            DeliveryDate: '2026-11-30'
          }
        ]
      };

      // Perform deep insertion query command
      const created = await client.entitySet('Products').create(newProductPayload);
      expect(created.ID).toBeDefined();
      expect(created.SKU).toBe(newProductPayload.SKU);

      // Verify insertion side effects directly against raw backend endpoint mappings
      const verificationClient = getUserClient();
      const verifiedGraph = await verificationClient.entitySet('Products')
        .filter(b => b.eq('SKU', newProductPayload.SKU))
        .expand('orderItems')
        .list();

      expect(verifiedGraph.value).toHaveLength(1);
      expect(verifiedGraph.value[0].orderItems).toHaveLength(1);
      expect(verifiedGraph.value[0].orderItems[0].OrderNumber).toBe(`ORD-DEEP-${uniqueSuffix}`);
      expect(verifiedGraph.value[0].orderItems[0].Quantity).toBe(15);
      
      console.log(`\n🚀 [DEEP INSERT INSPECTION]: Successfully verified relational data graph generation for SKU-DEEP-${uniqueSuffix}`);
    });
  });

  describe('Offline Interception and Synchronisation Replay Simulation', () => {

    it('Executes end-to-end cache tracking, offline trapping, and online sync replay', async () => {
      try {
        const liveTransport = new FetchTransport();
        const offlineDecorator = new OfflineTransportDecorator(liveTransport);

        const adminClient = new ODataClient({
          baseUrl: SERVER_URL,
          auth: basicAuth('alice', '123'),
          transport: offlineDecorator
        });

        // --- STEP A: SIMULATE ONLINE OPERATION (PRIME THE READ CACHE) ---
        offlineDecorator.setOnline(true);
        
        const initialFetch = await adminClient.entitySet('Products').list();
        expect(initialFetch.value).toBeInstanceOf(Array);
        expect(offlineDecorator.cache.size).toBeGreaterThan(0);

        // --- STEP B: SIMULATE OFFLINE TRANSITION (READ CACHE FALLBACK) ---
        offlineDecorator.setOnline(false);

        const cachedFetch = await adminClient.entitySet('Products').list();
        expect(cachedFetch.value.length).toBe(initialFetch.value.length);

        // --- STEP C: OFFLINE MUTATION RECORDING (OUTBOX TRAPPING) ---
        const testX = 9000 + Math.floor(Math.random() * 999);
        const testY = 9999;

        const offlineResult = await adminClient.entitySet('Data').create({ x: testX, y: testY });
        
        expect(offlineResult._offlineQueued).toBe(true);
        expect(offlineDecorator.outbox).toHaveLength(1);
        expect(offlineDecorator.outbox[0].method).toBe('POST');

        // --- STEP D: SIMULATE RECONNECTION & SYNC REPLAY ---
        offlineDecorator.setOnline(true);

        const syncCompleted = await offlineDecorator.synchronizeQueue(adminClient);
        expect(syncCompleted).toBe(true);
        expect(offlineDecorator.outbox).toHaveLength(0); 

        // --- STEP E: LIVE DIRECT DATABASE VERIFICATION ---
        const directVerifyClient = new ODataClient({
          baseUrl: SERVER_URL,
          auth: basicAuth('alice', '123'),
          transport: new FetchTransport() 
        });

        const backendRows = await directVerifyClient.entitySet('Data').filter(b => b.eq('x', testX)).list();
        expect(backendRows.value).toHaveLength(1);
        expect(backendRows.value[0].y).toBe(testY);

        console.log(`\n🎉 [OFFLINE INTEGRATION SUCCESS]: Row x=${testX} processed offline and synced straight to SQLite backend database!`);
      } catch (rawTestError) {
        // Force the raw underlying exception name, error message, and stack trace to print to stderr
        process.stderr.write(`\n❌ [RAW TEST EXCEPTION INTERCEPTED]:\nName: ${rawTestError.name}\nMessage: ${rawTestError.message}\nStack: ${rawTestError.stack}\n`);
        if (rawTestError.body) process.stderr.write(`Body: ${rawTestError.body}\n`);
        if (rawTestError.endpoint) process.stderr.write(`Endpoint: ${rawTestError.endpoint}\n`);
        throw rawTestError;
      }
    });
  });


});

