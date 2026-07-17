<template>
  <h1 class="page-title">Get workflow items</h1>
  <p class="page-sub">
    Exercises <code>count()</code>, <code>count($filter)</code>, and
    <code>first()</code> against the <code>WorkflowItems</code> entity set.
  </p>

  <section class="card">
    <h2>Summary</h2>
    <p class="lead">Total items and counts by status, fetched via <code>GET WorkflowItems/$count</code>.</p>

    <div v-if="loading" class="status">Loading…</div>
    <div v-else-if="error" class="status error">{{ error }}</div>
    <template v-else>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ total ?? '—' }}</div>
        </div>
        <div class="stat" v-for="s in statuses" :key="s">
          <div class="stat-label">{{ s }}</div>
          <div class="stat-value">{{ byStatus[s] ?? '—' }}</div>
        </div>
      </div>
      <div class="url-box" style="margin-top:14px">
        <strong>Requests:</strong>
        <div v-for="r in requests" :key="r" class="tiny">{{ r }}</div>
      </div>
    </template>
  </section>

  <section class="card">
    <h2>First item ($top=1)</h2>
    <p class="lead">Fetches the first item via <code>entitySet.first()</code>.</p>
    <div v-if="firstLoading" class="status">Loading…</div>
    <div v-else-if="firstError" class="status error">{{ firstError }}</div>
    <div v-else-if="first" class="item-detail">
      <div><span class="muted tiny">ID</span> {{ first.ID }}</div>
      <div><span class="muted tiny">Title</span> {{ first.Title }}</div>
      <div>
        <span class="muted tiny">Status</span>
        <span class="pill" :class="statusClass(first.Status)">{{ first.Status }}</span>
      </div>
      <div><span class="muted tiny">Assignee</span> {{ first.Assignee }}</div>
      <div><span class="muted tiny">Priority</span>
        <span class="pill" :class="priorityClass(first.Priority)">{{ first.Priority }}</span>
      </div>
      <div><span class="muted tiny">Due</span> {{ first.DueDate }}</div>
    </div>
    <div v-else class="status muted">No items.</div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from '../odataMock.js';

const transport = new MockTransport();
const client = new ODataClient({ baseUrl: 'https://mock', version: 'v4', transport });

const STATUSES = ['Open', 'InProgress', 'Pending', 'Done'];
const statuses = STATUSES;

const total = ref(null);
const byStatus = ref({});
const loading = ref(true);
const error = ref('');
const requests = ref([]);

const first = ref(null);
const firstLoading = ref(true);
const firstError = ref('');

async function load() {
  loading.value = true;
  firstLoading.value = true;
  error.value = '';
  firstError.value = '';
  try {
    const t = await client.entitySet('WorkflowItems').count();
    total.value = t;
    requests.value.push('GET WorkflowItems/$count');

    const counts = {};
    for (const s of STATUSES) {
      counts[s] = await client.entitySet('WorkflowItems')
        .filter(b => b.eq('Status', s))
        .count();
      requests.value.push(`GET WorkflowItems/$count?$filter=Status eq '${s}'`);
    }
    byStatus.value = counts;
  } catch (e) {
    error.value = `${e.name}: ${e.message}`;
  } finally {
    loading.value = false;
  }

  try {
    first.value = await client.entitySet('WorkflowItems').first();
    requests.value.push('GET WorkflowItems?$top=1');
  } catch (e) {
    firstError.value = `${e.name}: ${e.message}`;
  } finally {
    firstLoading.value = false;
  }
}

function statusClass(s) {
  return 'pill-' + (s || '').toLowerCase().replace(/\s+/g, '');
}
function priorityClass(p) {
  return 'pill-' + (p || '').toLowerCase();
}

onMounted(load);
</script>

<style scoped>
.page-title { margin: 0 0 6px; font-size: 22px; }
.page-sub { margin: 0 0 20px; color: var(--text-dim); }
.page-sub code, .lead code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
.item-detail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  font-size: 14px;
}
.item-detail > div { display: flex; align-items: center; gap: 8px; }
.muted { color: var(--text-dim); }
</style>
