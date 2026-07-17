<template>
  <div class="app">
    <header>
      <h1>ahm-decabase-odata — Demo</h1>
      <p class="subtitle">
        Interactive demonstration of
        <code>@otvnvs/ahm-decabase-odata</code> against an in-memory OData v4
        mock transport. No backend required.
      </p>
    </header>

    <section class="card">
      <h2>1. ODataClient setup</h2>
      <pre>{{ clientSetup }}</pre>
      <p class="note">
        The <code>MockTransport</code> implements the library's transport contract.
        Swap it for <code>new FetchTransport()</code> and set a real
        <code>baseUrl</code> to talk to a live OData service.
      </p>
    </section>

    <section class="card">
      <h2>2. Query the Books entity set</h2>
      <div class="controls">
        <label>
          $filter
          <select v-model="filterPreset" @change="applyFilterPreset">
            <option value="">(none)</option>
            <option value="stock0">Stock eq 0</option>
            <option value="technical">Genre eq 'Technical'</option>
            <option value="fantasy">Genre eq 'Fantasy'</option>
            <option value="contains">contains(Title,'od')</option>
            <option value="oosTechnical">Stock eq 0 and Genre eq 'Technical'</option>
          </select>
        </label>
        <label>
          $orderby
          <select v-model="orderby">
            <option value="Title asc">Title asc</option>
            <option value="Title desc">Title desc</option>
            <option value="Price desc">Price desc</option>
            <option value="Stock desc">Stock desc</option>
          </select>
        </label>
        <label>
          $top
          <input type="number" v-model.number="top" min="1" max="20" />
        </label>
        <label>
          $select
          <input type="text" v-model="selectFields" placeholder="ID,Title,Author,Stock" />
        </label>
        <button @click="runQuery">Run query</button>
      </div>

      <div class="url-box">
        <strong>Built request:</strong>
        <code>{{ lastUrl || '—' }}</code>
      </div>

      <div v-if="loading" class="status">Loading…</div>
      <div v-else-if="error" class="status error">{{ error }}</div>
      <div v-else class="results">
        <div class="meta">
          {{ result?.value?.length ?? 0 }} rows returned · total matching:
          {{ result?.count ?? '—' }}
        </div>
        <table>
          <thead>
            <tr>
              <th v-for="col in columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result?.value || []" :key="row.ID">
              <td v-for="col in columns" :key="col">{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>3. Count ($count)</h2>
      <button @click="runCount">GET Books/$count</button>
      <div v-if="countValue !== null" class="status">
        Raw count: <strong>{{ countValue }}</strong>
      </div>
    </section>

    <section class="card">
      <h2>4. Create a Book (POST)</h2>
      <div class="controls form">
        <label>Title <input v-model="newBook.Title" /></label>
        <label>Author <input v-model="newBook.Author" /></label>
        <label>Genre
          <select v-model="newBook.Genre">
            <option>Technical</option>
            <option>Fantasy</option>
            <option>Sci-Fi</option>
          </select>
        </label>
        <label>Stock <input type="number" v-model.number="newBook.Stock" /></label>
        <label>Price <input type="number" step="0.1" v-model.number="newBook.Price" /></label>
        <button @click="createBook" :disabled="creating">
          {{ creating ? 'Creating…' : 'Create' }}
        </button>
      </div>
      <div v-if="createdMsg" class="status">{{ createdMsg }}</div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from './odataMock.js';

const transport = new MockTransport();
const client = new ODataClient({
  baseUrl: 'https://mock',
  version: 'v4',
  transport,
});

const clientSetup = computed(() =>
  `import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from './odataMock.js';

const client = new ODataClient({
  baseUrl: 'https://mock',
  version: 'v4',
  transport: new MockTransport(),
});`
);

// query state
const filterPreset = ref('');
const orderby = ref('Title asc');
const top = ref(10);
const selectFields = ref('');
const result = ref(null);
const loading = ref(false);
const error = ref('');
const lastUrl = ref('');

const filterPresets = {
  stock0: (f) => f.eq('Stock', 0),
  technical: (f) => f.eq('Genre', 'Technical'),
  fantasy: (f) => f.eq('Genre', 'Fantasy'),
  contains: (f) => f.contains('Title', 'od'),
  oosTechnical: (f) => f.and(f.eq('Stock', 0), f.eq('Genre', 'Technical')),
};

function applyFilterPreset() { /* v-model already updated filterPreset */ }

async function runQuery() {
  loading.value = true;
  error.value = '';
  lastUrl.value = '';
  try {
    const q = client.entitySet('Books');
    if (filterPreset.value) q.filter(filterPresets[filterPreset.value]);
    const [field, dir] = orderby.value.split(' ');
    q.orderby({ field, desc: dir === 'desc' });
    q.top(top.value);
    if (selectFields.value.trim()) q.select(...selectFields.value.split(',').map(s => s.trim()));
    result.value = await q.list();
    lastUrl.value = transport.lastRequest
      ? `${transport.lastRequest.method} Books` +
        (transport.lastRequest.query.$filter ? `?$filter=${transport.lastRequest.query.$filter}` : '') +
        (transport.lastRequest.query.$orderby ? `&$orderby=${transport.lastRequest.query.$orderby}` : '') +
        (transport.lastRequest.query.$top ? `&$top=${transport.lastRequest.query.$top}` : '') +
        (transport.lastRequest.query.$select ? `&$select=${transport.lastRequest.query.$select}` : '')
      : '';
  } catch (e) {
    error.value = `${e.name}: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

const columns = computed(() => {
  if (!result.value?.value?.length) return [];
  return Object.keys(result.value.value[0]);
});

// count
const countValue = ref(null);
async function runCount() {
  countValue.value = null;
  try {
    countValue.value = await client.entitySet('Books').count();
  } catch (e) {
    countValue.value = `Error: ${e.message}`;
  }
}

// create
const newBook = reactive({ Title: '', Author: '', Genre: 'Technical', Stock: 1, Price: 19.99 });
const creating = ref(false);
const createdMsg = ref('');
async function createBook() {
  creating.value = true;
  createdMsg.value = '';
  try {
    const created = await client.entitySet('Books').create({ ...newBook });
    createdMsg.value = `Created Book ID ${created.ID} (now ${transport.data.length} total)`;
    newBook.Title = '';
    newBook.Author = '';
    await runQuery();
  } catch (e) {
    createdMsg.value = `Error: ${e.message}`;
  } finally {
    creating.value = false;
  }
}

onMounted(runQuery);
</script>

<style>
body { margin: 0; background: #f6f7f9; font-family: system-ui, sans-serif; color: #1f2328; }
.app { max-width: 920px; margin: 0 auto; padding: 24px 16px 64px; }
header h1 { margin: 0 0 4px; font-size: 24px; }
.subtitle { margin: 0 0 24px; color: #57606a; font-size: 14px; }
.subtitle code { background: #eaeef2; padding: 1px 5px; border-radius: 4px; }
.card { background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 18px 20px; margin-bottom: 18px; }
.card h2 { margin: 0 0 12px; font-size: 16px; }
.card pre { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 12px; margin: 0 0 10px; font-size: 12px; overflow-x: auto; }
.note { margin: 0; color: #57606a; font-size: 13px; }
.note code { background: #eaeef2; padding: 1px 5px; border-radius: 4px; }
.controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
.controls.form label { display: flex; flex-direction: column; font-size: 12px; gap: 3px; }
.controls label { font-size: 12px; color: #57606a; }
.controls input, .controls select { padding: 5px 8px; border: 1px solid #d0d7de; border-radius: 5px; font-size: 13px; }
.controls input[type="number"] { width: 70px; }
button { padding: 6px 14px; background: #1f6feb; color: #fff; border: none; border-radius: 5px; font-size: 13px; cursor: pointer; }
button:disabled { opacity: 0.6; cursor: default; }
button:hover:not(:disabled) { background: #1a5fc2; }
.url-box { background: #1f2328; color: #79c0ff; padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; word-break: break-all; }
.url-box strong { color: #d2a8ff; }
.status { font-size: 14px; padding: 8px 0; }
.status.error { color: #cf222e; }
.results .meta { font-size: 13px; color: #57606a; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eaeef2; }
th { background: #f6f8fa; font-weight: 600; position: sticky; top: 0; }
td { font-variant-numeric: tabular-nums; }
</style>
