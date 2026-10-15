// Démarrage de la coquille d'Atoll.
import { h, $, bus, hostOf } from './util.js';
import { state, setSetting, save } from './state.js';
import { setLang, t } from './i18n.js';
import { LOGO, icon } from './icons.js';
import { applyWallpaper } from './wallpaper.js';
import { ensureAllIcons, getApp, appName, addWebApp, appForUrl } from './apps.js';
import * as wm from './wm.js';
import { initEdges, edges } from './edges.js';
import { initCommands } from './commands.js';
import { initMenubar } from './menubar.js';
import { initDock, focusDock } from './dock.js';
import { initDesktop, focusDesktop } from './desktop.js';
import { initOverlays } from './overlays.js';
import { addAppDialog, editAppDialog, prettyHost, ACCENTS } from './builtins.js';
import { toast, showMenu } from './ui.js';

// --- Thème et couleur d'accentuation ------------------------------------------------------------
const media = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const mode = state.settings.theme;
  const dark = mode === 'dark' || (mode === 'auto' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  window.atoll?.setTheme(mode === 'auto' ? 'system' : mode);
}
function applyAccent() {
  const a = ACCENTS.find((x) => x[0] === state.settings.accent) || ACCENTS[0];
  document.documentElement.style.setProperty('--accent', a[1]);
}
media.addEventListener('change', applyTheme);

// --- Écran de démarrage -----------------------------------------------------------------------------
function bootScreen() {
  const env = window.atoll?.env || {};
  if (!state.settings.bootAnimation || (env.test && !env.demo)) return Promise.resolve();
  const node = h('div#boot', {}, h('div.boot-logo', { html: LOGO }), h('div.boot-bar', {}, h('i')));
  document.body.append(node);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      node.classList.add('leaving');
      document.body.classList.add('booted');
      setTimeout(() => node.remove(), 700);
      resolve();
    };
    setTimeout(finish, 1300);
    addEventListener('keydown', finish, { once: true });
    node.addEventListener('pointerdown', finish);
  });
}

// --- Recherche dans la page ----------------------------------------------------------------------------
function openFind(win) {
  if (!win?.webview) return;
  let bar = win.el.querySelector('.find-bar');
  if (bar) { bar.querySelector('input').select(); bar.querySelector('input').focus(); return; }
  const input = h('input', { type: 'text', placeholder: t('win.find'), spellcheck: false });
  const count = h('span.find-count');
  const run = (forward = true, next = false) => {
    const q = input.value;
    if (!q) { win.webview.stopFindInPage('clearSelection'); count.textContent = ''; return; }
    win.webview.findInPage(q, { forward, findNext: !next });
  };
  const close = () => { win.webview.stopFindInPage('clearSelection'); bar.remove(); off(); win.webview.focus(); };
  bar = h('div.find-bar', {}, h('span', { html: icon('search') }), input, count,
    h('button.tb-btn', { type: 'button', html: icon('back'), title: 'Précédent', on: { click: () => run(false, true) } }),
    h('button.tb-btn', { type: 'button', html: icon('forward'), title: 'Suivant', on: { click: () => run(true, true) } }),
    h('button.tb-btn', { type: 'button', html: icon('close'), title: 'Fermer', on: { click: close } }));
  let typed = false;
  input.addEventListener('input', () => { typed = true; run(true, false); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); run(!e.shiftKey, !typed ? true : true); typed = false; }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  const off = bus.on('found-in-page', (w, result) => {
    if (w !== win || !result) return;
    count.textContent = result.matches ? `${result.activeMatchOrdinal}/${result.matches}` : '0';
  });
  win.el.append(bar);
  input.focus();
}

// --- Installer une page ouverte comme application -----------------------------------------------------
function installWindow(win) {
  if (!win?.url || !/^https?:/.test(win.url)) return;
  const existing = appForUrl(win.url);
  const sameOrigin = existing && hostOf(existing.url) === hostOf(win.url);
  if (sameOrigin && win.appId === existing.id) { toast(`${appName(existing)} est déjà installée.`, { icon: 'check' }); return; }
  const raw = (win.title || '').split(/\s[-–|·:]\s/)[0].trim();
  const name = raw && raw.length <= 24 ? raw : prettyHost(win.url);
  const app = addWebApp({ name, url: win.url });
  toast(t('toast.installed', { name: app.name }), { icon: 'check' });
}

// --- Démarrage --------------------------------------------------------------------------------------------
async function boot() {
  setLang(state.settings.lang);
  applyTheme();
  applyAccent();
  applyWallpaper();
  document.documentElement.classList.toggle('reduce-motion', !!state.settings.reduceMotion);
  if (window.atoll?.env?.test && !window.atoll?.env?.demo) document.documentElement.classList.add('test-mode');

  wm.initSpaces();
  initEdges();
  initCommands();
  initMenubar();
  initDock();
  initDesktop();
  initOverlays();

  bus.on('settings', (key, value) => {
    if (key === 'theme') applyTheme();
    if (key === 'accent') applyAccent();
    if (key === 'lang') setLang(value);
    if (key === 'muted') for (const w of wm.allWindows()) w.webview?.setAudioMuted?.(!!value);
    if (key === 'doNotDisturb') window.atoll?.setDoNotDisturb(!!value);
  });
  window.atoll?.setDoNotDisturb(!!state.settings.doNotDisturb);
  bus.on('app:add', () => addAppDialog());
  bus.on('app:edit', (id) => editAppDialog(id));
  bus.on('install-window', installWindow);
  bus.on('find', openFind);
  bus.on('dock:focus', focusDock);
  bus.on('app:menu', (id, x, y) => {
    const app = getApp(id);
    if (!app) return;
    showMenu([
      { label: t('menu.open'), icon: 'external', action: () => wm.launch(id) },
      state.dock.includes(id) ? null : { label: t('menu.keepInDock'), icon: 'star', action: () => import('./dock.js').then((m) => m.insertInDock(id)) },
      state.desktop.some((d) => d.appId === id) ? null : { label: t('menu.addToDesktop'), icon: 'monitor', action: () => bus.emit('desktop:add', id) },
      app.kind === 'web' ? { label: t('menu.editApp'), icon: 'pencil', action: () => bus.emit('app:edit', id) } : null,
    ], x, y);
  });

  window.atoll?.onOpenUrl(({ url, from, background }) => {
    const src = from != null ? wm.windowByWebContents(from) : null;
    wm.openUrl(url, { background, rect: src && src.mode === 'normal' ? { x: src.x + 28, y: src.y + 28, w: src.w, h: src.h } : undefined });
  });
  window.atoll?.onInstallPage((wcId) => installWindow(wm.windowByWebContents(wcId)));
  window.atoll?.onDownload(({ state: st, name }) => {
    if (st === 'started') toast(t('toast.downloading', { name }), { icon: 'download', timeout: 2500 });
    else if (st === 'completed') toast(t('toast.downloaded', { name }), { icon: 'check' });
  });
  window.atoll?.onFocus((on) => document.body.classList.toggle('inactive', !on));

  await bootScreen();
  document.body.classList.add('booted');

  const restored = wm.restoreSession();
  if (state.firstRun) {
    state.firstRun = false;
    save();
    setTimeout(() => wm.launch('welcome'), window.atoll?.env?.test ? 0 : 450);
  } else if (!restored) focusDesktop();
  setTimeout(ensureAllIcons, window.atoll?.env?.test ? 0 : 800);
  window.__atoll = { wm, state, bus, edges, addWebApp };
  document.body.dataset.ready = '1';
}

boot();
