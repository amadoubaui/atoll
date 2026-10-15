// Ce qui s'affiche par-dessus tout : Launchpad, Recherche, sélecteur de
// fenêtres (⌥⇥), Mission Control et l'aide des raccourcis.
import { h, $, $$, clamp, bus, animate, normalizeUrl, hostOf } from './util.js';
import { state } from './state.js';
import { allApps, appName, appIcon, getApp } from './apps.js';
import * as wm from './wm.js';
import { t } from './i18n.js';
import { icon } from './icons.js';
import { commands, labelOf } from './commands.js';
import { prettyCombo } from './keys.js';
import { showMenu } from './ui.js';
import { currentWallpaper } from './wallpaper.js';

const layer = () => $('#overlays');
let active = null; // { name, close }

function openOverlay(name, node, close) {
  if (active) active.close(true);
  active = { name, node, close };
  document.body.classList.add('overlay-open', `overlay-${name}`);
  bus.emit('overlay', name);
}
function clearOverlay(name) {
  if (active?.name === name) active = null;
  document.body.classList.remove(`overlay-${name}`);
  if (!active) document.body.classList.remove('overlay-open');
  bus.emit('overlay', null);
}
export const overlayOpen = () => active?.name || null;

// Fonction de recherche souple : début de mot > contient > lettres dans l'ordre.
export function score(text, q) {
  const s = (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const k = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!k) return 1;
  if (s.startsWith(k)) return 100 - s.length * 0.1;
  if (s.split(/[\s./-]+/).some((w) => w.startsWith(k))) return 80 - s.length * 0.1;
  const i = s.indexOf(k);
  if (i >= 0) return 60 - i;
  let j = 0;
  for (const c of s) if (c === k[j]) j++;
  return j === k.length ? 20 : 0;
}

// --- Launchpad --------------------------------------------------------------------------------
export function toggleLaunchpad() {
  if (active?.name === 'launchpad') return active.close();
  const input = h('input.lp-search', { type: 'search', placeholder: t('launchpad.search'), spellcheck: false, 'aria-label': t('launchpad.search') });
  const gridEl = h('div.lp-grid', { role: 'listbox' });
  const node = h('div#launchpad.overlay', { role: 'dialog', 'aria-label': 'Launchpad' }, h('div.lp-top', {}, h('span.lp-search-ic', { html: icon('search') }), input), gridEl);
  let items = [];
  let sel = 0;
  const draw = () => {
    const q = input.value.trim();
    const apps = allApps().filter((a) => a.id !== 'launchpad').map((a) => ({ a, s: score(appName(a), q) })).filter((x) => x.s > 0);
    if (q) apps.sort((x, y) => y.s - x.s);
    items = apps.map((x) => x.a);
    gridEl.replaceChildren(...items.map((a, i) => {
      const b = h('button.lp-item', { type: 'button', role: 'option', dataset: { app: a.id } }, appIcon(a, 76), h('span', {}, appName(a)));
      b.addEventListener('click', () => launchFrom(a, b));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); bus.emit('app:menu', a.id, e.clientX, e.clientY); });
      b.addEventListener('pointerenter', () => { sel = i; mark(); });
      return b;
    }));
    if (!q) {
      const add = h('button.lp-item.lp-add', { type: 'button' }, h('div.app-icon.lp-add-ic', { html: icon('plus') }), h('span', {}, t('launchpad.add')));
      add.addEventListener('click', () => { close(); bus.emit('app:add'); });
      gridEl.append(add);
    }
    sel = clamp(sel, 0, Math.max(0, items.length - 1));
    mark();
  };
  const mark = () => $$('.lp-item', gridEl).forEach((b, i) => b.classList.toggle('sel', i === sel && (input.value || keyNav)));
  let keyNav = false;
  const launchFrom = (a, b) => {
    const r = b?.querySelector('.app-icon')?.getBoundingClientRect();
    close();
    wm.launch(a.id, { fromRect: r });
  };
  const cols = () => {
    const list = $$('.lp-item', gridEl);
    if (list.length < 2) return 1;
    const top = list[0].offsetTop;
    const n = list.findIndex((b) => b.offsetTop !== top);
    return n < 0 ? list.length : n;
  };
  input.addEventListener('input', () => { sel = 0; draw(); });
  node.addEventListener('keydown', (e) => {
    const c = cols();
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: c, ArrowUp: -c };
    if (moves[e.key] && (e.key.startsWith('ArrowU') || e.key.startsWith('ArrowD') || input.value === '' || true)) {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && input.selectionStart !== input.value.length && input.value) return;
      e.preventDefault();
      keyNav = true;
      sel = clamp(sel + moves[e.key], 0, items.length - 1);
      mark();
      $$('.lp-item', gridEl)[sel]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && items[sel]) { e.preventDefault(); launchFrom(items[sel], $$('.lp-item', gridEl)[sel]); }
    if (e.key === 'Escape') { e.preventDefault(); if (input.value) { input.value = ''; draw(); } else close(); }
  });
  node.addEventListener('pointerdown', (e) => { if (e.target === node || e.target === gridEl) close(); });
  const close = (instant) => {
    clearOverlay('launchpad');
    if (instant) { node.remove(); return; }
    node.classList.add('closing');
    setTimeout(() => node.remove(), 220);
  };
  layer().append(node);
  openOverlay('launchpad', node, close);
  draw();
  requestAnimationFrame(() => node.classList.add('open'));
  setTimeout(() => input.focus(), 20);
}

// --- Recherche (Spotlight) --------------------------------------------------------------------------
export function toggleSpotlight() {
  if (active?.name === 'spotlight') return active.close();
  const input = h('input.sp-input', { type: 'text', placeholder: t('search.placeholder'), spellcheck: false, autocomplete: 'off', 'aria-label': t('menu.search') });
  const list = h('div.sp-results', { role: 'listbox' });
  const panel = h('div.sp-panel', {}, h('div.sp-bar', {}, h('span.sp-ic', { html: icon('search') }), input), list);
  const node = h('div#spotlight.overlay', { role: 'dialog', 'aria-label': t('menu.search') }, panel);
  let results = [];
  let sel = 0;

  const build = () => {
    const q = input.value.trim();
    const out = [];
    if (q) {
      const url = normalizeUrl(q);
      if (url) out.push({ group: t('search.actions'), title: t('search.open', { q: hostOf(url) || q }), sub: url, ic: 'globe', s: 1000, run: () => wm.openUrl(url) });
      for (const a of allApps()) {
        const s = Math.max(score(appName(a), q), a.url ? score(hostOf(a.url), q) * 0.8 : 0);
        if (s > 0) out.push({ group: t('search.apps'), title: appName(a), sub: a.url ? hostOf(a.url) : '', app: a, s: s + 10, run: () => wm.launch(a.id) });
      }
      for (const w of wm.allWindows()) {
        const s = Math.max(score(w.title, q), score(hostOf(w.url), q) * 0.8);
        if (s > 0) out.push({ group: t('search.windows'), title: w.title, sub: w.url ? hostOf(w.url) : appName(getApp(w.appId)), app: getApp(w.appId), s, run: () => w.minimized ? wm.restoreWindow(w.id) : wm.focusWindow(w.id) });
      }
      for (const d of state.desktop.filter((x) => x.type === 'folder')) {
        const s = score(d.name, q);
        if (s > 0) out.push({ group: t('search.apps'), title: d.name, sub: t('app.folder'), ic: 'folder', s, run: () => wm.createWindow('folder', { folderId: d.id }) });
      }
      for (const n of state.notes) {
        const s = Math.max(score(n.title, q), score(n.body, q) * 0.5);
        if (s > 0) out.push({ group: t('search.notes'), title: n.title || t('win.untitled'), sub: (n.body || '').slice(0, 60), ic: 'note', s: s * 0.7, run: () => wm.createWindow('notes', { noteId: n.id }) });
      }
      for (const c of commands) {
        const label = labelOf(c);
        if (!label) continue;
        const s = score(label, q);
        if (s > 0) out.push({ group: t('search.actions'), title: label, sub: '', ic: 'chevronRight', combo: c.combos[0], s: s * 0.6, run: () => c.run() });
      }
      out.sort((a, b) => b.s - a.s);
      if (!url) out.push({ group: t('search.actions'), title: t('search.web', { q }), sub: 'Google', ic: 'search', s: -1, run: () => wm.openUrl('https://www.google.com/search?q=' + encodeURIComponent(q)) });
    } else {
      for (const w of wm.windowsByRecency().slice(0, 5)) out.push({ group: t('search.windows'), title: w.title, sub: w.url ? hostOf(w.url) : '', app: getApp(w.appId), run: () => w.minimized ? wm.restoreWindow(w.id) : wm.focusWindow(w.id) });
      for (const id of state.dock.filter((x) => x !== 'launchpad').slice(0, 6)) {
        const a = getApp(id);
        if (a) out.push({ group: t('search.apps'), title: appName(a), sub: a.url ? hostOf(a.url) : '', app: a, run: () => wm.launch(a.id) });
      }
    }
    results = out.slice(0, 12);
    sel = 0;
    draw();
  };
  const draw = () => {
    list.replaceChildren();
    let group = null;
    results.forEach((r, i) => {
      if (r.group !== group) { group = r.group; list.append(h('div.sp-group', {}, group)); }
      const row = h('button.sp-row', { type: 'button', role: 'option' });
      row.append(r.app ? appIcon(r.app, 28) : h('span.sp-row-ic', { html: icon(r.ic || 'chevronRight') }), h('span.sp-title', {}, r.title), h('span.sp-sub', {}, r.sub || ''));
      if (r.combo) row.append(h('kbd', {}, prettyCombo(r.combo)));
      row.addEventListener('click', () => { close(); r.run(); });
      row.addEventListener('pointermove', () => { if (sel !== i) { sel = i; mark(); } });
      list.append(row);
    });
    mark();
    list.hidden = !results.length;
  };
  const mark = () => $$('.sp-row', list).forEach((b, i) => { b.classList.toggle('sel', i === sel); if (i === sel) b.scrollIntoView({ block: 'nearest' }); });
  input.addEventListener('input', build);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, results.length); mark(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + results.length) % Math.max(1, results.length); mark(); }
    if (e.key === 'Enter') { e.preventDefault(); const r = results[sel]; close(); r?.run(); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  node.addEventListener('pointerdown', (e) => { if (e.target === node) close(); });
  const close = (instant) => {
    clearOverlay('spotlight');
    if (instant) { node.remove(); return; }
    node.classList.add('closing');
    setTimeout(() => node.remove(), 160);
    const w = wm.focused();
    if (w) wm.focusWindow(w.id, { raise: false });
  };
  layer().append(node);
  openOverlay('spotlight', node, close);
  build();
  requestAnimationFrame(() => node.classList.add('open'));
  input.focus();
}

// --- Sélecteur de fenêtres (⌥⇥) ----------------------------------------------------------------
let sw = null;
export function switcherNext(dir) {
  const list = wm.windowsByRecency();
  if (!list.length) return;
  if (!sw) {
    const node = h('div#switcher.overlay', { tabindex: '-1', role: 'listbox' });
    const row = h('div.sw-row');
    node.append(row);
    list.forEach((w) => {
      const card = h('button.sw-card', { type: 'button', dataset: { id: w.id } }, appIcon(getApp(w.appId), 64), h('span.sw-title', {}, w.title || appName(getApp(w.appId))));
      if (w.minimized) card.classList.add('min');
      card.addEventListener('click', () => { sw.index = list.indexOf(w); commit(); });
      row.append(card);
    });
    layer().append(node);
    sw = { node, list, index: 0 };
    openOverlay('switcher', node, () => cancel());
    node.focus();
    const onUp = (e) => { if (e.key === 'Alt') commit(); };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); switcherNext(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); switcherNext(-1); }
    };
    document.addEventListener('keyup', onUp, true);
    document.addEventListener('keydown', onKey, true);
    const offMod = window.atoll?.onModifierUp?.((k) => { if (k === 'Alt') commit(); });
    sw.cleanup = () => { document.removeEventListener('keyup', onUp, true); document.removeEventListener('keydown', onKey, true); offMod?.(); };
    requestAnimationFrame(() => node.classList.add('open'));
  }
  sw.index = (sw.index + dir + sw.list.length) % sw.list.length;
  if (sw.list.length === 1) sw.index = 0;
  $$('.sw-card', sw.node).forEach((c, i) => c.classList.toggle('sel', i === sw.index));
}
function commit() {
  if (!sw) return;
  const w = sw.list[sw.index];
  cancel();
  if (w) w.minimized ? wm.restoreWindow(w.id) : wm.focusWindow(w.id);
}
function cancel() {
  if (!sw) return;
  sw.cleanup();
  sw.node.remove();
  sw = null;
  clearOverlay('switcher');
}

// --- Mission Control -----------------------------------------------------------------------------
let mc = null;
export function toggleMission() {
  if (mc) return closeMission();
  const wins = wm.windowsInCurrentSpace().filter((w) => !w.minimized);
  const bar = h('div.mc-spaces');
  const node = h('div#mission.overlay', {}, bar);
  layer().append(node);
  document.body.classList.add('mission');
  mc = { node, wins, sel: 0 };
  openOverlay('mission', node, () => closeMission());

  // Bandeau des espaces.
  const drawSpaces = () => {
    bar.replaceChildren();
    let n = 0;
    for (const s of wm.getSpaces()) {
      const isDesk = s.kind === 'desktop';
      const win = !isDesk ? wm.getWindow(s.winId) : null;
      const label = isDesk ? t('mission.desktop', { n: ++n }) : (win?.title || appName(getApp(win?.appId)));
      const thumb = h('button.mc-space', { type: 'button', dataset: { kind: s.kind } });
      const pic = h('div.mc-space-pic');
      pic.style.background = state.settings.wallpaperImage ? `center/cover url("${state.settings.wallpaperImage}")` : currentWallpaper().css;
      if (win) pic.append(appIcon(getApp(win.appId), 30));
      thumb.append(pic, h('span', {}, label));
      thumb.classList.toggle('current', s.current);
      thumb.addEventListener('click', () => { closeMission(); wm.goToSpace(s.index); });
      if (isDesk && wm.getSpaces().filter((x) => x.kind === 'desktop').length > 1) {
        const rm = h('span.mc-space-rm', { html: icon('close'), title: t('menu.remove') });
        rm.addEventListener('click', (e) => { e.stopPropagation(); wm.removeDesktopSpace(s.index); drawSpaces(); });
        thumb.append(rm);
      }
      bar.append(thumb);
    }
    const add = h('button.mc-space.mc-add', { type: 'button', title: t('menu.newSpace'), html: icon('plus') });
    add.addEventListener('click', () => { wm.addDesktopSpace(); drawSpaces(); });
    bar.append(add);
  };
  drawSpaces();

  // Disposition des fenêtres en mosaïque.
  const top = 150, pad = 48, bottom = 60;
  const W = innerWidth - pad * 2, H = innerHeight - top - bottom;
  const n = wins.length;
  if (n) {
    const ratio = W / H;
    let best = { cols: 1, rows: n, s: 0 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const cw = W / cols, ch = H / rows;
      const avg = wins.reduce((acc, w) => acc + Math.min((cw - 30) / w.w, (ch - 50) / w.h, 1), 0) / n;
      if (avg > best.s) best = { cols, rows, s: avg };
    }
    const cw = W / best.cols, ch = H / best.rows;
    // Ordre : de gauche à droite selon la position actuelle, pour garder les repères.
    const ordered = wins.slice().sort((a, b) => (a.y + a.x / 4) - (b.y + b.x / 4));
    ordered.forEach((w, i) => {
      const c = i % best.cols, r = Math.floor(i / best.cols);
      const inRow = Math.min(best.cols, n - r * best.cols);
      const offsetX = (W - inRow * cw) / 2;
      const s = Math.min((cw - 30) / w.w, (ch - 50) / w.h, 1);
      const x = pad + offsetX + c * cw + (cw - w.w * s) / 2;
      const y = top + r * ch + (ch - 30 - w.h * s) / 2;
      w.el.style.transformOrigin = '0 0';
      w.el.style.transform = `translate(${x - w.x}px, ${y - w.y}px) scale(${s})`;
      w.el.classList.add('mc-item');
      const cover = h('div.mc-cover', {}, h('span.mc-label', { style: { transform: `scale(${1 / s})` } }, w.title || appName(getApp(w.appId))));
      cover.addEventListener('click', () => { closeMission(); wm.focusWindow(w.id); });
      w.el.append(cover);
    });
    mc.ordered = ordered;
  }
  node.addEventListener('click', (e) => { if (e.target === node) closeMission(); });
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeMission(); }
    const list = mc?.ordered || [];
    if (!list.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mc.sel = (mc.sel + 1) % list.length; markMc(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mc.sel = (mc.sel - 1 + list.length) % list.length; markMc(); }
    if (e.key === 'Enter') { e.preventDefault(); const w = list[mc.sel]; closeMission(); wm.focusWindow(w.id); }
  };
  document.addEventListener('keydown', onKey, true);
  mc.cleanup = () => document.removeEventListener('keydown', onKey, true);
  node.tabIndex = -1;
  node.focus();
  requestAnimationFrame(() => node.classList.add('open'));
}
function markMc() { (mc.ordered || []).forEach((w, i) => w.el.classList.toggle('mc-sel', i === mc.sel)); }
function closeMission() {
  if (!mc) return;
  const m = mc;
  mc = null;
  m.cleanup?.();
  for (const w of wm.allWindows()) {
    w.el.style.transform = '';
    w.el.classList.remove('mc-sel');
    w.el.querySelector('.mc-cover')?.remove();
    setTimeout(() => w.el.classList.remove('mc-item'), 360);
  }
  document.body.classList.remove('mission');
  m.node.classList.add('closing');
  setTimeout(() => m.node.remove(), 260);
  clearOverlay('mission');
}

// --- Aide des raccourcis -----------------------------------------------------------------------------
export function toggleHelp() {
  if (active?.name === 'help') return active.close();
  const groups = { system: 'Système', windows: 'Fenêtres', spaces: 'Espaces', page: 'Pages web', desktop: 'Bureau et Dock' };
  const cols = h('div.help-cols');
  for (const [g, title] of Object.entries(groups)) {
    const sec = h('section', {}, h('h3', {}, title));
    for (const c of commands.filter((x) => x.group === g && x.label)) {
      sec.append(h('div.help-row', {}, h('span', {}, labelOf(c)), h('span.help-keys', {}, ...c.combos.map((k) => h('kbd', {}, prettyCombo(k))))));
    }
    cols.append(sec);
  }
  const extra = h('section', {}, h('h3', {}, 'Souris'),
    h('div.help-row', {}, h('span', {}, 'Faire apparaître le Dock'), h('span.help-keys', {}, 'Approcher du bas, sans toucher le bord')),
    h('div.help-row', {}, h('span', {}, 'Faire apparaître la barre et les réglages'), h('span.help-keys', {}, 'Approcher du haut')),
    h('div.help-row', {}, h('span', {}, 'Agrandir ou moitié d’écran'), h('span.help-keys', {}, 'Glisser la fenêtre contre un bord')),
    h('div.help-row', {}, h('span', {}, 'Options d’agrandissement'), h('span.help-keys', {}, 'Survoler le bouton vert')),
  );
  cols.append(extra);
  const panel = h('div.help-panel', {}, h('h2', {}, t('help.title')), h('p', {}, t('help.subtitle')), cols);
  const node = h('div#help.overlay', { tabindex: '-1' }, panel);
  const close = (instant) => {
    clearOverlay('help');
    document.removeEventListener('keydown', onKey, true);
    if (instant) { node.remove(); return; }
    node.classList.add('closing');
    setTimeout(() => node.remove(), 200);
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey, true);
  node.addEventListener('pointerdown', (e) => { if (e.target === node) close(); });
  layer().append(node);
  openOverlay('help', node, close);
  requestAnimationFrame(() => node.classList.add('open'));
  node.focus();
}

export function initOverlays() {
  bus.on('launchpad:toggle', toggleLaunchpad);
  bus.on('spotlight:toggle', toggleSpotlight);
  bus.on('switcher:next', switcherNext);
  bus.on('mission:toggle', toggleMission);
  bus.on('help:toggle', toggleHelp);
  // Une commande qui ouvre une fenêtre referme d'abord ce qui la cacherait.
  bus.on('command', (id) => {
    if (!active) return;
    const keep = { launchpad: ['launchpad'], spotlight: ['spotlight'], switcher: ['switcher', 'switcherBack'], mission: ['mission'], help: ['help'] }[active.name] || [];
    if (!keep.includes(id)) active.close(true);
  });
}
