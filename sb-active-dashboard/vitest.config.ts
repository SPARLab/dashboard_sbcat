import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules/', 'e2e/**', 'dist/', 'build/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/', 
        'src/test-setup.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'e2e/',
        'dist/',
        'build/'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    },
    // Configure alias for clean imports in tests
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './lib'),
      '@ui': resolve(__dirname, './ui')
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@lib': resolve(__dirname, './lib'),
      '@ui': resolve(__dirname, './ui')
    }
  }
})