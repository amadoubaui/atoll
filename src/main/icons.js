// Trouve l'icône d'un site pour en faire une icône d'application :
// l'icône déclarée la plus grande (apple-touch-icon, manifeste, favicon),
// mise en cache dans le profil.
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 1.5e6;

// Lit une réponse en s'arrêtant à `max` octets (un site ne doit pas pouvoir
// saturer la mémoire d'Atoll avec une « icône » de plusieurs gigaoctets).
async function readCapped(res, max) {
  const len = Number(res.headers.get('content-length') || 0);
  if (len > max) return null;
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { reader.cancel().catch(() => {}); return null; }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function get(ses, url, timeout = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await ses.fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function attr(tag, name) {
  const m = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}

function candidatesFromHtml(html, base) {
  const out = [];
  let manifest = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (attr(tag, 'rel') || '').toLowerCase();
    const href = attr(tag, 'href');
    if (!href) continue;
    let abs;
    try { abs = new URL(href, base).href; } catch { continue; }
    if (rel.includes('manifest')) { manifest = abs; continue; }
    if (!rel.includes('icon')) continue;
    const sizes = attr(tag, 'sizes') || '';
    let size = parseInt(sizes, 10) || 0;
    if (/\.svg(\?|$)/i.test(abs) || sizes === 'any') size = 256;
    if (rel.includes('apple-touch-icon')) size = Math.max(size, 180);
    if (rel.includes('mask-icon')) continue; // monochrome, illisible en icône
    out.push({ url: abs, size: size || 32 });
  }
  return { list: out, manifest };
}

async function fromManifest(ses, manifestUrl) {
  const res = await get(ses, manifestUrl, 5000);
  if (!res) return [];
  try {
    const json = JSON.parse(((await readCapped(res, 1e6)) || '').toString());
    return (json.icons || []).filter((i) => i.src && !/monochrome/.test(i.purpose || '')).map((i) => ({
      url: new URL(i.src, manifestUrl).href,
      size: parseInt(i.sizes, 10) || 128,
      maskable: /maskable/.test(i.purpose || ''),
    }));
  } catch {
    return [];
  }
}

async function toDataUrl(ses, url) {
  const res = await get(ses, url, 6000);
  if (!res) return null;
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^image\//.test(type) && !/\.(png|ico|svg|jpg|jpeg|webp)(\?|$)/i.test(url)) return null;
  const buf = await readCapped(res, MAX_BYTES);
  if (!buf || !buf.length) return null;
  const mime = /^image\//.test(type) ? type : (/\.svg/i.test(url) ? 'image/svg+xml' : 'image/png');
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function fetchIcon(ses, pageUrl, userData) {
  let u;
  try { u = new URL(pageUrl); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const cacheDir = path.join(userData, 'icons');
  // Adresse directe d'une image (icône choisie pour une application connue).
  if (/\.(png|svg|ico|webp|jpg)(\?|$)/i.test(u.pathname)) {
    const dataUrl = await toDataUrl(ses, u.href);
    // Logo choisi à la main : posé sur la tuile claire, avec une marge.
    return dataUrl ? { dataUrl, size: 96 } : null;
  }
  const cacheFile = path.join(cacheDir, u.hostname.replace(/[^a-z0-9.-]/gi, '_') + '.json');
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (cached && cached.dataUrl) return cached;
  } catch {}

  const candidates = [];
  const page = await get(ses, u.href);
  if (page) {
    const html = ((await readCapped(page, 3e6)) || Buffer.alloc(0)).toString('utf8').slice(0, 400000);
    const { list, manifest } = candidatesFromHtml(html, page.url || u.href);
    candidates.push(...list);
    if (manifest) candidates.push(...await fromManifest(ses, manifest));
  }
  candidates.push({ url: `${u.origin}/apple-touch-icon.png`, size: 180 });
  candidates.push({ url: `${u.origin}/favicon.ico`, size: 32 });
  candidates.sort((a, b) => b.size - a.size);

  let result = null;
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    const dataUrl = await toDataUrl(ses, c.url);
    if (dataUrl) { result = { dataUrl, size: c.size, maskable: !!c.maskable }; break; }
  }
  if (!result) {
    const dataUrl = await toDataUrl(ses, `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`);
    if (dataUrl) result = { dataUrl, size: 32 };
  }
  if (result) {
    try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(result)); } catch {}
  }
  return result;
}

module.exports = { fetchIcon, candidatesFromHtml };
