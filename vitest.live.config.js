import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Lock down inclusion rules specifically to our spec file extension
    include: ['test/**/*.spec.js'],
    fileParallelism: false,
  },
});

