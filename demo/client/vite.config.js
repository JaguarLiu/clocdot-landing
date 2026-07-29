import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// DEMO 版：無後端、無 PWA/Service Worker（避免快取假資料、也不需離線殼）。
// 資料層改由 src/services/api.js + src/mock/db.js 以 localStorage 模擬。
// 部署於 landing 站的 /demo/client/ 子路徑（base 用相對路徑，搭配 HashRouter 不受掛載位置影響）；build 產物輸出到 repo 根的 .demo-build/client，
// 由 CI 搬到 demo/client/（見 .github/workflows/landing-pages.yml）。
export default defineConfig({
  base: './',
  build: {
    outDir: '../../.demo-build/client',
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
})
