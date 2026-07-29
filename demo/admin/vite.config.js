import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// DEMO 版：無後端、無 API proxy。資料層改由 src/services/api.js + src/mock/db.js 以 localStorage 模擬。
// 部署於 landing 站的 /demo/admin/ 子路徑（base 用相對路徑，搭配 HashRouter 不受掛載位置影響）；build 產物輸出到 repo 根的 .demo-build/admin，
// 由 CI 搬到 demo/admin/（見 .github/workflows/landing-pages.yml）。
export default defineConfig({
  base: './',
  server: { port: 5174 },
  build: {
    outDir: '../../.demo-build/admin',
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
})
