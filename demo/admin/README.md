# ClocDot Admin Demo（管理後台展示站）

正式 `admin/` 的**離線展示版**：不連任何後端 API，所有讀寫都走瀏覽器 `localStorage`。
用來展示管理後台的完整流程（總覽、報表、補卡/請假/加班審核、排班、員工/部門/角色、薪資結算、公司設定），無需架設 server / DB。

## 執行

```bash
cd demo/admin
npm install
npm run dev      # 開發模式（port 5174）
npm run build && npm run preview
```

`dist/` 為純靜態檔，可直接丟任何靜態主機。

## 與正式 admin 的差異

改動集中在資料層，UI／頁面／元件與 `admin/` 完全相同：

| 檔案 | 說明 |
|---|---|
| `src/mock/db.js` | localStorage 假資料庫；一家公司 4 員工、2 部門、3 班別，含出勤/請假/加班/補卡/薪資/結算 |
| `src/services/api.js` | `request()` 路由到假資料庫；CSV 匯出改為就地產生 blob；named export 與正式版一致 |
| `src/services/auth.js` | 假登入：預設以管理員身分登入，登出後任意帳密可再登入 |
| `vite.config.js` | 移除 API proxy |

## 假資料

- 預設**自動登入**為管理員「陳經理」（`isAdmin`，全模組可存取）。
- 登出後回登入畫面，輸入**任意** email/密碼即可再登入。
- 種子含 4 名員工、2 部門、3 班別、數筆待審核（補卡/請假/加班）、上月已鎖定薪資、本月結算與報表。
- 所有操作（審核、排班、建員工、改設定、結算…）都寫進 localStorage，重整後仍在。

## 重置

主控台執行 `window.__resetDemo()`，或清掉 `localStorage` 後重整。
