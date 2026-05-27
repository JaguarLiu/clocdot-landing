import matter from 'gray-matter';
import { marked } from 'marked';

export const CATEGORIES = {
  feature:     { label: '新功能',  stampClass: 'text-emerald-600', dotClass: 'bg-emerald-500' },
  maintenance: { label: '維護公告', stampClass: 'text-amber-600',   dotClass: 'bg-amber-500' },
};

// 重新產生 sitemap 時保留的既有靜態頁
export const STATIC_URLS = [
  { loc: 'https://clocdot.com/',                                  changefreq: 'weekly',  priority: '1.0' },
  { loc: 'https://clocdot.com/features/remote-work-attendance/',  changefreq: 'monthly', priority: '0.8' },
  { loc: 'https://clocdot.com/features/gps-clock-in/',            changefreq: 'monthly', priority: '0.8' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED = ['title', 'slug', 'category', 'date', 'excerpt'];

export function parsePost(raw, filename) {
  const { data, content } = matter(raw);
  for (const field of REQUIRED) {
    if (!data[field] || String(data[field]).trim() === '') {
      throw new Error(`[${filename}] 缺少必填 frontmatter 欄位: ${field}`);
    }
  }
  if (!CATEGORIES[data.category]) {
    throw new Error(`[${filename}] category 非法: ${data.category}（只接受 feature / maintenance）`);
  }
  const date = String(data.date).trim();
  if (!ISO_DATE.test(date)) {
    throw new Error(`[${filename}] date 必須為 YYYY-MM-DD 格式，收到: ${date}`);
  }
  const slug = String(data.slug).trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(`[${filename}] slug 格式非法: ${slug}（只允許小寫英數與連字號，例如 my-post）`);
  }
  return {
    title: String(data.title),
    slug,
    category: data.category,
    date,
    excerpt: String(data.excerpt),
    bodyHtml: marked.parse(content),
  };
}

export function formatDate(iso) {
  return iso.replaceAll('-', '.');
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// 防止 JSON-LD 內的 </script> 或 < 提前關閉 <script> 區塊
function jsonLdSafe(obj) {
  return JSON.stringify(obj, null, 2).replaceAll('<', '\\u003c');
}

// 撕紙 SVG filter defs：所有頁面 <body> 頂端都要有，paper-card/paper-scrap 才會生效
const TORN_DEFS = `
  <svg width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">
    <defs>
      <filter id="torn-edge" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.04" numOctaves="4" seed="7" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="torn-edge-soft" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="3" seed="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
  </svg>`;

// header / footer，prefix 為到 site root 的相對前綴（文章頁 "../../"、索引頁 "../"）
function header(prefix) {
  return `
  <header class="relative max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
    <a href="${prefix}" class="flex items-center gap-2 group">
      <img src="${prefix}assets/logo.png" alt="ClocDot logo" width="1024" height="1024"
           class="w-9 h-9 object-contain drop-shadow-sm transition-transform group-hover:rotate-12"
           style="transform: rotate(-4deg);" />
      <span class="text-xl font-black tracking-tight text-slate-800">ClocDot</span>
    </a>
    <nav class="flex items-center gap-4 md:gap-7 text-sm font-zh text-slate-600">
      <a href="${prefix}" class="hidden md:inline hover:text-emerald-600 transition-colors">首頁</a>
      <a href="${prefix}blog/" class="hidden md:inline hover:text-emerald-600 transition-colors">部落格</a>
      <a href="https://app.clocdot.com/login" class="relative group">
        <span class="absolute inset-0 bg-slate-800 translate-y-1 translate-x-1 rounded-md"></span>
        <span class="relative inline-block px-3 py-1.5 md:px-4 bg-white border-2 border-slate-800 rounded-md font-black text-sm group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 transition-transform">登入</span>
      </a>
    </nav>
  </header>`;
}

function footer(prefix) {
  return `
  <footer class="relative max-w-6xl mx-auto px-6 py-12 border-t border-dashed border-slate-300/60">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <img src="${prefix}assets/logo.png" alt="ClocDot logo" width="1024" height="1024"
             loading="lazy" decoding="async" class="w-7 h-7 object-contain drop-shadow-sm"
             style="transform: rotate(-4deg);" />
        <span class="font-zh text-sm text-slate-500">© 2026 ClocDot · Powered by 醬瓜</span>
      </div>
      <div class="flex items-center gap-5 text-xs font-zh text-slate-400">
        <a href="${prefix}blog/" class="hover:text-slate-700">部落格</a>
        <a href="${prefix}privacy.html" class="hover:text-slate-700">隱私政策</a>
        <a href="${prefix}terms.html" class="hover:text-slate-700">服務條款</a>
        <a href="mailto:rexa1224@gmail.com" class="hover:text-slate-700">聯絡</a>
      </div>
    </div>
  </footer>`;
}

function categoryStamp(category) {
  const c = CATEGORIES[category];
  return `<span class="inline-flex items-center gap-1.5 stamp ${c.stampClass} px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]" style="transform: rotate(-2deg);">
        <span class="w-1.5 h-1.5 ${c.dotClass} rounded-full"></span>${c.label}</span>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet" />`;

function postCard(post) {
  return `
      <a href="${post.slug}/" class="paper-scrap block p-6 hover:-translate-y-1 transition-transform" style="--paper-bg: #fffdf7;">
        <div class="mb-3 flex items-center gap-3">
          ${categoryStamp(post.category)}
          <time datetime="${post.date}" class="text-xs font-zh text-slate-400">${formatDate(post.date)}</time>
        </div>
        <h2 class="text-xl font-black text-slate-800 mb-2 leading-snug">${escapeHtml(post.title)}</h2>
        <p class="text-sm font-zh text-slate-600 leading-relaxed">${escapeHtml(post.excerpt)}</p>
      </a>`;
}

export function renderIndexPage(posts) {
  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const cards = sorted.length
    ? sorted.map(postCard).join('\n')
    : `<p class="font-zh text-slate-500 col-span-full text-center py-12">目前還沒有文章，敬請期待 ✏️</p>`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://clocdot.com/' },
      { '@type': 'ListItem', position: 2, name: '部落格', item: 'https://clocdot.com/blog/' },
    ],
  };
  return `<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>部落格｜ClocDot</title>
  <meta name="description" content="ClocDot 的新功能釋出介紹與系統維護公告。" />
  <link rel="canonical" href="https://clocdot.com/blog/" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta property="og:title" content="部落格｜ClocDot" />
  <meta property="og:description" content="ClocDot 的新功能釋出介紹與系統維護公告。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://clocdot.com/blog/" />
  <meta property="og:image" content="https://clocdot.com/assets/og-cover.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#10b981" />
  ${FONTS}
  <link rel="stylesheet" href="../dist/output.css" />
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
  <script type="application/ld+json">
${jsonLdSafe(ld)}
  </script>
</head>
<body class="overflow-x-hidden">
${TORN_DEFS}
${header('../')}
  <main class="relative max-w-4xl mx-auto px-6 pt-12 pb-20">
    <div class="mb-10">
      <h1 class="text-4xl md:text-5xl font-black tracking-tight text-slate-800 mb-3">部落格</h1>
      <p class="font-zh text-slate-600">新功能釋出介紹與系統維護公告。</p>
    </div>
    <div class="grid gap-6 md:grid-cols-2">
${cards}
    </div>
  </main>
${footer('../')}
</body>
</html>`;
}

export function renderSitemap(posts) {
  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const blogLastmod = sorted[0]?.date ?? new Date().toISOString().slice(0, 10);
  const urls = [
    ...STATIC_URLS.map((u) => ({ ...u, lastmod: undefined })),
    { loc: 'https://clocdot.com/blog/', changefreq: 'weekly', priority: '0.7', lastmod: blogLastmod },
    ...sorted.map((p) => ({
      loc: `https://clocdot.com/blog/${p.slug}/`,
      changefreq: 'yearly',
      priority: '0.6',
      lastmod: p.date,
    })),
  ];
  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
      return `  <url>
    <loc>${u.loc}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function renderPostPage(post) {
  const url = `https://clocdot.com/blog/${post.slug}/`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#post`,
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        dateModified: post.date,
        inLanguage: 'zh-TW',
        url,
        author: { '@type': 'Organization', name: 'ClocDot', url: 'https://clocdot.com/' },
        publisher: { '@type': 'Organization', name: 'ClocDot', logo: { '@type': 'ImageObject', url: 'https://clocdot.com/assets/logo.png' } },
        image: 'https://clocdot.com/assets/og-cover.png',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://clocdot.com/' },
          { '@type': 'ListItem', position: 2, name: '部落格', item: 'https://clocdot.com/blog/' },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
  return `<!doctype html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)}｜ClocDot 部落格</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <meta property="og:title" content="${escapeHtml(post.title)}｜ClocDot" />
  <meta property="og:description" content="${escapeHtml(post.excerpt)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://clocdot.com/assets/og-cover.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#10b981" />
  ${FONTS}
  <link rel="stylesheet" href="../../dist/output.css" />
  <link rel="icon" type="image/svg+xml" href="../../assets/favicon.svg" />
  <script type="application/ld+json">
${jsonLdSafe(ld)}
  </script>
</head>
<body class="overflow-x-hidden">
${TORN_DEFS}
${header('../../')}
  <main class="relative max-w-3xl mx-auto px-6 pt-12 pb-20">
    <a href="../" class="inline-block mb-6 text-sm font-zh text-slate-500 hover:text-emerald-600">← 回部落格</a>
    <div class="paper-card" style="--paper-bg: #fffdf7;">
    <article class="p-8 md:p-12">
      <div class="mb-4 flex items-center gap-3">
        ${categoryStamp(post.category)}
        <time datetime="${post.date}" class="text-xs font-zh text-slate-400">${formatDate(post.date)}</time>
      </div>
      <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-800 leading-tight mb-8">${escapeHtml(post.title)}</h1>
      <div class="prose-blog font-zh text-slate-700 leading-relaxed">
${post.bodyHtml}
      </div>
    </article>
    </div>
  </main>
${footer('../../')}
</body>
</html>`;
}
