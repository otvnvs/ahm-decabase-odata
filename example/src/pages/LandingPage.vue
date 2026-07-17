<template>
  <div class="hero">
    <DecabaseLogo :size="72" class="hero-logo" />
    <h1>ahm-decabase-odata</h1>
    <p class="hero-sub">
      A framework-agnostic OData v4/v2 client library. These demos exercise the
      real API against an in-memory mock transport — no backend required.
    </p>
    <pre class="hero-code">{{ snippet }}</pre>
  </div>

  <div class="tile-grid">
    <RouterLink to="/generic" class="tile">
      <div class="tile-icon">◇</div>
      <div class="tile-title">Generic OData demo</div>
      <div class="tile-desc">
        Query a Books entity set with <code>$filter</code>, <code>$orderby</code>,
        <code>$top</code>, <code>$select</code>, run <code>$count</code>, and
        create records — the core fluent API.
      </div>
      <div class="tile-arrow">Open →</div>
    </RouterLink>

    <RouterLink to="/workflow" class="tile">
      <div class="tile-icon">◈</div>
      <div class="tile-title">Custom workflow demo</div>
      <div class="tile-desc">
        A <code>WorkflowItems</code> entity set with three tiles — get counts,
        list with filters, and submit items via a bound action.
      </div>
      <div class="tile-arrow">Open →</div>
    </RouterLink>
  </div>
</template>

<script setup>
import DecabaseLogo from '../components/DecabaseLogo.vue';

const snippet = `import { ODataClient } from '@otvnvs/ahm-decabase-odata';

const client = new ODataClient({ baseUrl, version: 'v4', transport });

await client.entitySet('Books')
  .filter(b => b.eq('Stock', 0))
  .orderby({ field: 'Title', desc: true })
  .top(10)
  .list();`;
</script>

<style scoped>
.hero { margin-bottom: 24px; }
.hero-logo { color: #1f6feb; margin-bottom: 12px; }
.hero h1 { margin: 0 0 8px; font-size: 28px; }
.hero-sub { margin: 0 0 16px; color: var(--text-dim); max-width: 640px; }
.hero-sub code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
.hero-code {
  background: var(--code-bg);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
  margin: 0;
  font-size: 12.5px;
  overflow-x: auto;
  color: #c9d6e8;
}
.tile code { background: var(--code-bg); padding: 1px 5px; border-radius: 4px; color: #9bb8e0; font-size: 12px; }
</style>
