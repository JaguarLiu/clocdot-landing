#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePost, renderPostPage, renderIndexPage, renderSitemap } from './blog/lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content', 'blog');
const blogOut = join(root, 'blog');

function main() {
  const files = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
  const posts = files.map((f) => parsePost(readFileSync(join(contentDir, f), 'utf8'), f));

  const seen = new Set();
  for (const p of posts) {
    if (seen.has(p.slug)) throw new Error(`重複的 slug: ${p.slug}`);
    seen.add(p.slug);
  }

  mkdirSync(blogOut, { recursive: true });
  for (const post of posts) {
    const dir = join(blogOut, post.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), renderPostPage(post));
  }
  writeFileSync(join(blogOut, 'index.html'), renderIndexPage(posts));
  writeFileSync(join(root, 'sitemap.xml'), renderSitemap(posts));

  console.log(`✓ 部落格建置完成：${posts.length} 篇文章`);
}

main();
