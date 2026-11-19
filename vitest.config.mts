import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Needs a live database (imports src/db). Run manually with DATABASE_URL set.
    exclude: ['**/node_modules/**', 'tests/budget-period.test.ts'],
  },
})
