Configure project:

```bash
npm init -y
npm install vite @vitejs/plugin-vue --save-dev
npm install vue
npm install git+https://github.com/otvnvs/ahm-decabase-odata.git
```

Configure `package.json`:

```json
...
"scripts": {
  "dev": "vite"
}
...
```

Configure `vite.config.js`:

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

Configure `pacakge.json`

Edit `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite Vue Test</title>
  </head>
  <body>
    <div id="app"></div>
    <!-- Point Vite to your main entry JavaScript file -->
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

Edit `./src/main.js`

```js
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

Edit `./src/App.vue`:

```vue
<template>
  <div style="padding: 20px; font-family: sans-serif;">
    <h1>Vite + Vue Package Test</h1>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Import your custom function from your GitHub package
import sayHello from '@your-github-username/my-shareable-package';

// Execute the function and save it to a reactive reference
const message = ref(sayHello('Developer'));
</script>
```
