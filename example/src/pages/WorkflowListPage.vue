<template>
  <h1 class="page-title">List workflow items</h1>
  <p class="page-sub">
    Filtered, ordered <code>list()</code> with inline
    <code>callAction(id, 'Submit')</code> on each row.
  </p>

  <section class="card">
    <div class="controls">
      <label>
        $filter
        <select v-model="filterPreset">
          <option value="">(none)</option>
          <option value="open">Status eq 'Open'</option>
          <option value="notDone">Status ne 'Done'</option>
          <option value="high">Priority eq 'High'</option>
          <option value="openHigh">Status eq 'Open' and Priority eq 'High'</option>
        </select>
      </label>
      <label>
        $orderby
        <select v-model="orderby">
          <option value="DueDate asc">DueDate asc</option>
          <option value="DueDate desc">DueDate desc</option>
          <option value="Priority desc">Priority desc</option>
          <option value="Title asc">Title asc</option>
        </select>
      </label>
      <label>
        $top
        <input type="number" v-model.number="top" min="1" max="50" />
      </label>
      <button @click="load">Run query</button>
    </div>

    <div class="url-box">
      <strong>Built request:</strong>
      <code>{{ lastUrl || '—' }}</code>
    </div>

    <div v-if="loading" class="status">Loading…</div>
    <div v-else-if="error" class="status error">{{ error }}</div>
    <template v-else>
      <div class="meta">{{ result?.value?.length ?? 0 }} rows · total matching: {{ result?.count ?? '—' }}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Title</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result?.value || []" :key="row.ID">
              <td>{{ row.ID }}</td>
              <td>{{ row.Title }}</td>
              <td>{{ row.Assignee }}</td>
              <td><span class="pill" :class="statusClass(row.Status)">{{ row.Status }}</span></td>
              <td><span class="pill" :class="priorityClass(row.Priority)">{{ row.Priority }}</span></td>
              <td>{{ row.DueDate }}</td>
              <td>
                <button
                  class="success tiny-btn"
                  :disabled="row.Status === 'Done' || submittingId === row.ID"
                  @click="submit(row.ID)"
                >
                  {{ submittingId === row.ID ? '…' : 'Submit' }}
                </button>
              </td>
            </tr>
            <tr v-if="!result?.value?.length">
              <td colspan="7" class="muted">No items match.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="submitMsg" class="status" :class="{ success: submitOk, error: !submitOk }">{{ submitMsg }}</div>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from '../odataMock.js';

const transport = new MockTransport();
const client = new ODataClient({ baseUrl: 'https://mock', version: 'v4', transport });

const filterPreset = ref('open');
const orderby = ref('DueDate asc');
const top = ref(20);
const result = ref(null);
const loading = ref(false);
const error = ref('');
const lastUrl = ref('');

const presets = {
  open: (f) => f.eq('Status', 'Open'),
  notDone: (f) => f.ne('Status', 'Done'),
  high: (f) => f.eq('Priority', 'High'),
  openHigh: (f) => f.and(f.eq('Status', 'Open'), f.eq('Priority', 'High')),
};

async function load() {
  loading.value = true;
  error.value = '';
  lastUrl.value = '';
  try {
    const q = client.entitySet('WorkflowItems');
    if (filterPreset.value) q.filter(presets[filterPreset.value]);
    const [field, dir] = orderby.value.split(' ');
    q.orderby({ field, desc: dir === 'desc' });
    q.top(top.value);
    result.value = await q.withCount(true).list();
    const lr = transport.lastRequest?.query || {};
    lastUrl.value = 'GET WorkflowItems' +
      (lr.$filter ? `?$filter=${lr.$filter}` : '') +
      (lr.$orderby ? `&$orderby=${lr.$orderby}` : '') +
      (lr.$top ? `&$top=${lr.$top}` : '');
  } catch (e) {
    error.value = `${e.name}: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

const submittingId = ref(null);
const submitMsg = ref('');
const submitOk = ref(false);
async function submit(id) {
  submittingId.value = id;
  submitMsg.value = '';
  try {
    const updated = await client.entitySet('WorkflowItems').callAction(id, 'Submit', {});
    submitOk.value = true;
    submitMsg.value = `Submitted item ${updated.ID}: status set to ${updated.Status}.`;
    await load();
  } catch (e) {
    submitOk.value = false;
    submitMsg.value = `Error: ${e.message}`;
  } finally {
    submittingId.value = null;
  }
}

function statusClass(s) { return 'pill-' + (s || '').toLowerCase(); }
function priorityClass(p) { return 'pill-' + (p || '').toLowerCase(); }

onMounted(load);
</script>

<style scoped>
.page-title { margin: 0 0 6px; font-size: 22px; }
.page-sub { margin: 0 0 20px; color: var(--text-dim); }
.page-sub code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
.tiny-btn { padding: 5px 10px; font-size: 12px; }
.muted { color: var(--text-dim); }
</style>
