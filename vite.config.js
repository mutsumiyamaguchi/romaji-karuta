import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Vitest の JSX 変換のために必要。build 時には oxc が優先されるため、
  // 「Both esbuild and oxc options were set」警告が出るが無害（Vitest だけが参照する）。
  // 削除するとテスト時の JSX が壊れる（fail 36 件）。
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    css: false,
  },
})
