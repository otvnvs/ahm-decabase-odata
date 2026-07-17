import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  base: '/ahm-decabase-odata/',
  plugins: [vue()],
  build: {
    outDir: 'dist', 
    assetsDir: 'assets',
    emptyOutDir: true,
  }
});
