// Le Dock : applications favorites, applications ouvertes, agrandissement au
// survol, réorganisation par glisser-déposer, apparition près du bas de l'écran.
import { h, $, clamp, bus, animate, reducedMotion } from './util.js';
import { state, save } from './state.js';
import { getApp, appName, appIcon } from './apps.js';
import * as wm from './wm.js';
import { showMenu, toast } from './ui.js';
import { t } from './i18n.js';
import { edges } from './edges.js';

let dock, inner;
const MARGIN = 10;
let magnifyRaf = 0;
let pointerX = null;
let dragging = null;

export function initDock() {
  dock = $('#dock');
  inner = h('div.dock-inner', { role: 'toolbar', 'aria-label': 'Dock' });
  dock.append(inner);
  render();
  bus.on('apps-changed', render);
  bus.on('windows-changed', () => { renderRunning(); updateVisibility(); });
  bus.on('focus-changed', renderRunning);
  bus.on('space-changed', updateVisibility);
  bus.on('settings', (key) => {
    if (key.startsWith('dock')) { render(); updateVisibility(); }
  });
  bus.on('edges', updateVisibility);

  inner.addEventListener('pointermove', (e) => { pointerX = e.clientX; scheduleMagnify(); });
  inner.addEventListener('pointerleave', () => { pointerX = null; scheduleMagnify(); });

  wm.setDockReserve(() => (state.settings.dockMode === 'always' && wm.currentSpace()?.kind === 'desktop' ? dockHeight() + MARGIN * 2 : 0));
  wm.setDockTarget((appId) => {
    const item = inner.querySelector(`.dock-item[data-app="${CSS.escape(appId)}"]`) || inner;
    return item.getBoundingClientRect();
  });
  bus.on('window-created', (win) => bounce(win.appId));
  updateVisibility();
}

export function dockHeight() { return state.settings.dockSize + 16; }

function render() {
  const size = state.settings.dockSize;
  dock.style.setProperty('--dock-size', size + 'px');
  dock.classList.toggle('magnify', !!state.settings.dockMagnify);
  inner.replaceChildren();
  for (const id of state.dock) {
    const app = getApp(id);
    if (app) inner.append(item(app, true));
  }
  inner.append(h('div.dock-sep.running-sep'));
  renderRunning();
}

// Les applications ouvertes qui ne sont pas dans le Dock s'affichent après le séparateur.
function renderRunning() {
  if (!inner) return;
  const running = new Set(wm.allWindows().map((w) => w.appId));
  const focused = wm.focused()?.appId;
  inner.querySelectorAll('.dock-item.transient').forEach((n) => { if (!running.has(n.dataset.app)) n.remove(); });
  const sep = inner.querySelector('.running-sep');
  for (const appId of running) {
    if (state.dock.includes(appId) || inner.querySelector(`.dock-item.transient[data-app="${CSS.escape(appId)}"]`)) continue;
    const app = getApp(appId);
    if (app) inner.append(item(app, false));
  }
  sep.hidden = !inner.querySelector('.dock-item.transient');
  inner.querySelectorAll('.dock-item').forEach((n) => {
    n.classList.toggle('running', running.has(n.dataset.app));
    n.classList.toggle('active', n.dataset.app === focused);
  });
}

function item(app, pinned) {
  const btn = h('button.dock-item', { type: 'button', dataset: { app: app.id }, 'aria-label': appName(app) });
  if (!pinned) btn.classList.add('transient');
  btn.append(appIcon(app), h('span.dock-label', {}, appName(app)), h('span.dock-dot'));
  btn.addEventListener('click', (e) => {
    if (btn.dataset.suppressClick) { delete btn.dataset.suppressClick; return; }
    const isNew = !wm.windowsOfApp(app.id).length || e.altKey || e.metaKey;
    if (isNew && app.id !== 'launchpad') bounce(app.id);
    wm.launch(app.id, { newWindow: e.altKey || e.metaKey, fromRect: btn.getBoundingClientRect() });
  });
  btn.addEventListener('contextmenu', (e) => { e.preventDefault(); itemMenu(app, btn); });
  btn.addEventListener('pointerdown', (e) => startDrag(e, btn, app));
  return btn;
}

export function bounce(appId) {
  const node = inner?.querySelector(`.dock-item[data-app="${CSS.escape(appId)}"] .app-icon`);
  if (!node || reducedMotion()) return;
  animate(node, [
    { transform: 'translateY(0)' }, { transform: 'translateY(-18px)', offset: 0.3 },
    { transform: 'translateY(0)', offset: 0.6 }, { transform: 'translateY(-7px)', offset: 0.8 }, { transform: 'translateY(0)' },
  ], { duration: 700, easing: 'ease-out' });
}

function itemMenu(app, btn) {
  const wins = wm.windowsOfApp(app.id);
  const pinned = state.dock.includes(app.id);
  const onDesktop = state.desktop.some((d) => d.appId === app.id);
  const r = btn.getBoundingClientRect();
  const items = [];
  if (wins.length) {
    items.push({ header: appName(app) });
    for (const w of wins) items.push({ label: w.title || appName(app), icon: w.minimized ? 'minus' : null, action: () => wm.restoreWindow(w.id) });
    items.push('-');
  }
  if (app.id !== 'launchpad') items.push({ label: t('menu.newWindow'), icon: 'plus', action: () => wm.createWindow(app.id, { fromRect: r }) });
  items.push(
    pinned ? { label: t('menu.removeFromDock'), icon: 'minus', action: () => removeFromDock(app.id) } : { label: t('menu.keepInDock'), icon: 'star', action: () => { state.dock.push(app.id); save(); render(); } },
    !onDesktop && app.id !== 'launchpad' ? { label: t('menu.addToDesktop'), icon: 'monitor', action: () => bus.emit('desktop:add', app.id) } : null,
    app.kind === 'web' ? { label: t('menu.editApp'), icon: 'pencil', action: () => bus.emit('app:edit', app.id) } : null,
  );
  if (wins.length) items.push('-', { label: t('menu.quitApp'), icon: 'close', action: () => wins.forEach((w) => wm.closeWindow(w.id)) });
  showMenu(items, r.left, r.top - 8, { anchor: btn });
  // Le menu s'ouvre au-dessus de l'icône.
  const menu = $('#overlays .menu:last-child');
  if (menu) {
    const mr = menu.getBoundingClientRect();
    menu.style.top = Math.max(8, r.top - mr.height - 10) + 'px';
    menu.style.left = clamp(r.left + r.width / 2 - mr.width / 2, 8, innerWidth - mr.width - 8) + 'px';
  }
  holdReveal(true);
  const stop = () => { holdReveal(false); };
  setTimeout(() => document.addEventListener('pointerdown', stop, { once: true, capture: true }), 0);
}

export function removeFromDock(appId) {
  state.dock = state.dock.filter((x) => x !== appId);
  save();
  render();
}

// Ajoute une application au Dock (à l'endroit où on la dépose).
export function insertInDock(appId, index) {
  const at = clamp(index ?? state.dock.length, 0, state.dock.length);
  const old = state.dock.indexOf(appId);
  if (old >= 0) {
    state.dock.splice(old, 1);
    state.dock.splice(old < at ? at - 1 : at, 0, appId);
  } else state.dock.splice(at, 0, appId);
  save();
  render();
}

// Position d'insertion sous le pointeur (null hors du Dock).
export function dockIndexAt(x, y) {
  if (!dock.classList.contains('shown')) return null;
  const r = inner.getBoundingClientRect();
  if (y < r.top - 30 || y > r.bottom + 10 || x < r.left - 40 || x > r.right + 40) return null;
  const pinned = [...inner.querySelectorAll('.dock-item:not(.transient):not(.drag-source)')];
  let i = 0;
  for (const n of pinned) {
    const b = n.getBoundingClientRect();
    if (x > b.left + b.width / 2) i++;
  }
  return i;
}

// --- Agrandissement au survol --------------------------------------------------------------------
function scheduleMagnify() {
  if (magnifyRaf) return;
  magnifyRaf = requestAnimationFrame(() => {
    magnifyRaf = 0;
    const items = inner.querySelectorAll('.dock-item');
    const base = state.settings.dockSize;
    const enabled = state.settings.dockMagnify && !dragging && !reducedMotion();
    const max = 1.55;
    const range = base * 2.6;
    for (const n of items) {
      let s = 1;
      if (enabled && pointerX != null) {
        const b = n.getBoundingClientRect();
        const c = b.left + b.width / 2;
        const d = Math.abs(pointerX - c);
        if (d < range) s = 1 + (max - 1) * Math.cos((d / range) * (Math.PI / 2)) ** 2;
      }
      n.style.setProperty('--m', s.toFixed(3));
    }
  });
}

// --- Visibilité ----------------------------------------------------------------------------------
let revealed = false;
let held = false;
function holdReveal(on) { held = on; updateVisibility(); }

export function updateVisibility() {
  if (!dock) return;
  const mode = state.settings.dockMode;
  const inAppSpace = wm.currentSpace()?.kind === 'app';
  let shown;
  if (document.body.classList.contains('overlay-open')) shown = false;
  else if (held || dragging || edges.bottom) shown = true;
  else if (inAppSpace || mode === 'autohide') shown = false;
  else if (mode === 'smart') shown = !overlapsWindow();
  else shown = true;
  revealed = shown;
  dock.classList.toggle('shown', shown);
  document.body.classList.toggle('dock-shown', shown);
}

// Mode « intelligent » : le Dock s'efface quand une fenêtre vient sur lui.
function overlapsWindow() {
  const top = innerHeight - dockHeight() - MARGIN * 2;
  return wm.windowsInCurrentSpace().some((w) => !w.minimized && w.y + w.h > top + 4);
}

export const dockRect = () => inner.getBoundingClientRect();

// --- Glisser-déposer -------------------------------------------------------------------------------
function startDrag(e, btn, app) {
  if (e.button !== 0) return;
  e.preventDefault(); // pas de glisser-déposer natif : le clic reste un clic
  const sx = e.clientX, sy = e.clientY;
  let ghost = null;
  let outside = false;
  const pinned = state.dock.includes(app.id);
  const onMove = (ev) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      dragging = { appId: app.id };
      btn.classList.add('drag-source');
      ghost = h('div.drag-ghost', {}, appIcon(app, state.settings.dockSize));
      document.body.append(ghost);
      document.body.classList.add('dragging-icon');
      scheduleMagnify();
    }
    ghost.style.transform = `translate(${ev.clientX - state.settings.dockSize / 2}px, ${ev.clientY - state.settings.dockSize / 2}px)`;
    const r = inner.getBoundingClientRect();
    outside = ev.clientY < r.top - 70;
    ghost.classList.toggle('remove', outside && pinned);
    // Place libre sous le pointeur.
    if (!outside && pinned) {
      const idx = dockIndexAt(ev.clientX, ev.clientY);
      const from = state.dock.indexOf(app.id);
      if (idx != null && idx !== from) {
        state.dock.splice(from, 1);
        state.dock.splice(idx, 0, app.id);
        const ref = [...inner.querySelectorAll('.dock-item:not(.transient)')].filter((n) => n !== btn)[idx];
        if (ref) inner.insertBefore(btn, ref); else inner.insertBefore(btn, inner.querySelector('.running-sep'));
      }
    }
  };
  const onUp = () => {
    removeEventListener('pointermove', onMove, true);
    removeEventListener('pointerup', onUp, true);
    if (!ghost) return;
    btn.dataset.suppressClick = '1';
    setTimeout(() => delete btn.dataset.suppressClick, 50);
    document.body.classList.remove('dragging-icon');
    if (outside && pinned && app.id !== 'launchpad') {
      // Un petit nuage, et l'icône disparaît.
      ghost.classList.add('poof');
      setTimeout(() => ghost.remove(), 320);
      removeFromDock(app.id);
      toast(t('menu.removeFromDock') + ' : ' + appName(app), { icon: 'minus', timeout: 1800 });
    } else {
      ghost.remove();
      save();
    }
    btn.classList.remove('drag-source');
    dragging = null;
    scheduleMagnify();
    updateVisibility();
  };
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
}

export function focusDock() {
  holdReveal(true);
  const first = inner.querySelector('.dock-item');
  first?.focus();
  const onKey = (e) => {
    const items = [...inner.querySelectorAll('.dock-item')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); items[(i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length].focus(); }
    if (e.key === 'Escape' || e.key === 'Enter' || i < 0) done();
  };
  const done = () => { inner.removeEventListener('keydown', onKey); inner.removeEventListener('focusout', onOut); holdReveal(false); };
  const onOut = () => setTimeout(() => { if (!inner.contains(document.activeElement)) done(); }, 0);
  inner.addEventListener('keydown', onKey);
  inner.addEventListener('focusout', onOut);
}

export { render as renderDock };
