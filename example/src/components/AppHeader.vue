<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <DecabaseLogo :size="26" class="brand-mark" />
        <span class="brand-text">Decabase OData</span>
      </RouterLink>

      <button
        class="hamburger"
        :aria-expanded="open"
        aria-label="Toggle navigation"
        @click="open = !open"
      >
        <span></span><span></span><span></span>
      </button>

      <nav class="nav-desktop">
        <AppNav @navigate="open = false" />
      </nav>
    </div>

    <nav v-show="open" class="nav-mobile">
      <AppNav @navigate="open = false" />
    </nav>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import AppNav from './AppNav.vue';
import DecabaseLogo from './DecabaseLogo.vue';

const open = ref(false);
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(11, 18, 32, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.header-inner {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.01em;
}
.brand-mark { color: #1f6feb; flex-shrink: 0; }
.brand-text { white-space: nowrap; }

.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 38px;
  height: 38px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  margin: 0 auto;
  background: var(--text);
  border-radius: 1px;
}

.nav-desktop { display: flex; align-items: center; gap: 4px; }
.nav-mobile {
  display: none;
  flex-direction: column;
  padding: 8px 20px 14px;
  border-top: 1px solid var(--border-soft);
  background: var(--bg-elev);
}

@media (max-width: 720px) {
  .hamburger { display: flex; }
  .nav-desktop { display: none; }
  .nav-mobile { display: flex; }
}
</style>
