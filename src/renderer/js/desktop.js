// Le bureau : icônes d'applications et dossiers, rangés sur une grille depuis
// le coin haut-droit, déplaçables, renommables, au clavier comme à la souris.
import { h, $, $$, clamp, uid, bus, animate } from './util.js';
import { state, save } from './state.js';
import { getApp, appName, appIcon, folderIcon, removeApp } from './apps.js';
import * as wm from './wm.js';
import { showMenu, dialog, toast } from './ui.js';
import { t } from './i18n.js';
import { dockIndexAt, insertInDock } from './dock.js';
import { MENUBAR_H } from './wm.js';

const CELL_W = 100;
const CELL_H = 108;
const MARGIN_X = 18;
const MARGIN_Y = MENUBAR_H + 16;
let root;
let selected = null;
// Pendant un glisser-déposer, le bureau ne se redessine pas (une icône de site
// qui arrive en arrière-plan ferait disparaître celle qu'on déplace).
let dragActive = false;
let renderPending = false;

export function initDesktop() {
  root = $('#desktop');
  root.tabIndex = 0;
  root.setAttribute('aria-label', 'Bureau');
  render();
  bus.on('apps-changed', render);
  bus.on('desktop-changed', render);
  bus.on('desktop:add', (appId) => { addToDesktop(appId); });
  bus.on('desktop:new-folder', () => newFolder());
  addEventListener('resize', () => render());

  // Clic dans le vide : désélection, et le bureau prend le focus clavier.
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) { select(null); wm.blurAll(); root.focus({ preventScroll: true }); }
  });
  root.addEventListener('contextmenu', (e) => {
    if (e.target !== root) return;
    e.preventDefault();
    showMenu([
      { label: t('menu.newFolder'), icon: 'folder', combo: 'Mod+Shift+N', action: () => newFolder(cellAt(e.clientX, e.clientY)) },
      { label: t('menu.addApp'), icon: 'plus', action: () => bus.emit('app:add') },
      '-',
      { label: t('menu.wallpaper'), icon: 'photo', action: () => { wm.launch('settings'); bus.emit('settings:section', 'appearance'); } },
      { label: t('menu.arrange'), icon: 'grid', action: () => arrange() },
      '-',
      { label: t('app.settings'), icon: 'gear', combo: 'Mod+,', action: () => wm.launch('settings') },
    ], e.clientX, e.clientY);
  });
  root.addEventListener('keydown', onKey);
}

// --- Grille --------------------------------------------------------------------------------
function grid() {
  const cols = Math.max(1, Math.floor((innerWidth - MARGIN_X * 2) / CELL_W));
  const rows = Math.max(1, Math.floor((innerHeight - MARGIN_Y - 110) / CELL_H));
  return { cols, rows };
}
function cellToXY(col, row) {
  return { x: innerWidth - MARGIN_X - (col + 1) * CELL_W, y: MARGIN_Y + row * CELL_H };
}
function cellAt(x, y) {
  const { cols, rows } = grid();
  const col = clamp(Math.floor((innerWidth - MARGIN_X - x) / CELL_W), 0, cols - 1);
  const row = clamp(Math.floor((y - MARGIN_Y) / CELL_H), 0, rows - 1);
  return { col, row };
}
function occupied(except) {
  const set = new Set();
  for (const d of state.desktop) if (d !== except && d.col != null) set.add(`${d.col},${d.row}`);
  return set;
}
function freeCell(near, except) {
  const { cols, rows } = grid();
  const taken = occupied(except);
  if (near && !taken.has(`${near.col},${near.row}`)) return near;
  // Cherche la case libre la plus proche, colonne par colonne depuis la droite.
  let best = null, bestD = Infinity;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    if (taken.has(`${c},${r}`)) continue;
    const d = near ? Math.hypot(c - near.col, r - near.row) : c * 1000 + r;
    if (d < bestD) { bestD = d; best = { col: c, row: r }; }
  }
  return best || { col: 0, row: 0 };
}

// --- Rendu ------------------------------------------------------------------------------------
function render() {
  if (!root) return;
  if (dragActive) { renderPending = true; return; }
  renderPending = false;
  const { cols, rows } = grid();
  for (const d of state.desktop) {
    if (d.col == null || d.col >= cols || d.row >= rows) Object.assign(d, freeCell(null, d));
  }
  root.replaceChildren(...state.desktop.map(itemNode));
  if (selected) root.querySelector(`[data-id="${CSS.escape(selected)}"]`)?.classList.add('selected');
}

function itemNode(d) {
  const { x, y } = cellToXY(d.col, d.row);
  const isFolder = d.type === 'folder';
  const app = isFolder ? null : getApp(d.appId);
  const label = isFolder ? d.name : appName(app);
  const node = h('button.desk-item', { type: 'button', dataset: { id: d.id, type: d.type }, style: { transform: `translate(${x}px, ${y}px)` }, 'aria-label': label });
  node.append(isFolder ? folderIcon(d, 62) : appIcon(app, 62), h('span.desk-label', {}, label));
  node.addEventListener('pointerdown', (e) => startDrag(e, node, d));
  node.addEventListener('dblclick', () => open(d, node));
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); open(d, node); } });
  node.addEventListener('contextmenu', (e) => { e.preventDefault(); select(d.id); itemMenu(d, e.clientX, e.clientY); });
  node.addEventListener('focus', () => select(d.id));
  return node;
}

function select(id) {
  selected = id;
  $$('.desk-item', root).forEach((n) => n.classList.toggle('selected', n.dataset.id === id));
}

export function open(d, node) {
  const fromRect = node?.querySelector('.app-icon')?.getBoundingClientRect();
  if (d.type === 'folder') {
    const existing = wm.allWindows().find((w) => w.appId === 'folder' && w.folderId === d.id);
    if (existing) return wm.focusWindow(existing.id);
    return wm.createWindow('folder', { folderId: d.id, fromRect });
  }
  wm.launch(d.appId, { fromRect });
}

function itemMenu(d, x, y) {
  const node = root.querySelector(`[data-id="${CSS.escape(d.id)}"]`);
  if (d.type === 'folder') {
    showMenu([
      { label: t('menu.open'), icon: 'folder', action: () => open(d, node) },
      { label: t('menu.rename'), icon: 'pencil', action: () => renameFolder(d) },
      '-',
      { label: t('menu.remove'), icon: 'trash', danger: true, action: () => deleteFolder(d) },
    ], x, y);
    return;
  }
  const app = getApp(d.appId);
  const inDock = state.dock.includes(d.appId);
  showMenu([
    { label: t('menu.open'), icon: 'external', action: () => open(d, node) },
    { label: t('menu.newWindow'), icon: 'plus', action: () => wm.createWindow(d.appId) },
    '-',
    inDock ? { label: t('menu.removeFromDock'), icon: 'minus', action: () => { state.dock = state.dock.filter((i) => i !== d.appId); save(); bus.emit('apps-changed'); } }
      : { label: t('menu.keepInDock'), icon: 'star', action: () => insertInDock(d.appId) },
    app?.kind === 'web' ? { label: t('menu.editApp'), icon: 'pencil', action: () => bus.emit('app:edit', d.appId) } : null,
    { label: t('menu.removeFromDesktop'), icon: 'minus', action: () => { state.desktop = state.desktop.filter((x) => x !== d); save(); render(); } },
    app?.kind === 'web' ? '-' : null,
    app?.kind === 'web' ? { label: t('menu.remove') + ' ' + appName(app), icon: 'trash', danger: true, action: () => confirmRemoveApp(app) } : null,
  ], x, y);
}

async function confirmRemoveApp(app) {
  const ok = await dialog({ title: `${t('menu.remove')} « ${appName(app)} » ?`, text: 'L’application disparaît du Dock, du bureau et du Launchpad. Tes données sur le site restent enregistrées.', ok: t('menu.remove'), danger: true });
  if (ok) { wm.windowsOfApp(app.id).forEach((w) => wm.closeWindow(w.id)); removeApp(app.id); }
}

// --- Dossiers ---------------------------------------------------------------------------------
export async function newFolder(cell) {
  const res = await dialog({ title: t('menu.newFolder'), fields: [{ name: 'name', label: t('dialog.folderName'), value: t('folder.new') }], ok: t('dialog.add') });
  if (!res) return;
  const colors = ['#4f8df7', '#a77bf3', '#2fbf8f', '#f59e0b', '#ef6f6c', '#14b8a6'];
  const d = { id: uid('d'), type: 'folder', name: res.name || t('folder.new'), items: [], color: colors[state.desktop.length % colors.length], ...freeCell(cell || null) };
  state.desktop.push(d);
  save();
  render();
  select(d.id);
  return d;
}

async function renameFolder(d) {
  const res = await dialog({ title: t('dialog.renameTitle'), fields: [{ name: 'name', label: t('dialog.folderName'), value: d.name }], ok: t('dialog.save') });
  if (!res || !res.name) return;
  d.name = res.name;
  save();
  render();
  bus.emit('folder-changed', d.id);
}

async function deleteFolder(d) {
  if (d.items.length) {
    const ok = await dialog({ title: `${t('menu.remove')} « ${d.name} » ?`, text: 'Les applications du dossier reviennent sur le bureau.', ok: t('menu.remove'), danger: true });
    if (!ok) return;
  }
  state.desktop = state.desktop.filter((x) => x !== d);
  for (const appId of d.items) state.desktop.push({ id: uid('d'), type: 'app', appId, ...freeCell({ col: d.col, row: d.row }) });
  wm.allWindows().filter((w) => w.folderId === d.id).forEach((w) => wm.closeWindow(w.id));
  save();
  render();
}

export function moveOutOfFolder(folderId, appId) {
  const d = state.desktop.find((x) => x.id === folderId);
  if (!d) return;
  d.items = d.items.filter((x) => x !== appId);
  if (!state.desktop.some((x) => x.appId === appId)) state.desktop.push({ id: uid('d'), type: 'app', appId, ...freeCell({ col: d.col, row: d.row + 1 }) });
  save();
  render();
  bus.emit('folder-changed', folderId);
}

export function addToDesktop(appId) {
  if (state.desktop.some((x) => x.appId === appId)) return;
  state.desktop.push({ id: uid('d'), type: 'app', appId, ...freeCell(null) });
  save();
  render();
}

// Range toutes les icônes en colonnes, sans trou.
export function arrange() {
  const { rows } = grid();
  state.desktop.forEach((d, i) => { d.col = Math.floor(i / rows); d.row = i % rows; });
  save();
  render();
}

// --- Glisser-déposer -------------------------------------------------------------------------
function startDrag(e, node, d) {
  if (e.button !== 0) return;
  // Pas de glisser-déposer natif du navigateur : c'est Atoll qui déplace l'icône.
  e.preventDefault();
  node.focus({ preventScroll: true });
  select(d.id);
  const sx = e.clientX, sy = e.clientY;
  const start = cellToXY(d.col, d.row);
  let moving = false;
  let dropFolder = null;
  dragActive = true;
  const onMove = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moving && Math.hypot(dx, dy) < 5) return;
    if (!moving) { moving = true; node.classList.add('dragging'); document.body.classList.add('dragging-icon'); }
    node.style.transform = `translate(${start.x + dx}px, ${start.y + dy}px)`;
    // Survol d'un dossier : il s'ouvre un peu pour accueillir l'icône.
    let target = null;
    if (d.type === 'app') {
      for (const other of $$('.desk-item[data-type="folder"]', root)) {
        const r = other.getBoundingClientRect();
        if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) target = other;
      }
    }
    if (target !== dropFolder) {
      dropFolder?.classList.remove('drop-target');
      dropFolder = target;
      dropFolder?.classList.add('drop-target');
    }
    document.body.classList.toggle('dock-drop', d.type === 'app' && dockIndexAt(ev.clientX, ev.clientY) != null);
  };
  const onUp = (ev) => {
    removeEventListener('pointermove', onMove, true);
    removeEventListener('pointerup', onUp, true);
    removeEventListener('pointercancel', onUp, true);
    document.body.classList.remove('dragging-icon', 'dock-drop');
    dragActive = false;
    if (!moving) { if (renderPending) render(); return; }
    node.classList.remove('dragging');
    if (dropFolder) {
      const folder = state.desktop.find((x) => x.id === dropFolder.dataset.id);
      if (folder && !folder.items.includes(d.appId)) folder.items.push(d.appId);
      state.desktop = state.desktop.filter((x) => x !== d);
      save();
      render();
      bus.emit('folder-changed', folder?.id);
      return;
    }
    const dockIdx = d.type === 'app' ? dockIndexAt(ev.clientX, ev.clientY) : null;
    if (dockIdx != null) {
      insertInDock(d.appId, dockIdx);
      toast(`${appName(getApp(d.appId))} : ${t('menu.keepInDock').toLowerCase()}`, { icon: 'star', timeout: 1800 });
      render();
      return;
    }
    const icon = node.getBoundingClientRect();
    Object.assign(d, freeCell(cellAt(icon.left + icon.width / 2, icon.top + 30), d));
    save();
    render();
  };
  // Écoute sur la fenêtre entière : le pointeur peut passer sur d'autres éléments.
  addEventListener('pointermove', onMove, true);
  addEventListener('pointerup', onUp, true);
  addEventListener('pointercancel', onUp, true);
}

// --- Clavier ------------------------------------------------------------------------------------
function onKey(e) {
  const items = state.desktop;
  if (!items.length) return;
  const cur = items.find((d) => d.id === selected);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    if (!cur) { focusItem(items[0]); return; }
    const dc = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0;
    const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    // L'icône la plus proche dans la direction demandée.
    let best = null, bestD = Infinity;
    for (const d of items) {
      if (d === cur) continue;
      const vc = d.col - cur.col, vr = d.row - cur.row;
      if ((dc && Math.sign(vc) !== dc) || (dr && Math.sign(vr) !== dr)) continue;
      const dist = Math.abs(vc) * (dc ? 1 : 3) + Math.abs(vr) * (dr ? 1 : 3);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    if (best) focusItem(best);
  }
  if (e.key === 'Enter' && cur && e.target === root) open(cur, root.querySelector(`[data-id="${CSS.escape(cur.id)}"]`));
}

function focusItem(d) {
  select(d.id);
  root.querySelector(`[data-id="${CSS.escape(d.id)}"]`)?.focus({ preventScroll: true });
}

export function focusDesktop() {
  wm.blurAll();
  root.focus({ preventScroll: true });
  if (!selected && state.desktop[0]) focusItem(state.desktop[0]);
}
