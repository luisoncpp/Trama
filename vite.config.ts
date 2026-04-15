import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [preact()],
  server: {
    watch: {
      // Export artifacts (for example example-fantasia/exports/book.html) should not trigger app reloads.
      ignored: ['**/exports/**'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})
