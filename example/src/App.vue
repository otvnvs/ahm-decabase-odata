<template>
  <AppHeader />
  <main class="page">
    <RouterView />
  </main>
  <footer class="app-footer">
    <span>@otvnvs/ahm-decabase-odata · demo</span>
  </footer>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue';
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  padding: 18px 20px;
  text-align: center;
  font-size: 12px;
  color: var(--text-mute);
  border-top: 1px solid var(--border-soft);
}
</style>
