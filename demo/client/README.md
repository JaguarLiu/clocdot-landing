# ClocDot Demo（員工端展示站）

正式 `client/` 的**離線展示版**：不連任何後端 API，所有讀寫都走瀏覽器 `localStorage`。
用來展示員工打卡 App 的完整流程（打卡、補卡、請假、加班、簽核、薪資單），無需架設 server / DB。

## 執行

```bash
cd demo/client
npm install
npm run dev      # 開發模式
npm run build && npm run preview   # 產出靜態檔並預覽
```

`npm run build` 產出的 `dist/` 是純靜態檔，可直接丟任何靜態主機（GitHub Pages / Netlify / Zeabur static…）。

## 與正式 client 的差異

改動集中在**資料層**，UI／頁面／元件與 `client/` 完全相同：

| 檔案 | 說明 |
|---|---|
| `src/mock/db.js` | localStorage 假資料庫；種子資料以「今天」為基準動態生成 |
| `src/services/api.js` | `request()` 改為路由到假資料庫，named export 與正式版一致 |
| `src/services/auth.js` | 假登入：預設已登入，登出後任意 email/密碼可再登入 |
| `vite.config.js` | 移除 PWA/Service Worker 與 API proxy |
| `src/main.jsx` | 移除 service worker 註冊 |

`src/services/offlineQueue.js` 未改——它本來就是純 localStorage。

## 假帳號 / 資料

- 預設**自動登入**為員工「王小明」（排班制），一進站就到打卡頁。
- 登出後回到登入畫面，輸入**任意** email 與密碼即可再登入。
- 種子資料包含：本月出勤紀錄、數筆請假／加班／補卡、兩筆待簽核、兩個月已發放薪資單、本週班表。
- 所有操作（打卡、送單、審核…）都寫進 localStorage，重整後仍在。

## 重置

主控台執行 `window.__resetDemo()`，或清掉 `localStorage` 後重整，即可回到初始種子資料。
