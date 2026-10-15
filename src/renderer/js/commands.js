// Toutes les commandes d'Atoll et leurs raccourcis clavier. Les menus, la
// recherche et l'aide des raccourcis lisent cette même liste.
import { bus } from './util.js';
import { state, setSetting } from './state.js';
import { isMac, keyCombo } from './keys.js';
import * as wm from './wm.js';
import { t } from './i18n.js';
import { dialog } from './ui.js';
import { edges } from './edges.js';

const M = (mac, other) => (isMac ? mac : other);

// [identifiant, groupe, clé du libellé, raccourcis, action]
const LIST = [
  ['spotlight', 'system', 'menu.search', ['Mod+K', 'Alt+Space'], () => bus.emit('spotlight:toggle')],
  ['launchpad', 'system', 'app.launchpad', ['Mod+Shift+A', 'F4'], () => bus.emit('launchpad:toggle')],
  ['mission', 'system', 'menu.mission', ['Mod+Alt+Up', 'F3'], () => bus.emit('mission:toggle')],
  ['showDesktop', 'system', 'menu.showDesktop', ['Mod+Alt+B'], () => wm.toggleShowDesktop()],
  ['focusDock', 'system', 'Aller au Dock', ['Mod+Alt+K'], () => bus.emit('dock:focus')],
  ['focusMenubar', 'system', 'Ouvrir la barre de menus', ['Mod+Alt+M', 'F10'], () => bus.emit('menubar:focus')],
  ['settings', 'system', 'app.settings', ['Mod+,'], () => wm.launch('settings')],
  ['help', 'system', 'menu.shortcuts', ['Mod+/'], () => bus.emit('help:toggle')],
  ['atollFullscreen', 'system', 'menu.fullscreen', [M('Mod+Ctrl+F', 'F11')], () => window.atoll.setFullscreen(!edges.nativeFullscreen)],
  ['quit', 'system', 'menu.quit', ['Mod+Q'], () => confirmQuit()],

  ['newBrowser', 'windows', 'menu.newBrowser', ['Mod+T'], () => wm.createWindow('browser')],
  ['newWindow', 'windows', 'menu.newWindow', ['Mod+N'], () => { const w = wm.focused(); wm.createWindow(w ? w.appId : 'browser'); }],
  ['closeWindow', 'windows', 'menu.close', ['Mod+W'], () => wm.closeWindow()],
  ['reopen', 'windows', 'menu.reopen', ['Mod+Shift+T'], () => wm.reopenClosed()],
  ['minimize', 'windows', 'menu.minimize', ['Mod+M'], () => wm.minimizeWindow()],
  ['hideApp', 'windows', 'menu.hideApp', ['Mod+H'], () => { const w = wm.focused(); if (w) wm.hideApp(w.appId); }],
  ['fullSpace', 'windows', 'menu.space', ['Mod+Shift+F', 'Mod+Enter'], () => { wm.toggleFullSpace(); }],
  ['maximize', 'windows', 'menu.zoom', [M('Ctrl+Alt+Up', 'Alt+Shift+Up'), M('Ctrl+Alt+Enter', 'Alt+Shift+Enter')], () => wm.toggleMaximize()],
  ['tileLeft', 'windows', 'menu.tileLeft', [M('Ctrl+Alt+Left', 'Alt+Shift+Left')], () => wm.tile(undefined, 'left')],
  ['tileRight', 'windows', 'menu.tileRight', [M('Ctrl+Alt+Right', 'Alt+Shift+Right')], () => wm.tile(undefined, 'right')],
  ['center', 'windows', 'menu.center', [M('Ctrl+Alt+Down', 'Alt+Shift+Down'), M('Ctrl+Alt+C', 'Alt+Shift+C')], () => wm.centerWindow()],
  ['switcher', 'windows', 'menu.switcher', ['Alt+Tab'], () => bus.emit('switcher:next', 1)],
  ['switcherBack', 'windows', null, ['Alt+Shift+Tab'], () => bus.emit('switcher:next', -1)],
  ['cycleApp', 'windows', 'Fenêtre suivante de l’application', ['Mod+`'], () => cycleAppWindows()],

  ['nextSpace', 'spaces', 'menu.nextSpace', ['Mod+Alt+Right'], () => wm.nextSpace()],
  ['prevSpace', 'spaces', 'menu.prevSpace', ['Mod+Alt+Left'], () => wm.prevSpace()],
  ['newSpace', 'spaces', 'menu.newSpace', ['Mod+Alt+N'], () => wm.goToSpace(wm.addDesktopSpace())],
  ...Array.from({ length: 9 }, (_, i) => [`space${i + 1}`, 'spaces', i === 0 ? 'Aller à l’espace 1 à 9' : null, [`Mod+Alt+${i + 1}`], () => wm.goToSpace(i)]),

  ['address', 'page', 'menu.address', ['Mod+L'], () => { const w = wm.focused(); if (w && (w.webview || w.appId === 'browser')) wm.editAddress(w); else bus.emit('spotlight:toggle'); }],
  ['reload', 'page', 'menu.reload', ['Mod+R', 'F5'], () => wm.pageActions.reload(wm.focused())],
  ['hardReload', 'page', 'Recharger sans le cache', ['Mod+Shift+R'], () => wm.pageActions.reload(wm.focused(), true)],
  ['back', 'page', 'menu.back', ['Mod+['], () => wm.pageActions.back(wm.focused())],
  ['forward', 'page', 'menu.forward', ['Mod+]'], () => wm.pageActions.forward(wm.focused())],
  ['find', 'page', 'menu.find', ['Mod+F'], () => { const w = wm.focused(); if (w) bus.emit('find', w); }],
  ['zoomIn', 'page', 'menu.zoomIn', ['Mod+='], () => wm.zoomBy(wm.focused(), 0.1)],
  ['zoomOut', 'page', 'menu.zoomOut', ['Mod+-'], () => wm.zoomBy(wm.focused(), -0.1)],
  ['zoomReset', 'page', 'menu.zoomReset', ['Mod+0'], () => wm.zoomBy(wm.focused(), 0)],
  ['install', 'page', 'menu.install', ['Mod+Shift+D'], () => { const w = wm.focused(); if (w?.webview) bus.emit('install-window', w); }],
  ['devtools', 'page', 'menu.devtools', ['Mod+Alt+I'], () => wm.focused()?.webview?.openDevTools()],

  ...Array.from({ length: 9 }, (_, i) => [`dock${i + 1}`, 'desktop', i === 0 ? 'Ouvrir l’app n° 1 à 9 du Dock' : null, [`Mod+${i + 1}`], () => { const id = state.dock.filter((x) => x !== 'launchpad')[i]; if (id) wm.launch(id); }]),
  ['newFolder', 'desktop', 'menu.newFolder', ['Mod+Shift+N'], () => bus.emit('desktop:new-folder')],
  ['addApp', 'desktop', 'menu.addApp', ['Mod+Shift+='], () => bus.emit('app:add')],
];

export const commands = LIST.map(([id, group, label, combos, run]) => ({ id, group, label, combos, run }));
const byCombo = new Map();
for (const c of commands) for (const combo of c.combos) byCombo.set(combo, c);

export function labelOf(cmd) { return cmd.label ? (cmd.label.includes('.') && !cmd.label.includes(' ') ? t(cmd.label) : cmd.label) : ''; }
export function comboOf(id) { return commands.find((c) => c.id === id)?.combos[0]; }
export function run(id) { commands.find((c) => c.id === id)?.run(); }

// Une touche a été pressée (dans la coquille ou dans une page) : la commande
// correspondante s'exécute, sauf si une boîte de dialogue attend une réponse.
export function dispatch(combo) {
  const cmd = byCombo.get(combo);
  if (!cmd) return false;
  if (document.querySelector('.scrim') && !['quit'].includes(cmd.id)) return false;
  bus.emit('command', cmd.id);
  cmd.run();
  return true;
}

export function initCommands() {
  window.atoll?.setShortcuts([...byCombo.keys()]);
  window.atoll?.onShortcut((combo) => dispatch(combo));
  // Filet de sécurité : une touche que le processus principal n'a pas
  // interceptée (touches simulées, accessibilité) arrive ici. Celles qu'il a
  // interceptées n'atteignent jamais la page : pas de double exécution.
  document.addEventListener('keydown', (e) => { const c = keyCombo(e); if (c && byCombo.has(c)) { e.preventDefault(); dispatch(c); } }, true);
}

function cycleAppWindows() {
  const w = wm.focused();
  if (!w) return;
  const list = wm.windowsOfApp(w.appId).filter((x) => !x.minimized).sort((a, b) => a.z - b.z);
  if (list.length > 1) wm.focusWindow(list[0].id);
}

let quitting = false;
export async function confirmQuit() {
  if (quitting) return;
  quitting = true;
  const ok = await dialog({ title: t('dialog.quit'), text: t('dialog.quitText'), ok: t('menu.quit').replace('…', '') });
  quitting = false;
  if (ok) window.atoll?.quit();
}

export { setSetting };
