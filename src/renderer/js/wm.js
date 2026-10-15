// Gestionnaire de fenêtres d'Atoll : fenêtres, espaces (bureaux et pleins
// espaces), aimantation aux bords, réduction dans le Dock, session.
import { h, $, $$, clamp, uid, bus, animate, reducedMotion, normalizeUrl, hostOf, debounce } from './util.js';
import { state, save } from './state.js';
import { getApp, appName, appIcon, appForUrl } from './apps.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { showMenu, toast } from './ui.js';
import { builtins } from './builtins.js';
import { prettyCombo } from './keys.js';

export const MENUBAR_H = 30;
const SNAP_EDGE = 6;
const windows = new Map();
let zTop = 10;
let focusedId = null;
const closedStack = [];

// --- Espaces ------------------------------------------------------------------------------
// Un espace est un bureau (plusieurs fenêtres) ou le plein espace d'une seule fenêtre.
const spaces = [];
let current = 0;
let strip;

function makeSpace(kind, winId = null) {
  const sp = { id: uid('sp'), kind, winId, el: h('div.space', { dataset: { kind } }) };
  return sp;
}

export function initSpaces() {
  strip = $('#spaces .strip');
  const count = clamp(state.spaces || 1, 1, 9);
  for (let i = 0; i < count; i++) {
    const sp = makeSpace('desktop');
    spaces.push(sp);
    strip.append(sp.el);
  }
  layoutStrip(false);
  addEventListener('resize', debounce(() => {
    layoutStrip(false);
    for (const w of windows.values()) {
      if (w.mode !== 'normal') applyMode(w, w.mode, false);
      else clampToArea(w);
    }
  }, 60));
}

function layoutStrip(animated = true) {
  spaces.forEach((sp, i) => { sp.el.style.left = (i * 100) + '%'; });
  strip.style.transition = animated && !reducedMotion() ? 'transform .42s cubic-bezier(.22,.9,.24,1)' : 'none';
  strip.style.transform = `translateX(${-current * 100}%)`;
  document.body.classList.toggle('in-app-space', spaces[current]?.kind === 'app');
  document.body.dataset.space = String(current);
}

export function getSpaces() { return spaces.map((s, i) => ({ ...s, index: i, current: i === current })); }
export function currentSpace() { return spaces[current]; }

export function goToSpace(i, { focus = true } = {}) {
  if (i < 0 || i >= spaces.length) return false;
  const changed = i !== current;
  current = i;
  layoutStrip(true);
  if (focus) {
    const top = topWindowIn(spaces[i]);
    if (top) focusWindow(top.id, { raise: false });
    else blurAll();
  }
  if (changed) bus.emit('space-changed', i);
  return true;
}
export const nextSpace = () => goToSpace(current + 1);
export const prevSpace = () => goToSpace(current - 1);

export function addDesktopSpace() {
  // Le nouveau bureau se place après le dernier bureau.
  let at = spaces.length;
  const sp = makeSpace('desktop');
  spaces.splice(at, 0, sp);
  strip.append(sp.el);
  state.spaces = spaces.filter((s) => s.kind === 'desktop').length;
  save();
  layoutStrip(false);
  bus.emit('spaces-changed');
  return at;
}

export function removeDesktopSpace(index) {
  const sp = spaces[index];
  if (!sp || sp.kind !== 'desktop' || spaces.filter((s) => s.kind === 'desktop').length <= 1) return;
  const target = spaces.find((s) => s.kind === 'desktop' && s !== sp);
  for (const w of windows.values()) if (w.spaceId === sp.id) { target.el.append(w.el); w.spaceId = target.id; w.homeSpaceId = target.id; }
  spaces.splice(index, 1);
  sp.el.remove();
  if (current >= spaces.length) current = spaces.length - 1;
  state.spaces = spaces.filter((s) => s.kind === 'desktop').length;
  save();
  layoutStrip(false);
  bus.emit('spaces-changed');
  saveSession();
}

function spaceById(id) { return spaces.find((s) => s.id === id); }
function topWindowIn(sp) {
  let best = null;
  for (const w of windows.values()) if (w.spaceId === sp.id && !w.minimized && (!best || w.z > best.z)) best = w;
  return best;
}

// --- Zone utile ------------------------------------------------------------------------
// Ce que « Agrandir » remplit : l'écran sous la barre de menus, au-dessus du Dock
// quand celui-ci reste affiché.
let dockReserve = () => 0;
export function setDockReserve(fn) { dockReserve = fn; }
export function workArea() {
  const W = innerWidth, H = innerHeight;
  const top = MENUBAR_H;
  return { x: 0, y: top, w: W, h: H - top - dockReserve() };
}

// --- Création ----------------------------------------------------------------------------
export function createWindow(appId, opts = {}) {
  const app = getApp(appId);
  if (!app) return null;
  if (app.id === 'launchpad') { bus.emit('launchpad:toggle'); return null; }
  const id = opts.id || uid('w');
  const area = workArea();
  const count = [...windows.values()].filter((w) => w.spaceId === spaces[current].id).length;
  const defW = builtins[app.id]?.size?.[0] || Math.min(1240, Math.round(area.w * 0.74));
  const defH = builtins[app.id]?.size?.[1] || Math.min(860, Math.round(area.h * 0.84));
  const w = Math.min(opts.rect?.w || defW, area.w);
  const hh = Math.min(opts.rect?.h || defH, area.h);
  const cascade = (count % 6) * 26;
  const win = {
    id, appId: app.id, app,
    kind: app.kind === 'web' ? 'web' : 'builtin',
    x: opts.rect?.x ?? Math.round(area.x + (area.w - w) / 2 + cascade - 60),
    y: opts.rect?.y ?? Math.round(area.y + Math.max(12, (area.h - hh) / 2 - 10) + cascade - 30),
    w, h: hh,
    mode: 'normal', restore: null,
    spaceId: spaces[current].kind === 'desktop' ? spaces[current].id : spaces.find((s) => s.kind === 'desktop').id,
    minimized: false,
    url: opts.url || app.url || '',
    title: appName(app),
    z: ++zTop,
    focusedAt: Date.now(),
    zoom: 1,
  };
  win.homeSpaceId = win.spaceId;
  buildWindow(win, opts);
  windows.set(id, win);
  spaceById(win.spaceId).el.append(win.el);
  place(win);
  clampToArea(win);

  if (opts.mode && opts.mode !== 'normal') {
    if (opts.mode === 'space') enterFullSpace(win, { animate: false, go: opts.focus !== false });
    else applyMode(win, opts.mode, false);
  }
  if (opts.minimized) { win.minimized = true; win.el.classList.add('minimized'); }
  else {
    const from = opts.fromRect;
    if (from && !reducedMotion()) {
      const r = win.el.getBoundingClientRect();
      const sx = from.width / r.width, sy = from.height / r.height;
      animate(win.el, [
        { transform: `translate(${from.left - r.left}px, ${from.top - r.top}px) scale(${sx}, ${sy})`, opacity: 0.2, transformOrigin: '0 0' },
        { transform: 'none', opacity: 1, transformOrigin: '0 0' },
      ], { duration: 340, easing: 'cubic-bezier(.2,.9,.25,1)' });
    } else {
      animate(win.el, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
    }
  }
  if (opts.focus !== false && !opts.minimized) focusWindow(id);
  bus.emit('windows-changed');
  saveSession();
  return win;
}

function buildWindow(win, opts) {
  const el = h('section.window', { dataset: { id: win.id, app: win.appId, kind: win.kind }, 'aria-label': win.title });
  const lights = h('div.lights', {},
    h('button.light.close', { type: 'button', title: t('menu.close'), html: icon('close'), on: { click: (e) => { e.stopPropagation(); closeWindow(win.id); } } }),
    h('button.light.min', { type: 'button', title: t('menu.minimize'), html: icon('minus'), on: { click: (e) => { e.stopPropagation(); minimizeWindow(win.id); } } }),
    h('button.light.zoom', { type: 'button', title: t('win.space'), html: icon('expand'), on: {
      click: (e) => { e.stopPropagation(); if (e.altKey) toggleMaximize(win.id); else toggleFullSpace(win.id); },
      contextmenu: (e) => { e.preventDefault(); e.stopPropagation(); zoomMenu(win, e.currentTarget); },
      mouseenter: (e) => { clearTimeout(win.zoomHover); const btn = e.currentTarget; win.zoomHover = setTimeout(() => zoomMenu(win, btn), 650); },
      mouseleave: () => clearTimeout(win.zoomHover),
    } }),
  );
  const titleText = h('span.win-title-text', {}, win.title);
  const titleIcon = h('span.win-title-icon', {}, appIcon(win.app, 16));
  const address = h('input.win-address', { type: 'text', spellcheck: false, autocomplete: 'off', 'aria-label': t('browser.placeholder'), placeholder: t('browser.placeholder') });
  const title = h('div.win-title', {}, titleIcon, titleText, address);
  const nav = win.kind === 'web' || win.appId === 'browser' ? h('div.win-nav', {},
    h('button.tb-btn', { type: 'button', title: t('menu.back'), html: icon('back'), on: { click: () => navBack(win) } }),
    h('button.tb-btn', { type: 'button', title: t('menu.forward'), html: icon('forward'), on: { click: () => navForward(win) } }),
    h('button.tb-btn.reload', { type: 'button', title: t('menu.reload'), html: icon('reload'), on: { click: () => reload(win) } }),
  ) : null;
  const actions = h('div.win-actions', {},
    h('button.tb-btn.space-btn', { type: 'button', title: t('win.space'), html: icon('expand'), on: { click: () => toggleFullSpace(win.id) } }),
    h('button.tb-btn', { type: 'button', title: t('win.menu'), html: icon('dots'), on: { click: (e) => windowMenu(win, e.currentTarget) } }),
  );
  const bar = h('header.win-titlebar', {}, lights, nav, title, actions);
  const body = h('div.win-body');
  const progress = h('div.win-progress');
  el.append(bar, progress, body);
  for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) el.append(h(`div.rz.rz-${edge}`, { dataset: { edge } }));
  win.el = el; win.bar = bar; win.body = body; win.titleText = titleText; win.titleIcon = titleIcon; win.address = address; win.progress = progress;

  // Focus au clic, n'importe où dans la fenêtre.
  el.addEventListener('pointerdown', () => focusWindow(win.id), true);
  bar.addEventListener('pointerdown', (e) => startDrag(win, e));
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button,input')) toggleMaximize(win.id); });
  el.querySelectorAll('.rz').forEach((handle) => handle.addEventListener('pointerdown', (e) => startResize(win, e, handle.dataset.edge)));

  // Barre d'adresse : clic sur le titre.
  title.addEventListener('click', (e) => { if (win.kind === 'web' || win.webview) editAddress(win); });
  address.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const u = toNavigable(address.value); if (u) navigate(win, u); stopAddress(win); }
    if (e.key === 'Escape') { e.preventDefault(); stopAddress(win); win.webview?.focus(); }
  });
  address.addEventListener('blur', () => stopAddress(win));

  if (win.kind === 'web') mountWebview(win, win.url);
  else builtins[win.appId]?.mount?.(win, body, opts);
}

function toNavigable(text) {
  return normalizeUrl(text) || 'https://www.google.com/search?q=' + encodeURIComponent(text.trim());
}

export function editAddress(win) {
  if (!win) return;
  win.el.classList.add('editing-address');
  win.address.value = win.url || '';
  win.address.focus();
  win.address.select();
}
function stopAddress(win) { win.el.classList.remove('editing-address'); }

// --- Pages web ------------------------------------------------------------------------------
export function mountWebview(win, url) {
  const wv = document.createElement('webview');
  wv.setAttribute('partition', 'persist:atoll');
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('webpreferences', 'contextIsolation=yes, sandbox=yes');
  wv.setAttribute('src', url || 'about:blank');
  win.webview = wv;
  win.kind = 'web';
  win.el.dataset.kind = 'web';
  win.body.replaceChildren(wv);

  const setTitle = (s) => {
    win.title = s || appName(win.app);
    win.titleText.textContent = win.title;
    win.el.setAttribute('aria-label', win.title);
    bus.emit('window-title', win);
  };
  wv.addEventListener('page-title-updated', (e) => setTitle(e.title));
  const onNav = (e) => {
    if (e.isMainFrame === false) return;
    win.url = e.url;
    win.el.dataset.host = hostOf(e.url);
    saveSessionSoon();
    bus.emit('window-url', win);
  };
  wv.addEventListener('did-navigate', onNav);
  wv.addEventListener('did-navigate-in-page', onNav);
  wv.addEventListener('did-start-loading', () => win.el.classList.add('loading'));
  wv.addEventListener('did-stop-loading', () => win.el.classList.remove('loading'));
  wv.addEventListener('focus', () => focusWindow(win.id, { fromPage: true }));
  wv.addEventListener('dom-ready', () => {
    if (!win.ready) {
      win.ready = true;
      win.wcId = wv.getWebContentsId();
      if (state.settings.muted) wv.setAudioMuted(true);
      if (win.zoom !== 1) wv.setZoomFactor(win.zoom);
    }
  });
  wv.addEventListener('page-favicon-updated', (e) => {
    const fav = e.favicons?.[0];
    if (fav && win.appId === 'browser') win.titleIcon.replaceChildren(h('img', { src: fav, alt: '', onerror: function () { this.remove(); } }));
  });
  wv.addEventListener('enter-html-full-screen', () => { win.htmlFullscreen = true; if (win.mode !== 'space') { win.wasSpace = false; enterFullSpace(win); } else win.wasSpace = true; });
  wv.addEventListener('leave-html-full-screen', () => { win.htmlFullscreen = false; if (!win.wasSpace && win.mode === 'space') leaveFullSpace(win); });
  wv.addEventListener('render-process-gone', () => {
    win.body.append(h('div.win-crash', {}, h('p', {}, t('win.crashed')), h('button.btn.primary', { type: 'button', on: { click: () => mountWebview(win, win.url) } }, t('win.restart'))));
  });
  wv.addEventListener('found-in-page', (e) => bus.emit('found-in-page', win, e.result));
}

export function navigate(win, url) {
  if (!win) return;
  if (!win.webview) { mountWebview(win, url); win.url = url; return; }
  win.webview.loadURL(url).catch(() => {});
  win.webview.focus();
}
function navBack(win) { if (win.webview?.canGoBack()) win.webview.goBack(); }
function navForward(win) { if (win.webview?.canGoForward()) win.webview.goForward(); }
function reload(win, hard) { if (!win.webview) return; hard ? win.webview.reloadIgnoringCache() : win.webview.reload(); }

// --- Placement -------------------------------------------------------------------------------
function place(win) {
  const s = win.el.style;
  s.left = win.x + 'px'; s.top = win.y + 'px'; s.width = win.w + 'px'; s.height = win.h + 'px';
  s.zIndex = win.z;
}

function clampToArea(win) {
  if (win.mode !== 'normal') return;
  const W = innerWidth, H = innerHeight;
  win.w = Math.min(win.w, W);
  win.h = Math.min(win.h, H - MENUBAR_H);
  win.x = clamp(win.x, -win.w + 120, W - 120);
  win.y = clamp(win.y, MENUBAR_H, H - 60);
  place(win);
}

function rectFor(mode) {
  const a = workArea();
  const gap = 0;
  switch (mode) {
    case 'max': return { x: a.x + gap, y: a.y + gap, w: a.w - gap * 2, h: a.h - gap * 2 };
    case 'left': return { x: a.x, y: a.y, w: Math.round(a.w / 2), h: a.h };
    case 'right': return { x: a.x + Math.round(a.w / 2), y: a.y, w: a.w - Math.round(a.w / 2), h: a.h };
    case 'tl': return { x: a.x, y: a.y, w: Math.round(a.w / 2), h: Math.round(a.h / 2) };
    case 'tr': return { x: a.x + Math.round(a.w / 2), y: a.y, w: a.w - Math.round(a.w / 2), h: Math.round(a.h / 2) };
    case 'bl': return { x: a.x, y: a.y + Math.round(a.h / 2), w: Math.round(a.w / 2), h: a.h - Math.round(a.h / 2) };
    case 'br': return { x: a.x + Math.round(a.w / 2), y: a.y + Math.round(a.h / 2), w: a.w - Math.round(a.w / 2), h: a.h - Math.round(a.h / 2) };
    case 'space': return { x: 0, y: 0, w: innerWidth, h: innerHeight };
    default: return null;
  }
}

function applyMode(win, mode, animated = true) {
  if (mode === 'normal') {
    const r = win.restore || { x: win.x, y: win.y, w: win.w, h: win.h };
    win.mode = 'normal';
    win.restore = null;
    morph(win, r, animated);
  } else {
    if (win.mode === 'normal') win.restore = { x: win.x, y: win.y, w: win.w, h: win.h };
    win.mode = mode;
    morph(win, rectFor(mode), animated);
  }
  win.el.dataset.mode = win.mode;
  saveSessionSoon();
  bus.emit('windows-changed');
}

function morph(win, r, animated) {
  const el = win.el;
  if (animated && !reducedMotion()) {
    el.classList.add('morphing');
    clearTimeout(win.morphTimer);
    win.morphTimer = setTimeout(() => el.classList.remove('morphing'), 300);
  }
  Object.assign(win, r);
  place(win);
}

export function toggleMaximize(id = focusedId) {
  const win = windows.get(id);
  if (!win || win.mode === 'space') return;
  applyMode(win, win.mode === 'max' ? 'normal' : 'max');
}
export function tile(id = focusedId, mode) {
  const win = windows.get(id);
  if (!win) return;
  if (win.mode === 'space') leaveFullSpace(win);
  applyMode(win, win.mode === mode ? 'normal' : mode);
}
export function centerWindow(id = focusedId) {
  const win = windows.get(id);
  if (!win) return;
  if (win.mode !== 'normal') applyMode(win, 'normal', false);
  const a = workArea();
  morph(win, { x: Math.round(a.x + (a.w - win.w) / 2), y: Math.round(a.y + (a.h - win.h) / 2), w: win.w, h: win.h }, true);
  saveSessionSoon();
}

// --- Plein espace -----------------------------------------------------------------------
// La fenêtre quitte le bureau pour son propre espace, sans bordure ni barre.
export function enterFullSpace(win, { animate: anim = true, go = true } = {}) {
  if (!win || win.mode === 'space') return;
  if (win.minimized) restoreWindow(win.id);
  win.restore = win.mode === 'normal' ? { x: win.x, y: win.y, w: win.w, h: win.h } : (win.restore || { x: win.x, y: win.y, w: win.w, h: win.h });
  win.prevMode = win.mode;
  const from = win.el.getBoundingClientRect();
  const home = spaces.findIndex((s) => s.id === win.spaceId);
  const sp = makeSpace('app', win.id);
  const at = Math.max(home, current) + 1;
  spaces.splice(at, 0, sp);
  strip.append(sp.el);
  sp.el.append(win.el);
  win.spaceId = sp.id;
  win.mode = 'space';
  win.el.dataset.mode = 'space';
  Object.assign(win, rectFor('space'));
  place(win);
  layoutStrip(false);
  if (go) {
    current = at;
    layoutStrip(false);
    if (anim && !reducedMotion()) {
      const to = win.el.getBoundingClientRect();
      animate(win.el, [
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, transformOrigin: '0 0', borderRadius: '12px' },
        { transform: 'none', transformOrigin: '0 0', borderRadius: '0px' },
      ], { duration: 380, easing: 'cubic-bezier(.22,.9,.24,1)' });
    }
    focusWindow(win.id);
    bus.emit('space-changed', current);
  }
  bus.emit('spaces-changed');
  bus.emit('windows-changed');
  bus.emit('entered-space', win);
  saveSessionSoon();
}

export function leaveFullSpace(win) {
  if (!win || win.mode !== 'space') return;
  const idx = spaces.findIndex((s) => s.id === win.spaceId);
  const home = spaceById(win.homeSpaceId) || spaces.find((s) => s.kind === 'desktop');
  home.el.append(win.el);
  win.spaceId = home.id;
  if (idx >= 0) { spaces[idx].el.remove(); spaces.splice(idx, 1); }
  const homeIdx = spaces.indexOf(home);
  const prev = win.prevMode && win.prevMode !== 'space' ? win.prevMode : 'normal';
  win.mode = 'normal';
  if (prev !== 'normal') {
    const restore = win.restore;
    applyMode(win, prev, false);
    win.restore = restore;
  } else {
    Object.assign(win, win.restore || {});
    win.restore = null;
    place(win);
  }
  win.el.dataset.mode = win.mode;
  current = homeIdx;
  layoutStrip(false);
  if (!reducedMotion()) animate(win.el, [{ transform: 'scale(1.06)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 300 });
  focusWindow(win.id);
  bus.emit('space-changed', current);
  bus.emit('spaces-changed');
  bus.emit('windows-changed');
  saveSessionSoon();
}

export function toggleFullSpace(id = focusedId) {
  const win = windows.get(id);
  if (!win) return;
  win.mode === 'space' ? leaveFullSpace(win) : enterFullSpace(win);
}

// --- Focus -------------------------------------------------------------------------------------
export function focusWindow(id, { raise = true, fromPage = false } = {}) {
  const win = windows.get(id);
  if (!win) return;
  if (win.minimized) { restoreWindow(id); return; }
  const idx = spaces.findIndex((s) => s.id === win.spaceId);
  if (idx !== current && idx >= 0) goToSpace(idx, { focus: false });
  if (raise && win.z !== zTop) { win.z = ++zTop; win.el.style.zIndex = win.z; }
  win.focusedAt = Date.now();
  if (focusedId !== id) {
    for (const w of windows.values()) w.el.classList.toggle('focused', w.id === id);
    focusedId = id;
    bus.emit('focus-changed', win);
  }
  if (!fromPage && !win.el.classList.contains('editing-address')) {
    if (win.webview) win.webview.focus();
    else builtins[win.appId]?.focus?.(win);
  }
}

export function blurAll() {
  if (focusedId === null) return;
  for (const w of windows.values()) w.el.classList.remove('focused');
  focusedId = null;
  bus.emit('focus-changed', null);
}

export const focused = () => windows.get(focusedId) || null;
export const getWindow = (id) => windows.get(id) || null;
export const allWindows = () => [...windows.values()];
export const windowsOfApp = (appId) => [...windows.values()].filter((w) => w.appId === appId);
export const windowByWebContents = (wcId) => [...windows.values()].find((w) => w.wcId === wcId) || null;
export function windowsInCurrentSpace() { return [...windows.values()].filter((w) => w.spaceId === spaces[current].id); }

// Les fenêtres par ordre d'utilisation (la plus récente d'abord).
export function windowsByRecency() { return [...windows.values()].sort((a, b) => b.focusedAt - a.focusedAt); }

// --- Fermer, réduire ---------------------------------------------------------------------
export async function closeWindow(id = focusedId) {
  const win = windows.get(id);
  if (!win) return;
  builtins[win.appId]?.beforeClose?.(win);
  closedStack.push({ appId: win.appId, url: win.url, rect: win.restore || { x: win.x, y: win.y, w: win.w, h: win.h } });
  if (closedStack.length > 20) closedStack.shift();
  if (win.mode === 'space') {
    const idx = spaces.findIndex((s) => s.id === win.spaceId);
    const home = spaces.indexOf(spaceById(win.homeSpaceId) || spaces.find((s) => s.kind === 'desktop'));
    windows.delete(id);
    await animate(win.el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 180 });
    win.el.remove();
    if (idx >= 0) { spaces[idx].el.remove(); spaces.splice(idx, 1); }
    current = clamp(home < 0 ? 0 : home, 0, spaces.length - 1);
    layoutStrip(true);
    bus.emit('spaces-changed');
  } else {
    windows.delete(id);
    await animate(win.el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 170, easing: 'ease-in' });
    win.el.remove();
  }
  if (focusedId === id) {
    focusedId = null;
    const next = topWindowIn(spaces[current]);
    if (next) focusWindow(next.id); else bus.emit('focus-changed', null);
  }
  bus.emit('windows-changed');
  saveSession();
}

export function reopenClosed() {
  const last = closedStack.pop();
  if (last) createWindow(last.appId, { url: last.url, rect: last.rect });
}

let dockTarget = () => null;
export function setDockTarget(fn) { dockTarget = fn; }

export async function minimizeWindow(id = focusedId) {
  const win = windows.get(id);
  if (!win || win.minimized) return;
  if (win.mode === 'space') leaveFullSpace(win);
  const target = dockTarget(win.appId);
  if (target && !reducedMotion()) {
    const r = win.el.getBoundingClientRect();
    const tx = target.left + target.width / 2 - (r.left + r.width / 2);
    const ty = target.top + target.height / 2 - (r.top + r.height / 2);
    const s = Math.max(0.04, target.width / r.width);
    // Effet « génie » : la fenêtre s'étire vers le Dock avant de s'y loger.
    await animate(win.el, [
      { transform: 'none', opacity: 1, offset: 0 },
      { transform: `translate(${tx * 0.35}px, ${ty * 0.55}px) scale(${0.6}, ${0.75})`, opacity: 0.85, offset: 0.45 },
      { transform: `translate(${tx}px, ${ty}px) scale(${s})`, opacity: 0, offset: 1 },
    ], { duration: 420, easing: 'cubic-bezier(.5,0,.75,.4)' });
  }
  win.minimized = true;
  win.el.classList.add('minimized');
  if (focusedId === id) {
    focusedId = null;
    win.el.classList.remove('focused');
    const next = topWindowIn(spaces[current]);
    if (next) focusWindow(next.id); else bus.emit('focus-changed', null);
  }
  bus.emit('windows-changed');
  saveSessionSoon();
}

export async function restoreWindow(id) {
  const win = windows.get(id);
  if (!win) return;
  if (!win.minimized) { focusWindow(id); return; }
  win.minimized = false;
  win.el.classList.remove('minimized');
  const idx = spaces.findIndex((s) => s.id === win.spaceId);
  if (idx !== current) goToSpace(idx, { focus: false });
  focusWindow(id);
  const target = dockTarget(win.appId);
  if (target && !reducedMotion()) {
    const r = win.el.getBoundingClientRect();
    const tx = target.left + target.width / 2 - (r.left + r.width / 2);
    const ty = target.top + target.height / 2 - (r.top + r.height / 2);
    await animate(win.el, [
      { transform: `translate(${tx}px, ${ty}px) scale(${Math.max(0.04, target.width / r.width)})`, opacity: 0 },
      { transform: `translate(${tx * 0.35}px, ${ty * 0.55}px) scale(.6, .75)`, opacity: 0.85, offset: 0.55 },
      { transform: 'none', opacity: 1 },
    ], { duration: 380, easing: 'cubic-bezier(.25,.6,.3,1)' });
  }
  bus.emit('windows-changed');
  saveSessionSoon();
}

export function hideApp(appId) {
  for (const w of windowsOfApp(appId)) minimizeWindow(w.id);
}

// Afficher le bureau : écarte toutes les fenêtres, puis les ramène.
let desktopShown = false;
export function toggleShowDesktop() {
  desktopShown = !desktopShown;
  document.body.classList.toggle('show-desktop', desktopShown);
  if (desktopShown) {
    blurAll();
    document.activeElement?.blur?.();
    document.getElementById('desktop')?.focus({ preventScroll: true });
  } else { const top = topWindowIn(spaces[current]); if (top) focusWindow(top.id); }
}
bus.on('focus-changed', (w) => { if (w && desktopShown) { desktopShown = false; document.body.classList.remove('show-desktop'); } });

// --- Lancer ---------------------------------------------------------------------------------
export function launch(appId, opts = {}) {
  const app = getApp(appId);
  if (!app) return;
  if (app.id === 'launchpad') { bus.emit('launchpad:toggle'); return; }
  const list = windowsOfApp(appId).sort((a, b) => b.focusedAt - a.focusedAt);
  if (list.length && !opts.newWindow) {
    const visible = list.find((w) => !w.minimized);
    if (visible) focusWindow(visible.id);
    else restoreWindow(list[0].id);
    return;
  }
  createWindow(appId, opts);
}

export function openUrl(url, opts = {}) {
  const app = appForUrl(url);
  return createWindow(app ? app.id : 'browser', { url, focus: !opts.background, ...opts });
}

// --- Déplacement et redimensionnement -------------------------------------------------------
let snapPreview;
function showSnap(mode) {
  snapPreview ||= $('#snap-preview');
  if (!mode) { snapPreview.classList.remove('visible'); return; }
  const r = rectFor(mode);
  Object.assign(snapPreview.style, { left: r.x + 8 + 'px', top: r.y + 8 + 'px', width: r.w - 16 + 'px', height: r.h - 16 + 'px' });
  snapPreview.classList.add('visible');
}

function snapModeAt(x, y) {
  const W = innerWidth, H = innerHeight;
  const corner = 60;
  if (x <= SNAP_EDGE) return y < MENUBAR_H + corner ? 'tl' : y > H - corner ? 'bl' : 'left';
  if (x >= W - SNAP_EDGE) return y < MENUBAR_H + corner ? 'tr' : y > H - corner ? 'br' : 'right';
  if (y <= MENUBAR_H + 2) return 'max';
  return null;
}

function startDrag(win, e) {
  if (e.button !== 0 || e.target.closest('button,input,.lights')) return;
  if (win.mode === 'space') return;
  e.preventDefault();
  const startX = e.clientX, startY = e.clientY;
  let ox = startX - win.x, oy = startY - win.y;
  let moved = false;
  let snap = null;
  const bar = win.bar;
  bar.setPointerCapture(e.pointerId);
  document.body.classList.add('dragging-window');

  const onMove = (ev) => {
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    if (!moved) {
      moved = true;
      if (win.mode !== 'normal') {
        // Une fenêtre agrandie reprend sa taille sous le pointeur.
        const r = win.restore || { w: win.w * 0.7, h: win.h * 0.7 };
        const ratio = (startX - win.x) / win.w;
        win.mode = 'normal';
        win.el.dataset.mode = 'normal';
        win.w = r.w; win.h = r.h;
        win.restore = null;
        ox = Math.round(win.w * ratio);
        oy = Math.min(oy, 20);
      }
    }
    win.x = Math.round(ev.clientX - ox);
    win.y = Math.round(Math.max(MENUBAR_H, ev.clientY - oy));
    place(win);
    const s = snapModeAt(ev.clientX, ev.clientY);
    if (s !== snap) { snap = s; showSnap(s); }
  };
  const onUp = () => {
    bar.removeEventListener('pointermove', onMove);
    bar.removeEventListener('pointerup', onUp);
    bar.removeEventListener('pointercancel', onUp);
    document.body.classList.remove('dragging-window');
    showSnap(null);
    if (snap) applyMode(win, snap);
    else if (moved) { clampToArea(win); saveSessionSoon(); bus.emit('windows-changed'); }
  };
  bar.addEventListener('pointermove', onMove);
  bar.addEventListener('pointerup', onUp);
  bar.addEventListener('pointercancel', onUp);
}

function startResize(win, e, edge) {
  if (e.button !== 0 || win.mode === 'space') return;
  e.preventDefault();
  e.stopPropagation();
  const handle = e.currentTarget;
  handle.setPointerCapture(e.pointerId);
  if (win.mode !== 'normal') { win.mode = 'normal'; win.restore = null; win.el.dataset.mode = 'normal'; }
  const start = { x: e.clientX, y: e.clientY, wx: win.x, wy: win.y, ww: win.w, wh: win.h };
  const minW = 360, minH = 220;
  document.body.classList.add('dragging-window');
  const onMove = (ev) => {
    const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
    let { wx: x, wy: y, ww: w, wh: hh } = start;
    if (edge.includes('e')) w = Math.max(minW, start.ww + dx);
    if (edge.includes('s')) hh = Math.max(minH, start.wh + dy);
    if (edge.includes('w')) { w = Math.max(minW, start.ww - dx); x = start.wx + start.ww - w; }
    if (edge.includes('n')) { hh = Math.max(minH, start.wh - dy); y = start.wy + start.wh - hh; if (y < MENUBAR_H) { hh -= MENUBAR_H - y; y = MENUBAR_H; } }
    Object.assign(win, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) });
    place(win);
  };
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    document.body.classList.remove('dragging-window');
    saveSessionSoon();
    bus.emit('windows-changed');
  };
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
}

// --- Menus de fenêtre --------------------------------------------------------------------------
function zoomMenu(win, anchor) {
  const r = anchor.getBoundingClientRect();
  showMenu([
    { label: win.mode === 'space' ? t('menu.leaveSpace') : t('menu.space'), icon: win.mode === 'space' ? 'shrink' : 'expand', combo: 'Mod+Shift+F', action: () => toggleFullSpace(win.id) },
    { label: t('menu.zoom'), icon: 'maximize', checked: win.mode === 'max', action: () => toggleMaximize(win.id) },
    '-',
    { label: t('menu.tileLeft'), icon: 'splitLeft', checked: win.mode === 'left', action: () => tile(win.id, 'left') },
    { label: t('menu.tileRight'), icon: 'splitRight', checked: win.mode === 'right', action: () => tile(win.id, 'right') },
    { label: t('menu.center'), icon: 'monitor', action: () => centerWindow(win.id) },
  ], r.left, r.bottom + 6, { anchor });
}

export function windowMenu(win, anchor) {
  const r = anchor.getBoundingClientRect();
  const items = [];
  if (win.webview) {
    items.push(
      { label: t('menu.install'), icon: 'plus', action: () => bus.emit('install-window', win) },
      { label: t('menu.copyLink'), icon: 'link', action: () => navigator.clipboard.writeText(win.url) },
      { label: t('menu.openExternal'), icon: 'external', action: () => window.atoll.openExternal(win.url) },
      '-',
      { label: t('menu.find'), icon: 'search', combo: 'Mod+F', action: () => bus.emit('find', win) },
      { label: t('menu.zoomIn'), icon: 'zoomIn', combo: 'Mod+=', action: () => zoomBy(win, 0.1) },
      { label: t('menu.zoomOut'), combo: 'Mod+-', action: () => zoomBy(win, -0.1) },
      { label: t('menu.zoomReset'), combo: 'Mod+0', action: () => zoomBy(win, 0) },
      '-',
      { label: t('menu.devtools'), combo: 'Mod+Alt+I', action: () => win.webview.openDevTools() },
      '-',
    );
  }
  items.push(
    { label: win.mode === 'space' ? t('menu.leaveSpace') : t('menu.space'), icon: 'expand', combo: 'Mod+Shift+F', action: () => toggleFullSpace(win.id) },
    { label: t('menu.minimize'), icon: 'minus', combo: 'Mod+M', action: () => minimizeWindow(win.id) },
    { label: t('menu.close'), icon: 'close', combo: 'Mod+W', action: () => closeWindow(win.id) },
  );
  showMenu(items, r.right - 260, r.bottom + 6, { anchor });
}

export function zoomBy(win, delta) {
  if (!win?.webview) return;
  win.zoom = delta === 0 ? 1 : clamp(Math.round((win.zoom + delta) * 10) / 10, 0.3, 3);
  win.webview.setZoomFactor(win.zoom);
  toast(`${Math.round(win.zoom * 100)} %`, { icon: 'zoomIn', timeout: 1200 });
}

export const pageActions = {
  back: (win) => win && navBack(win),
  forward: (win) => win && navForward(win),
  reload: (win, hard) => win && reload(win, hard),
};

export function spaceHint() {
  toast(t('toast.spaceHint', { key: prettyCombo('Mod+Shift+F') }), { icon: 'expand', timeout: 5200 });
}

// --- Session -----------------------------------------------------------------------------
function saveSession() {
  state.session = [...windows.values()].filter((w) => w.appId !== 'welcome').map((w) => ({
    appId: w.appId,
    url: w.kind === 'web' ? w.url : undefined,
    rect: w.mode === 'normal' ? { x: w.x, y: w.y, w: w.w, h: w.h } : (w.restore || { x: w.x, y: w.y, w: w.w, h: w.h }),
    mode: w.mode,
    minimized: w.minimized,
    space: Math.max(0, spaces.filter((s) => s.kind === 'desktop').findIndex((s) => s.id === w.homeSpaceId)),
    data: builtins[w.appId]?.serialize?.(w),
    z: w.z,
  }));
  save();
}
const saveSessionSoon = debounce(saveSession, 400);

export function restoreSession() {
  const list = (state.session || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0));
  const desktops = spaces.filter((s) => s.kind === 'desktop');
  let lastSpaceWin = null;
  for (const item of list) {
    if (!getApp(item.appId)) continue;
    const ds = desktops[item.space] || desktops[0];
    current = spaces.indexOf(ds);
    const win = createWindow(item.appId, { url: item.url, rect: item.rect, mode: item.mode === 'space' ? 'normal' : item.mode, minimized: item.minimized, focus: false, data: item.data });
    if (win && item.mode === 'space') { enterFullSpace(win, { animate: false, go: false }); lastSpaceWin = win; }
  }
  current = 0;
  layoutStrip(false);
  const top = topWindowIn(spaces[0]);
  if (top) focusWindow(top.id);
  return list.length;
}
