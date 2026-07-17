<template>
  <h1 class="page-title">Submit a workflow item</h1>
  <p class="page-sub">
    Creates a <code>WorkflowItems</code> entity via <code>create()</code> (POST),
    then invokes the bound action <code>callAction(id, 'Submit')</code> on it.
  </p>

  <section class="card">
    <h2>Create + Submit</h2>
    <p class="lead">
      Two calls happen in sequence:
      <code>POST /WorkflowItems</code> returns the new entity, then
      <code>POST /WorkflowItems(ID)/Submit</code> flips its status to <em>Done</em>.
    </p>

    <form class="controls form" @submit.prevent="submit">
      <label>
        Title
        <input v-model="form.Title" placeholder="Approve purchase order …" required />
      </label>
      <label>
        Assignee
        <input v-model="form.Assignee" placeholder="A. Mokoena" required />
      </label>
      <label>
        Status
        <select v-model="form.Status">
          <option>Open</option>
          <option>InProgress</option>
          <option>Pending</option>
        </select>
      </label>
      <label>
        Priority
        <select v-model="form.Priority">
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </label>
      <label>
        Due date
        <input type="date" v-model="form.DueDate" required />
      </label>
      <button type="submit" :disabled="busy">
        {{ busy ? 'Working…' : 'Create &amp; submit' }}
      </button>
    </form>

    <div v-if="requests.length" class="url-box">
      <strong>Requests issued:</strong>
      <div v-for="r in requests" :key="r" class="tiny">{{ r }}</div>
    </div>

    <div v-if="error" class="banner error">{{ error }}</div>
    <div v-else-if="created" class="banner success">
      Created item <strong>#{{ created.ID }}</strong> and submitted it — status is now
      <span class="pill pill-done">Done</span>.
    </div>

    <div v-if="created" class="item-detail">
      <div><span class="muted tiny">ID</span> {{ created.ID }}</div>
      <div><span class="muted tiny">Title</span> {{ created.Title }}</div>
      <div><span class="muted tiny">Assignee</span> {{ created.Assignee }}</div>
      <div>
        <span class="muted tiny">Status</span>
        <span class="pill" :class="statusClass(submitted?.Status ?? created.Status)">
          {{ submitted?.Status ?? created.Status }}
        </span>
      </div>
      <div>
        <span class="muted tiny">Priority</span>
        <span class="pill" :class="priorityClass(created.Priority)">{{ created.Priority }}</span>
      </div>
      <div><span class="muted tiny">Due</span> {{ created.DueDate }}</div>
    </div>

    <pre v-if="created">{{ jsonResult }}</pre>
  </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ODataClient } from '@otvnvs/ahm-decabase-odata';
import { MockTransport } from '../odataMock.js';

const transport = new MockTransport();
const client = new ODataClient({ baseUrl: 'https://mock', version: 'v4', transport });

const today = new Date().toISOString().slice(0, 10);
const form = reactive({
  Title: 'Approve purchase order 4500000099',
  Assignee: 'A. Mokoena',
  Status: 'Open',
  Priority: 'High',
  DueDate: today,
});

const busy = ref(false);
const error = ref('');
const created = ref(null);
const submitted = ref(null);
const requests = ref([]);

const jsonResult = computed(() =>
  JSON.stringify({ created: created.value, afterSubmit: submitted.value }, null, 2),
);

async function submit() {
  busy.value = true;
  error.value = '';
  created.value = null;
  submitted.value = null;
  requests.value = [];
  try {
    const createdItem = await client.entitySet('WorkflowItems').create({ ...form });
    created.value = createdItem;
    requests.value.push(`POST /WorkflowItems -> 201 (ID ${createdItem.ID})`);

    const result = await client.entitySet('WorkflowItems').callAction(createdItem.ID, 'Submit', {});
    submitted.value = result;
    requests.value.push(`POST /WorkflowItems(${createdItem.ID})/Submit -> 200`);
  } catch (e) {
    error.value = `${e.name}: ${e.message}`;
  } finally {
    busy.value = false;
  }
}

function statusClass(s) { return 'pill-' + (s || '').toLowerCase().replace(/\s+/g, ''); }
function priorityClass(p) { return 'pill-' + (p || '').toLowerCase(); }
</script>

<style scoped>
.page-title { margin: 0 0 6px; font-size: 22px; }
.page-sub { margin: 0 0 20px; color: var(--text-dim); }
.page-sub code, .lead code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
.controls.form { align-items: flex-end; }
.controls.form label { flex: 1 1 180px; }
.controls.form input, .controls.form select { width: 100%; }
.item-detail {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  font-size: 14px;
  margin-top: 6px;
}
.item-detail > div { display: flex; align-items: center; gap: 8px; }
.muted { color: var(--text-dim); }
</style>
