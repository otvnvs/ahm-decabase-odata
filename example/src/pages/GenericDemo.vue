<template>
  <h1 class="page-title">Generic OData demo</h1>
  <p class="page-sub">
    Exercise the core API against an in-memory <code>Books</code> entity set via
    the <code>MockTransport</code>.
  </p>

  <section class="card">
    <h2>ODataClient setup</h2>
    <pre>{{ clientSetup }}</pre>
    <p class="note">
      The <code>MockTransport</code> implements the library's transport contract.
      Swap it for <code>new FetchTransport()</code> and set a real
      <code>baseUrl</code> to talk to a live OData service.
    </p>
  </section>

  <section class="card">
    <h2>Query the Books entity set</h2>
    <div class="controls">
      <label>
        $filter
        <select v-model="filterPreset">
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
      <div class="table-wrap">
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
    </div>
  </section>

  <section class="card">
    <h2>Count ($count)</h2>
    <button @click="runCount">GET Books/$count</button>
    <div v-if="countValue !== null" class="status">
      Raw count: <strong>{{ countValue }}</strong>
    </div>
  </section>

  <section class="card">
    <h2>Create a Book (POST)</h2>
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
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from '../odataMock.js';

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
    result.value = await q.withCount(true).list();
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

const countValue = ref(null);
async function runCount() {
  countValue.value = null;
  try {
    countValue.value = await client.entitySet('Books').count();
  } catch (e) {
    countValue.value = `Error: ${e.message}`;
  }
}

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

<style scoped>
.page-title { margin: 0 0 6px; font-size: 22px; }
.page-sub { margin: 0 0 20px; color: var(--text-dim); }
.page-sub code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
</style>
