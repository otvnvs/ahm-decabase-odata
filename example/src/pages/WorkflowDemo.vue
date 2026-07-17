<template>
  <h1 class="page-title">Custom workflow demo</h1>
  <p class="page-sub">
    A <code>WorkflowItems</code> entity set demonstrating <code>count()</code>,
    filtered <code>list()</code>, and a bound <code>Submit</code> action.
  </p>

  <div class="tile-grid">
    <RouterLink to="/workflow/count" class="tile">
      <div class="tile-icon">⌗</div>
      <div class="tile-title">Get workflow items</div>
      <div class="tile-desc">
        <code>count()</code>, <code>count($filter)</code>, and <code>first()</code> —
        summarize the queue by status.
      </div>
      <div class="tile-arrow">Open →</div>
    </RouterLink>

    <RouterLink to="/workflow/list" class="tile">
      <div class="tile-icon">≡</div>
      <div class="tile-title">List workflow items</div>
      <div class="tile-desc">
        Filtered, ordered <code>list()</code> in a table, with inline
        <code>callAction(id, 'Submit')</code> per row.
      </div>
      <div class="tile-arrow">Open →</div>
    </RouterLink>

    <RouterLink to="/workflow/submit" class="tile">
      <div class="tile-icon">▶</div>
      <div class="tile-title">Submit a workflow item</div>
      <div class="tile-desc">
        <code>create()</code> a new item then invoke the bound
        <code>Submit</code> action on it.
      </div>
      <div class="tile-arrow">Open →</div>
    </RouterLink>
  </div>
</template>

<script setup>
</script>

<style scoped>
.page-title { margin: 0 0 6px; font-size: 22px; }
.page-sub { margin: 0 0 20px; color: var(--text-dim); }
.page-sub code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: #9bb8e0; }
.tile code { background: var(--code-bg); padding: 1px 5px; border-radius: 4px; color: #9bb8e0; font-size: 12px; }
</style>
