// Les applications : celles qui sont intégrées à Atoll et les applications web.
import { state, save } from './state.js';
import { h, uid, hostOf, bus } from './util.js';
import { t } from './i18n.js';
import { LOGO } from './icons.js';

const BUILTIN_NAMES = { launchpad: 'app.launchpad', browser: 'app.browser', settings: 'app.settings', notes: 'app.notes', welcome: 'app.welcome', folder: 'app.folder' };

export function getApp(id) { return state.apps[id] || null; }
export function appName(app) {
  if (!app) return '';
  if (app.kind === 'builtin' && BUILTIN_NAMES[app.id] && !app.renamed) return t(BUILTIN_NAMES[app.id]);
  return app.name;
}
export function allApps() {
  return Object.values(state.apps).filter((a) => !a.hidden).sort((a, b) => appName(a).localeCompare(appName(b), 'fr'));
}

// --- Icônes ----------------------------------------------------------------------------
const BUILTIN_SVG = {
  launchpad: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-lp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#1f2937"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#g-lp)"/>
    ${[['#f87171', 24, 24], ['#fbbf24', 50, 24], ['#34d399', 76, 24], ['#60a5fa', 24, 50], ['#a78bfa', 50, 50], ['#f472b6', 76, 50], ['#2dd4bf', 24, 76], ['#fb923c', 50, 76], ['#e5e7eb', 76, 76]]
      .map(([c, x, y]) => `<rect x="${x - 9}" y="${y - 9}" width="18" height="18" rx="5" fill="${c}"/>`).join('')}</svg>`,
  browser: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-br" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ac8fa"/><stop offset="1" stop-color="#0a6cf5"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#g-br)"/><circle cx="50" cy="50" r="31" fill="#fff"/><circle cx="50" cy="50" r="27" fill="none" stroke="#cfe3ff" stroke-width="1.5" stroke-dasharray="1.5 4.2"/>
    <path d="M50 50 L68 32 L56 56 Z" fill="#ff3b30"/><path d="M50 50 L32 68 L44 44 Z" fill="#c7cdd6"/><circle cx="50" cy="50" r="3.2" fill="#fff" stroke="#9aa3ad"/></svg>`,
  settings: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d1d5db"/><stop offset="1" stop-color="#8b929c"/></linearGradient><radialGradient id="g-st2"><stop offset="0" stop-color="#6b7280"/><stop offset="1" stop-color="#374151"/></radialGradient></defs>
    <rect width="100" height="100" fill="url(#g-st)"/>
    <g transform="translate(50 50)">${Array.from({ length: 12 }, (_, i) => `<rect x="-5" y="-36" width="10" height="14" rx="2.5" fill="#4b5563" transform="rotate(${i * 30})"/>`).join('')}
    <circle r="26" fill="url(#g-st2)"/><circle r="15" fill="#c8ccd2"/><circle r="7" fill="#6b7280"/></g></svg>`,
  notes: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#fffdf6"/><rect width="100" height="27" fill="#ffd54a"/><rect y="27" width="100" height="3" fill="#e9b928" opacity=".6"/>
    ${[44, 58, 72, 86].map((y) => `<rect x="14" y="${y}" width="72" height="2.2" rx="1.1" fill="#d6d3cc"/>`).join('')}</svg>`,
  folder: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-fd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc0ff"/><stop offset="1" stop-color="#3b8cf0"/></linearGradient></defs>
    <rect width="100" height="100" fill="#eaf3ff"/><path d="M14 30a6 6 0 0 1 6-6h20l7 7h33a6 6 0 0 1 6 6v37a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="url(#g-fd)"/><path d="M14 40h72v34a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#fff" opacity=".22"/></svg>`,
  welcome: `<svg viewBox="0 0 100 100"><defs><linearGradient id="g-wl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2a44"/><stop offset="1" stop-color="#07111f"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#g-wl)"/><g transform="translate(14 14) scale(1.125)">${LOGO.replace(/<\/?svg[^>]*>/g, '').replaceAll('lg-', 'wl-')}</g></svg>`,
};

function letterIcon(app) {
  const color = app.color || '#64748b';
  const letter = (appName(app).trim()[0] || '?').toUpperCase();
  return h('div.app-icon-letter', { style: { background: `linear-gradient(160deg, color-mix(in srgb, ${color} 78%, white) 0%, ${color} 55%, color-mix(in srgb, ${color} 80%, black) 100%)` } }, letter);
}

// Rend l'icône d'une application (élément carré aux coins arrondis).
export function appIcon(app, size) {
  const box = h('div.app-icon');
  if (size) box.style.setProperty('--s', size + 'px');
  if (!app) return box;
  if (app.kind === 'builtin' && BUILTIN_SVG[app.id] && !app.customIcon) {
    box.innerHTML = BUILTIN_SVG[app.id];
    box.classList.add('full');
    return box;
  }
  const ic = app.customIcon || app.icon;
  if (ic && ic.dataUrl) {
    const img = h('img', { src: ic.dataUrl, alt: '', draggable: false });
    if (ic.size >= 120 && !/svg/.test(ic.dataUrl.slice(0, 30))) box.classList.add('full');
    else box.classList.add('padded');
    img.onerror = () => { box.replaceChildren(letterIcon(app)); box.className = 'app-icon'; };
    box.append(img);
    return box;
  }
  box.append(letterIcon(app));
  return box;
}

// Icône de dossier : un carré givré avec les quatre premières applications.
export function folderIcon(folder, size) {
  const box = h('div.app-icon.folder-icon');
  if (size) box.style.setProperty('--s', size + 'px');
  box.style.setProperty('--folder', folder.color || '#4f8df7');
  const grid = h('div.folder-grid');
  for (const id of (folder.items || []).slice(0, 4)) grid.append(appIcon(getApp(id)));
  box.append(grid);
  return box;
}

// --- Récupération des icônes des sites ---------------------------------------------
const pending = new Set();
export async function ensureIcon(app) {
  if (!app || app.kind !== 'web' || app.icon || pending.has(app.id) || !window.atoll?.fetchIcon) return;
  pending.add(app.id);
  try {
    const icon = (app.iconUrl && await window.atoll.fetchIcon(app.iconUrl)) || await window.atoll.fetchIcon(app.url);
    if (icon && state.apps[app.id]) {
      state.apps[app.id].icon = icon;
      save();
      bus.emit('apps-changed');
    }
  } catch {} finally {
    pending.delete(app.id);
  }
}
export function ensureAllIcons() {
  for (const app of Object.values(state.apps)) ensureIcon(app);
}

// --- Gestion ----------------------------------------------------------------------------
export function addWebApp({ name, url, color }, { dock = true, desktop = true } = {}) {
  const host = hostOf(url);
  const id = uid('app');
  const palette = ['#0ea5e9', '#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#22c55e', '#eab308', '#ef4444'];
  const app = { id, kind: 'web', name: name || host || url, url, color: color || palette[Math.abs(hash(host)) % palette.length], icon: null };
  state.apps[id] = app;
  if (dock) state.dock.splice(Math.max(0, state.dock.length - 2), 0, id);
  if (desktop) state.desktop.push({ id: uid('d'), type: 'app', appId: id, col: null, row: null });
  save();
  bus.emit('apps-changed');
  ensureIcon(app);
  return app;
}

export function removeApp(id) {
  const app = state.apps[id];
  if (!app || app.kind === 'builtin') return;
  delete state.apps[id];
  state.dock = state.dock.filter((x) => x !== id);
  state.desktop = state.desktop.filter((d) => d.appId !== id);
  for (const d of state.desktop) if (d.type === 'folder') d.items = d.items.filter((x) => x !== id);
  save();
  bus.emit('apps-changed');
}

export function updateApp(id, patch) {
  const app = state.apps[id];
  if (!app) return;
  const urlChanged = patch.url && patch.url !== app.url;
  Object.assign(app, patch);
  if (app.kind === 'builtin' && patch.name) app.renamed = true;
  if (urlChanged && hostOf(patch.url) !== hostOf(app.url)) app.icon = null;
  if (urlChanged) app.icon = null;
  save();
  bus.emit('apps-changed');
  ensureIcon(app);
}

// L'application installée qui correspond le mieux à une adresse.
export function appForUrl(url) {
  const host = hostOf(url);
  if (!host) return null;
  let best = null;
  for (const app of Object.values(state.apps)) {
    if (app.kind !== 'web') continue;
    const ah = hostOf(app.url);
    if (ah && (host === ah || host.endsWith('.' + ah))) {
      if (!best || ah.length > hostOf(best.url).length) best = app;
    }
  }
  return best;
}

function hash(s) {
  let x = 0;
  for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) | 0;
  return x;
}
