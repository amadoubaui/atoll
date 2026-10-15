// Barre de menus en haut de l'écran et Centre de contrôle.
import { h, $, bus, clamp } from './util.js';
import { state, setSetting } from './state.js';
import { getApp, appName } from './apps.js';
import * as wm from './wm.js';
import { showMenu, closeMenu } from './ui.js';
import { icon, LOGO } from './icons.js';
import { t, getLang } from './i18n.js';
import { comboOf, run, confirmQuit } from './commands.js';
import { edges } from './edges.js';
import { isMac } from './keys.js';
import { WALLPAPERS, applyWallpaper } from './wallpaper.js';

let bar, appLabel, clock, spacesBox, leaveBtn, cc;
let openIndex = -1;
let menuButtons = [];

const cmd = (id, labelKey, extra = {}) => ({ label: t(labelKey), combo: comboOf(id), action: () => run(id), ...extra });

function menus() {
  const w = wm.focused();
  const app = w ? getApp(w.appId) : null;
  const web = !!w?.webview;
  return [
    { key: 'atoll', html: `<span class="mb-logo">${LOGO}</span>`, label: 'Atoll', items: () => [
      { label: t('menu.about'), icon: 'info', action: () => wm.launch('welcome') },
      '-',
      cmd('settings', 'menu.settings', { icon: 'gear' }),
      cmd('help', 'menu.shortcuts', { icon: 'keyboard' }),
      '-',
      { label: edges.nativeFullscreen ? t('menu.windowed') : t('menu.fullscreen'), icon: edges.nativeFullscreen ? 'shrink' : 'expand', combo: comboOf('atollFullscreen'), action: () => run('atollFullscreen') },
      '-',
      { label: t('menu.quit'), icon: 'power', combo: 'Mod+Q', action: () => confirmQuit() },
    ] },
    { key: 'app', label: app ? appName(app) : 'Atoll', bold: true, items: () => [
      app ? { label: t('menu.newWindow'), icon: 'plus', combo: 'Mod+N', action: () => wm.createWindow(app.id) } : cmd('newBrowser', 'menu.newBrowser', { icon: 'plus' }),
      app ? { label: t('menu.hideApp'), combo: 'Mod+H', action: () => wm.hideApp(app.id) } : null,
      app?.kind === 'web' ? { label: t('menu.editApp'), icon: 'pencil', action: () => bus.emit('app:edit', app.id) } : null,
      '-',
      app ? { label: t('menu.quitApp'), icon: 'close', action: () => wm.windowsOfApp(app.id).forEach((x) => wm.closeWindow(x.id)) } : cmd('addApp', 'menu.addApp', { icon: 'plus' }),
    ] },
    { key: 'file', label: t('menu.file'), items: () => [
      cmd('newBrowser', 'menu.newBrowser', { icon: 'globe' }),
      cmd('newWindow', 'menu.newWindow'),
      cmd('address', 'menu.address'),
      '-',
      cmd('newFolder', 'menu.newFolder', { icon: 'folder' }),
      cmd('addApp', 'menu.addApp', { icon: 'plus' }),
      web ? cmd('install', 'menu.install') : null,
      '-',
      cmd('reopen', 'menu.reopen'),
      cmd('closeWindow', 'menu.close', { disabled: !w }),
    ] },
    { key: 'view', label: t('menu.view'), items: () => [
      cmd('reload', 'menu.reload', { disabled: !web, icon: 'reload' }),
      cmd('back', 'menu.back', { disabled: !web }),
      cmd('forward', 'menu.forward', { disabled: !web }),
      '-',
      cmd('find', 'menu.find', { disabled: !web, icon: 'search' }),
      cmd('zoomIn', 'menu.zoomIn', { disabled: !web }),
      cmd('zoomOut', 'menu.zoomOut', { disabled: !web }),
      cmd('zoomReset', 'menu.zoomReset', { disabled: !web }),
      '-',
      cmd('devtools', 'menu.devtools', { disabled: !web }),
    ] },
    { key: 'go', label: t('menu.go'), items: () => [
      cmd('spotlight', 'menu.search', { icon: 'search' }),
      { label: t('app.launchpad'), icon: 'grid', combo: comboOf('launchpad'), action: () => run('launchpad') },
      cmd('mission', 'menu.mission', { icon: 'spaces' }),
      cmd('showDesktop', 'menu.showDesktop', { icon: 'monitor' }),
      '-',
      cmd('prevSpace', 'menu.prevSpace'),
      cmd('nextSpace', 'menu.nextSpace'),
      cmd('newSpace', 'menu.newSpace', { icon: 'plus' }),
    ] },
    { key: 'window', label: t('menu.window'), items: () => [
      cmd('minimize', 'menu.minimize', { disabled: !w }),
      cmd('maximize', 'menu.zoom', { disabled: !w || w.mode === 'space' }),
      { label: w?.mode === 'space' ? t('menu.leaveSpace') : t('menu.space'), icon: 'expand', combo: comboOf('fullSpace'), disabled: !w, action: () => run('fullSpace') },
      '-',
      cmd('tileLeft', 'menu.tileLeft', { disabled: !w, icon: 'splitLeft' }),
      cmd('tileRight', 'menu.tileRight', { disabled: !w, icon: 'splitRight' }),
      cmd('center', 'menu.center', { disabled: !w }),
      '-',
      cmd('switcher', 'menu.switcher'),
      ...wm.windowsByRecency().slice(0, 8).map((x) => ({ label: x.title || appName(getApp(x.appId)), checked: x === w, action: () => wm.focusWindow(x.id) })),
    ] },
    { key: 'help', label: t('menu.help'), items: () => [
      cmd('help', 'menu.shortcuts', { icon: 'keyboard' }),
      { label: t('app.welcome'), icon: 'info', action: () => wm.launch('welcome') },
      { label: 'GitHub', icon: 'github', action: () => window.atoll.openExternal('https://github.com/amadoubaui/atoll') },
    ] },
  ];
}

export function initMenubar() {
  bar = $('#menubar');
  render();
  bus.on('focus-changed', renderAppLabel);
  bus.on('apps-changed', renderAppLabel);
  bus.on('settings', (k) => { if (k === 'lang') render(); });
  bus.on('space-changed', () => { renderSpaces(); updateVisibility(); });
  bus.on('spaces-changed', renderSpaces);
  bus.on('edges', updateVisibility);
  bus.on('menubar:focus', () => { bar.classList.remove('hidden'); openMenuAt(0); const m = document.querySelector('#overlays .menu:last-child'); m?.querySelector('.menu-item:not(:disabled)')?.focus(); });
  bus.on('native-fullscreen', (on) => { document.body.classList.toggle('native-fullscreen', on); updateVisibility(); });
  document.body.classList.toggle('native-fullscreen', edges.nativeFullscreen);
  document.body.classList.toggle('mac', isMac);
  setInterval(tick, 1000 * 10);
  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);
}

function render() {
  bar.replaceChildren();
  const left = h('div.mb-left');
  menuButtons = [];
  menus().forEach((m, i) => {
    const btn = h('button.mb-item', { type: 'button', dataset: { key: m.key } });
    if (m.html) btn.innerHTML = m.html; else btn.textContent = m.label;
    if (m.bold) { btn.classList.add('bold'); appLabel = btn; }
    btn.setAttribute('aria-label', m.label);
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); openIndex === i ? closeMenu() : openMenuAt(i); });
    btn.addEventListener('pointerenter', () => { if (openIndex >= 0 && openIndex !== i) openMenuAt(i); });
    menuButtons.push(btn);
    left.append(btn);
  });
  const right = h('div.mb-right');
  leaveBtn = h('button.mb-icon.leave-space', { type: 'button', title: t('menu.leaveSpace'), html: icon('shrink'), on: { click: () => run('fullSpace') } });
  spacesBox = h('div.mb-spaces', { title: t('menu.mission') });
  spacesBox.addEventListener('click', () => run('mission'));
  const status = h('span.mb-status');
  const search = h('button.mb-icon', { type: 'button', title: t('menu.search'), html: icon('search'), on: { click: () => run('spotlight') } });
  const ccBtn = h('button.mb-icon.cc-btn', { type: 'button', title: t('cc.title'), html: icon('sliders'), on: { click: (e) => { e.stopPropagation(); toggleControlCenter(); } } });
  clock = h('button.mb-clock', { type: 'button', on: { click: () => toggleControlCenter() } });
  right.append(leaveBtn, spacesBox, status, search, ccBtn, clock);
  if (!isMac) {
    right.append(h('div.win-controls', {},
      h('button.mb-icon', { type: 'button', html: icon('minus'), on: { click: () => window.atoll.windowControl('minimize') } }),
      h('button.mb-icon', { type: 'button', html: icon('maximize'), on: { click: () => window.atoll.windowControl('maximize') } }),
      h('button.mb-icon', { type: 'button', html: icon('close'), on: { click: () => confirmQuit() } }),
    ));
  }
  bar.append(left, h('div.mb-drag'), right);
  renderAppLabel();
  renderSpaces();
  renderStatus();
  tick();
  updateVisibility();
}

function openMenuAt(i) {
  const m = menus()[i];
  const btn = menuButtons[i];
  if (!m || !btn) return;
  menuButtons.forEach((b) => b.classList.remove('open'));
  btn.classList.add('open');
  bar.classList.add('menu-open');
  openIndex = i;
  const r = btn.getBoundingClientRect();
  showMenu(m.items(), r.left, r.bottom + 4, {
    anchor: bar,
    focusFirst: false,
    onClose: () => {
      btn.classList.remove('open');
      if (openIndex === i) { openIndex = -1; bar.classList.remove('menu-open'); updateVisibility(); }
    },
    onArrow: (d, e) => { e.preventDefault(); openMenuAt((i + d + menuButtons.length) % menuButtons.length); },
  });
}

// Ouvre le premier menu au clavier (comme F10 / ⌃F2 sur les systèmes de bureau).
export function focusMenubar() { openMenuAt(0); }

function renderAppLabel() {
  if (!appLabel) return;
  const w = wm.focused();
  appLabel.textContent = w ? appName(getApp(w.appId)) : 'Atoll';
}

function renderSpaces() {
  if (!spacesBox) return;
  const list = wm.getSpaces();
  spacesBox.replaceChildren(...list.map((s) => {
    const dot = h('span.mb-space-dot', { dataset: { kind: s.kind } });
    dot.classList.toggle('current', s.current);
    return dot;
  }));
  spacesBox.hidden = list.length < 2;
  leaveBtn.hidden = wm.currentSpace()?.kind !== 'app';
}

function renderStatus() {
  const status = bar.querySelector('.mb-status');
  if (!status) return;
  status.innerHTML = navigator.onLine ? '' : icon('wifiOff');
  status.title = navigator.onLine ? '' : 'Hors ligne';
  if (navigator.getBattery && !status.dataset.battery) {
    status.dataset.battery = '1';
    navigator.getBattery().then((b) => {
      const draw = () => {
        if (b.level === 1 && b.charging) { status.querySelector('.battery')?.remove(); return; }
        let el = status.querySelector('.battery');
        if (!el) { el = h('span.battery'); status.append(el); }
        el.innerHTML = `${icon('battery')}<i style="width:${Math.round(b.level * 12)}px"></i>`;
        el.title = `${Math.round(b.level * 100)} %${b.charging ? ' (en charge)' : ''}`;
        el.classList.toggle('low', b.level < 0.2 && !b.charging);
      };
      b.addEventListener('levelchange', draw);
      b.addEventListener('chargingchange', draw);
      draw();
    }).catch(() => {});
  }
}

function tick() {
  if (!clock) return;
  const now = new Date();
  const loc = getLang() === 'en' ? 'en-GB' : 'fr-FR';
  const day = now.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  clock.textContent = `${day}  ${time}`;
}

// La barre reste visible sur les bureaux. Dans un plein espace, elle descend
// quand le pointeur approche du haut de l'écran.
function updateVisibility() {
  const inApp = wm.currentSpace()?.kind === 'app';
  const show = !inApp || edges.top || openIndex >= 0 || cc?.classList.contains('open');
  bar.classList.toggle('hidden', !show);
  document.body.classList.toggle('top-revealed', inApp && show);
}

// --- Centre de contrôle -----------------------------------------------------------------------
function toggleControlCenter(force) {
  cc ||= buildControlCenter();
  const open = force ?? !cc.classList.contains('open');
  if (open) refreshControlCenter();
  cc.classList.toggle('open', open);
  bar.querySelector('.cc-btn')?.classList.toggle('open', open);
  updateVisibility();
  if (open) {
    const away = (e) => {
      if (cc.contains(e.target) || e.target.closest('.cc-btn,.mb-clock')) return;
      toggleControlCenter(false);
      document.removeEventListener('pointerdown', away, true);
    };
    setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
    const esc = (e) => { if (e.key === 'Escape') { toggleControlCenter(false); document.removeEventListener('keydown', esc, true); } };
    document.addEventListener('keydown', esc, true);
    cc.querySelector('button')?.focus();
  }
}
bus.on('cc:toggle', () => toggleControlCenter());

function tileToggle(key, ic, label, getter, setter) {
  const b = h('button.cc-tile.toggle', { type: 'button', dataset: { key } });
  b.innerHTML = `<span class="cc-ic">${icon(ic)}</span><span class="cc-label"></span>`;
  b.querySelector('.cc-label').textContent = label;
  b.addEventListener('click', () => { setter(!getter()); refreshControlCenter(); });
  b.refresh = () => b.classList.toggle('on', !!getter());
  return b;
}

function buildControlCenter() {
  const panel = h('div#control-center', { role: 'dialog', 'aria-label': t('cc.title') });
  const themes = h('div.cc-seg');
  for (const [mode, ic, label] of [['light', 'sun', t('cc.light')], ['dark', 'moon', t('cc.dark')], ['auto', 'monitor', t('cc.auto')]]) {
    const b = h('button', { type: 'button', dataset: { mode }, html: `${icon(ic)}<span>${label}</span>` });
    b.addEventListener('click', () => { setSetting('theme', mode); refreshControlCenter(); });
    themes.append(b);
  }
  const toggles = [
    tileToggle('dnd', 'bellOff', t('cc.dnd'), () => state.settings.doNotDisturb, (v) => setSetting('doNotDisturb', v)),
    tileToggle('mute', 'volumeOff', t('cc.mute'), () => state.settings.muted, (v) => setSetting('muted', v)),
    tileToggle('dock', 'minus', t('cc.dockHide'), () => state.settings.dockMode === 'autohide', (v) => setSetting('dockMode', v ? 'autohide' : 'smart')),
    tileToggle('fs', 'expand', t('cc.fullscreen'), () => edges.nativeFullscreen, (v) => window.atoll.setFullscreen(v)),
  ];
  const size = h('input', { type: 'range', min: '40', max: '80', step: '2', value: String(state.settings.dockSize), 'aria-label': 'Taille du Dock' });
  size.addEventListener('input', () => setSetting('dockSize', +size.value));
  const walls = h('div.cc-walls');
  for (const wp of WALLPAPERS) {
    const b = h('button.cc-wall', { type: 'button', title: wp.name, dataset: { id: wp.id } });
    b.style.background = wp.css;
    b.addEventListener('click', () => { setSetting('wallpaperImage', null); setSetting('wallpaper', wp.id); applyWallpaper(); refreshControlCenter(); });
    walls.append(b);
  }
  panel.append(
    h('div.cc-block', {}, h('div.cc-title', {}, t('cc.appearance')), themes),
    h('div.cc-grid', {}, ...toggles),
    h('div.cc-block', {}, h('div.cc-title', {}, 'Dock'), h('div.cc-slider', {}, h('span', { html: icon('minus') }), size, h('span', { html: icon('plus') }))),
    h('div.cc-block', {}, h('div.cc-title', {}, t('cc.wallpaper')), walls),
    h('button.cc-more', { type: 'button', on: { click: () => { toggleControlCenter(false); wm.launch('settings'); } } }, t('menu.settings')),
  );
  panel.toggles = toggles;
  panel.size = size;
  document.getElementById('overlays').append(panel);
  return panel;
}

function refreshControlCenter() {
  if (!cc) return;
  cc.querySelectorAll('.cc-seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === state.settings.theme));
  cc.toggles.forEach((b) => b.refresh());
  cc.size.value = String(state.settings.dockSize);
  cc.querySelectorAll('.cc-wall').forEach((b) => b.classList.toggle('on', !state.settings.wallpaperImage && b.dataset.id === state.settings.wallpaper));
}
