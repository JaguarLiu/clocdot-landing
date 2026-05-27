import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePost, renderPostPage, renderIndexPage, renderSitemap, formatDate } from '../scripts/blog/lib.mjs';

const validRaw = `---
title: "GPS 打卡準確度提升"
slug: gps-accuracy-upgrade
category: feature
date: "2026-05-27"
excerpt: "定位演算法升級，誤差縮小到 10 公尺。"
---

我們將 GPS 演算法做了升級。

## 細節

- 第一點
- 第二點
`;

test('parsePost 解析 frontmatter 與內文 HTML', () => {
  const post = parsePost(validRaw, 'gps-accuracy-upgrade.md');
  assert.equal(post.title, 'GPS 打卡準確度提升');
  assert.equal(post.slug, 'gps-accuracy-upgrade');
  assert.equal(post.category, 'feature');
  assert.equal(post.date, '2026-05-27');
  assert.equal(post.excerpt, '定位演算法升級，誤差縮小到 10 公尺。');
  assert.match(post.bodyHtml, /<h2[^>]*>細節<\/h2>/);
  assert.match(post.bodyHtml, /<li>第一點<\/li>/);
});

test('parsePost 缺必填欄位時拋錯', () => {
  const missing = `---
title: "沒有 slug"
category: feature
date: "2026-05-27"
excerpt: "x"
---
內文`;
  assert.throws(() => parsePost(missing, 'bad.md'), /bad\.md.*slug/s);
});

test('parsePost category 非法時拋錯', () => {
  const badCat = `---
title: "壞分類"
slug: bad-cat
category: news
date: "2026-05-27"
excerpt: "x"
---
內文`;
  assert.throws(() => parsePost(badCat, 'bad-cat.md'), /category.*news/s);
});

test('parsePost date 非 ISO 格式時拋錯', () => {
  const badDate = `---
title: "壞日期"
slug: bad-date
category: feature
date: 2026/05/27
excerpt: "x"
---
內文`;
  assert.throws(() => parsePost(badDate, 'bad-date.md'), /date/s);
});

test('formatDate 轉成顯示用點分格式', () => {
  assert.equal(formatDate('2026-05-27'), '2026.05.27');
});

test('renderPostPage 產出含 SEO 與視覺要素的完整 HTML', () => {
  const post = parsePost(validRaw, 'gps-accuracy-upgrade.md');
  const html = renderPostPage(post);
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="zh-TW">/);
  assert.match(html, /href="\.\.\/\.\.\/dist\/output\.css"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/clocdot\.com\/blog\/gps-accuracy-upgrade\/"/);
  assert.match(html, /<title>GPS 打卡準確度提升｜ClocDot 部落格<\/title>/);
  assert.match(html, /<meta name="description" content="定位演算法升級，誤差縮小到 10 公尺。"/);
  assert.match(html, /"@type": "BlogPosting"/);
  assert.match(html, /"@type": "BreadcrumbList"/);
  assert.match(html, /"headline": "GPS 打卡準確度提升"/);
  assert.match(html, /"datePublished": "2026-05-27"/);
  assert.match(html, /id="torn-edge"/);
  assert.match(html, /class="paper-card"/);
  assert.match(html, /新功能/);
  assert.match(html, /<h2[^>]*>細節<\/h2>/);
  assert.match(html, /2026\.05\.27/);
});

test('renderIndexPage 依日期降冪列出文章卡片', () => {
  const older = parsePost(validRaw.replace('2026-05-27', '2026-05-01').replace('gps-accuracy-upgrade', 'older-post'), 'older-post.md');
  const newer = parsePost(validRaw, 'gps-accuracy-upgrade.md');
  const html = renderIndexPage([older, newer]); // 故意亂序傳入
  assert.match(html, /<link rel="canonical" href="https:\/\/clocdot\.com\/blog\/"/);
  assert.match(html, /href="\.\.\/dist\/output\.css"/);
  assert.match(html, /<title>部落格｜ClocDot<\/title>/);
  assert.match(html, /href="gps-accuracy-upgrade\/"/);
  assert.match(html, /href="older-post\/"/);
  assert.ok(html.indexOf('gps-accuracy-upgrade/') < html.indexOf('older-post/'), '新文章應排在前面');
  assert.match(html, /id="torn-edge"/);
  assert.match(html, /class="paper-scrap/);
});

test('renderIndexPage 無文章時顯示空狀態', () => {
  const html = renderIndexPage([]);
  assert.match(html, /目前還沒有文章/);
});

test('parsePost 拒絕含路徑字元的非法 slug', () => {
  const bad = `---
title: "壞 slug"
slug: ../../etc/passwd
category: feature
date: "2026-05-27"
excerpt: "x"
---
內文`;
  assert.throws(() => parsePost(bad, 'bad-slug.md'), /slug/s);
});

test('parsePost 拒絕含空白與大寫的 slug', () => {
  const bad = `---
title: "壞 slug"
slug: "My Post"
category: feature
date: "2026-05-27"
excerpt: "x"
---
內文`;
  assert.throws(() => parsePost(bad, 'bad-slug2.md'), /slug/s);
});

test('renderPostPage 對 JSON-LD 中的 </script> 做跳脫', () => {
  const raw = `---
title: "標題</script><script>alert(1)</script>"
slug: xss-test
category: feature
date: "2026-05-27"
excerpt: "x"
---
內文`;
  const post = parsePost(raw, 'xss-test.md');
  const html = renderPostPage(post);
  // 原始的 </script> 不應出現在 JSON-LD headline 中（應被跳脫為 \\u003c）
  assert.ok(!html.includes('"headline": "標題</script>'), 'JSON-LD 未跳脫 </script>');
  assert.match(html, /\\u003c\/script>/);
});

test('renderSitemap 保留靜態頁並加入 /blog/ 與每篇文章', () => {
  const post = parsePost(validRaw, 'gps-accuracy-upgrade.md');
  const xml = renderSitemap([post]);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/clocdot\.com\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/clocdot\.com\/features\/gps-clock-in\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/clocdot\.com\/blog\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/clocdot\.com\/blog\/gps-accuracy-upgrade\/<\/loc>/);
  assert.match(xml, /<lastmod>2026-05-27<\/lastmod>/);
});
