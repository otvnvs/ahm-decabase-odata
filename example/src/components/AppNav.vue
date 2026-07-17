<template>
  <RouterLink to="/" custom v-slot="{ navigate, isActive }">
    <button class="nav-link" :class="{ active: isActive }" @click="go(navigate)">Home</button>
  </RouterLink>
  <RouterLink to="/generic" custom v-slot="{ navigate, isActive }">
    <button class="nav-link" :class="{ active: isActive }" @click="go(navigate)">Generic OData</button>
  </RouterLink>
  <RouterLink to="/workflow" custom v-slot="{ navigate, isActive }">
    <button class="nav-link" :class="{ active: isActive }" @click="go(navigate)">Workflow</button>
  </RouterLink>
</template>

<script setup>
const emit = defineEmits(['navigate']);

// Run the RouterLink navigate handler, then emit so the mobile menu closes.
function go(navigate) {
  navigate();
  emit('navigate');
}
</script>

<style scoped>
.nav-link {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  text-align: left;
}
.nav-link:hover { color: var(--text); background: var(--accent-soft); }
.nav-link.active {
  color: var(--accent-hover);
  background: var(--accent-soft);
  border-color: var(--accent-line);
}
</style>
