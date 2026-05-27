// Appends a content-hash query (?v=<hash>) to every dist/output.css reference
// in the built HTML, so a changed CSS file always gets a fresh URL and is never
// served stale from the browser / Cloudflare cache.
//
// Runs as the LAST step of `yarn build` (after Tailwind + the blog generator),
// so it rewrites both the hand-authored pages (index.html, privacy.html, …) and
// the generated blog HTML. The rewrite is idempotent: an existing ?v=… is
// replaced, never stacked. Only the `output.css` token is touched, so each
// page's relative prefix (`dist/`, `../../dist/`, …) is preserved.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = join(root, 'dist', 'output.css');

let css;
try {
  css = readFileSync(cssPath);
} catch {
  console.error(`[cache-bust] ${cssPath} not found — run the Tailwind build first.`);
  process.exit(1);
}

const hash = createHash('sha256').update(css).digest('hex').slice(0, 8);
const SKIP = new Set(['node_modules', '.git', 'dist']);
const CSS_REF = /output\.css(?:\?v=[0-9a-f]+)?/g;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (entry.endsWith('.html')) yield full;
  }
}

let changed = 0;
for (const file of htmlFiles(root)) {
  const before = readFileSync(file, 'utf8');
  if (!CSS_REF.test(before)) continue;
  const after = before.replace(CSS_REF, `output.css?v=${hash}`);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

console.log(`[cache-bust] output.css?v=${hash} applied to ${changed} HTML file(s).`);
