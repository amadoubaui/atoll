// Les applications intégrées : Navigateur (page de départ), Réglages, Notes,
// Bienvenue et les fenêtres de dossier du bureau.
import { h, $, $$, bus, uid, normalizeUrl, hostOf, debounce } from './util.js';
import { state, save, setSetting } from './state.js';
import { getApp, appName, appIcon, allApps, addWebApp, updateApp, removeApp } from './apps.js';
import { t, setLang } from './i18n.js';
import { icon, LOGO } from './icons.js';
import { WALLPAPERS, applyWallpaper } from './wallpaper.js';
import { prettyCombo } from './keys.js';
import { dialog, toast, showMenu } from './ui.js';

// wm.js importe aussi ce module : ses fonctions ne servent qu'après le démarrage.
import * as wm from './wm.js';
import * as commandsMod from './commands.js';

const setTitle = (win, s) => { win.title = s; win.titleText.textContent = s; bus.emit('window-title', win); };

export const builtins = {
  // --- Navigateur : page de départ, puis une page web ---------------------------------------------
  browser: {
    size: null,
    mount(win, body, opts) {
      if (opts?.url) { wm.mountWebview(win, opts.url); return; }
      setTitle(win, t('browser.newtab'));
      const input = h('input.start-input', { type: 'text', placeholder: t('browser.placeholder'), spellcheck: false, autocomplete: 'off' });
      const tiles = h('div.start-tiles');
      for (const id of state.dock) {
        const a = getApp(id);
        if (!a || a.kind !== 'web') continue;
        const b = h('button.start-tile', { type: 'button' }, appIcon(a, 52), h('span', {}, appName(a)));
        b.addEventListener('click', () => go(a.url));
        tiles.append(b);
      }
      const go = (text) => {
        const url = normalizeUrl(text) || 'https://www.google.com/search?q=' + encodeURIComponent(text);
        win.url = url;
        wm.mountWebview(win, url);
        win.webview.focus();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) go(input.value.trim()); });
      body.append(h('div.start', {}, h('div.start-logo', { html: LOGO }), h('h1', {}, t('browser.start')),
        h('div.start-search', {}, h('span', { html: icon('search') }), input), tiles));
      win.startInput = input;
    },
    focus(win) { win.startInput?.focus(); },
  },

  // --- Dossier du bureau -----------------------------------------------------------------------------
  folder: {
    size: [560, 420],
    mount(win, body, opts) {
      win.folderId = opts?.folderId || opts?.data?.folderId;
      const draw = () => {
        const d = state.desktop.find((x) => x.id === win.folderId);
        if (!d) { setTimeout(() => wm.closeWindow(win.id), 0); return; }
        setTitle(win, d.name);
        win.titleIcon.replaceChildren(h('span', { html: icon('folder') }));
        const grid = h('div.folder-view');
        for (const appId of d.items) {
          const a = getApp(appId);
          if (!a) continue;
          const b = h('button.folder-item', { type: 'button' }, appIcon(a, 64), h('span', {}, appName(a)));
          b.addEventListener('dblclick', () => wm.launch(a.id));
          b.addEventListener('keydown', (e) => { if (e.key === 'Enter') wm.launch(a.id); });
          b.addEventListener('click', (e) => { if (e.detail === 1) setTimeout(() => {}, 0); });
          b.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showMenu([
              { label: t('menu.open'), icon: 'external', action: () => wm.launch(a.id) },
              { label: t('menu.removeFromFolder'), icon: 'minus', action: () => import('./desktop.js').then((m) => m.moveOutOfFolder(d.id, a.id)) },
            ], e.clientX, e.clientY);
          });
          grid.append(b);
        }
        if (!d.items.length) grid.append(h('p.folder-empty', {}, t('folder.empty')));
        body.replaceChildren(grid);
      };
      draw();
      win.offFolder = bus.on('folder-changed', (id) => { if (id === win.folderId) draw(); });
      win.offApps = bus.on('apps-changed', draw);
    },
    beforeClose(win) { win.offFolder?.(); win.offApps?.(); },
    serialize(win) { return { folderId: win.folderId }; },
  },

  // --- Notes ------------------------------------------------------------------------------------------------
  notes: {
    size: [820, 560],
    mount(win, body, opts) {
      const list = h('div.notes-list');
      const titleInput = h('input.notes-title', { type: 'text', placeholder: 'Titre', spellcheck: true });
      const text = h('textarea.notes-body', { placeholder: 'Écris ici…', spellcheck: true });
      const newBtn = h('button.tb-btn', { type: 'button', title: 'Nouvelle note', html: icon('pencil') });
      const delBtn = h('button.tb-btn', { type: 'button', title: 'Supprimer la note', html: icon('trash') });
      let current = opts?.noteId || opts?.data?.noteId || state.notes[0]?.id;
      const persist = debounce(() => save(), 300);
      const drawList = () => {
        list.replaceChildren(...state.notes.slice().sort((a, b) => b.updated - a.updated).map((n) => {
          const b = h('button.notes-item', { type: 'button' }, h('strong', {}, n.title || t('win.untitled')), h('span', {}, new Date(n.updated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + (n.body || '').split('\n').find((l) => l.trim()) ?? ''));
          b.classList.toggle('on', n.id === current);
          b.addEventListener('click', () => { current = n.id; drawEditor(); drawList(); });
          return b;
        }));
      };
      const note = () => state.notes.find((n) => n.id === current);
      const drawEditor = () => {
        const n = note();
        titleInput.value = n?.title || '';
        text.value = n?.body || '';
        titleInput.disabled = text.disabled = !n;
      };
      const edit = () => {
        const n = note();
        if (!n) return;
        n.title = titleInput.value;
        n.body = text.value;
        n.updated = Date.now();
        persist();
        drawList();
      };
      titleInput.addEventListener('input', edit);
      text.addEventListener('input', edit);
      newBtn.addEventListener('click', () => {
        const n = { id: uid('n'), title: '', body: '', updated: Date.now() };
        state.notes.push(n);
        current = n.id;
        save();
        drawList(); drawEditor();
        titleInput.focus();
      });
      delBtn.addEventListener('click', async () => {
        const n = note();
        if (!n) return;
        const ok = await dialog({ title: 'Supprimer cette note ?', text: n.title || t('win.untitled'), ok: t('menu.remove'), danger: true });
        if (!ok) return;
        state.notes = state.notes.filter((x) => x !== n);
        current = state.notes[0]?.id;
        save();
        drawList(); drawEditor();
      });
      body.append(h('div.notes', {}, h('aside.notes-side', {}, h('div.notes-tools', {}, newBtn, delBtn), list), h('div.notes-editor', {}, titleInput, text)));
      win.noteInputs = { titleInput, text };
      win.getNoteId = () => current;
      drawList(); drawEditor();
    },
    focus(win) { win.noteInputs?.text.focus(); },
    serialize(win) { return { noteId: win.getNoteId?.() }; },
  },

  // --- Bienvenue -----------------------------------------------------------------------------------------
  welcome: {
    size: [760, 600],
    mount(win, body) {
      const k = (combo) => h('kbd', {}, prettyCombo(combo));
      const card = (ic, title, text, ...keys) => h('div.wl-card', {}, h('span.wl-ic', { html: icon(ic) }), h('div', {}, h('h3', {}, title), h('p', {}, text), keys.length ? h('div.wl-keys', {}, ...keys) : null));
      body.append(h('div.welcome', {},
        h('div.wl-hero', {}, h('div.wl-logo', { html: LOGO }), h('div', {},
          h('h1', {}, 'Bienvenue dans Atoll'),
          h('p', {}, 'Le navigateur qui démarre comme un système. Tes sites deviennent des applications, chacune dans sa fenêtre.'))),
        h('div.wl-grid', {},
          card('apps', 'Le Dock', 'Approche le pointeur du bas de l’écran, sans toucher le bord : le Dock monte. Glisse une icône dehors pour la retirer.', k('Mod+1')),
          card('sliders', 'En haut, les réglages', 'Approche le pointeur du haut : la barre de menus et le Centre de contrôle descendent.', k('Mod+,')),
          card('expand', 'Plein espace', 'Le bouton vert fait prendre à une fenêtre tout l’écran, sans bordure, dans son propre espace.', k('Mod+Shift+F')),
          card('search', 'Tout au clavier', 'Cherche une app, une fenêtre ou une adresse. Toutes les commandes ont un raccourci.', k('Mod+K'), k('Mod+/')),
          card('spaces', 'Espaces et Mission Control', 'Plusieurs bureaux, et toutes les fenêtres d’un coup d’œil.', k('Mod+Alt+Up'), k('Mod+Alt+Right')),
          card('plus', 'Tes applications', 'N’importe quel site devient une application : dans le Dock, sur le bureau, dans un dossier.', k('Mod+Shift+D')),
        ),
        h('div.wl-actions', {},
          h('button.btn', { type: 'button', on: { click: () => commandsMod.run('help') } }, 'Voir tous les raccourcis'),
          h('button.btn', { type: 'button', on: { click: () => window.atoll.openExternal('https://github.com/amadoubaui/atoll') } }, h('span', { html: icon('github') }), 'Atoll sur GitHub'),
          h('button.btn.primary', { type: 'button', on: { click: () => wm.closeWindow(win.id) } }, 'Commencer'),
        ),
      ));
      setTitle(win, t('app.welcome'));
    },
  },

  // --- Réglages ---------------------------------------------------------------------------------------------
  settings: {
    size: [860, 600],
    mount(win, body) {
      const sections = [
        ['general', 'gear', 'Général'],
        ['appearance', 'photo', 'Apparence'],
        ['dock', 'apps', 'Dock et bords de l’écran'],
        ['apps', 'grid', 'Applications'],
        ['keyboard', 'keyboard', 'Raccourcis clavier'],
        ['privacy', 'lock', 'Confidentialité'],
        ['about', 'info', 'À propos'],
      ];
      const side = h('nav.set-side');
      const main = h('div.set-main');
      let currentSection = 'general';
      const show = (id) => {
        currentSection = id;
        $$('.set-nav', side).forEach((b) => b.classList.toggle('on', b.dataset.id === id));
        main.replaceChildren(...(PAGES[id]?.() || []));
        main.scrollTop = 0;
      };
      for (const [id, ic, label] of sections) {
        const b = h('button.set-nav', { type: 'button', dataset: { id }, html: `${icon(ic)}<span></span>` });
        b.querySelector('span').textContent = label;
        b.addEventListener('click', () => show(id));
        side.append(b);
      }
      body.append(h('div.settings', {}, side, main));
      win.showSection = show;
      win.offSection = bus.on('settings:section', show);
      win.offApps = bus.on('apps-changed', () => { if (currentSection === 'apps') show('apps'); });
      show('general');
    },
    beforeClose(win) { win.offSection?.(); win.offApps?.(); },
    focus(win) { win.body.querySelector('.set-nav.on')?.focus(); },
  },
};

// --- Pages des réglages ---------------------------------------------------------------------------
const row = (label, hint, control) => h('div.set-row', {}, h('div.set-label', {}, h('span', {}, label), hint ? h('small', {}, hint) : null), control);
function toggle(key, onChange) {
  const input = h('input', { type: 'checkbox', checked: !!state.settings[key] });
  input.addEventListener('change', () => { setSetting(key, input.checked); onChange?.(input.checked); });
  return h('label.switch', {}, input, h('span'));
}
function select(key, options, onChange) {
  const sel = h('select');
  for (const [value, label] of options) {
    const o = h('option', { value }, label);
    if (String(state.settings[key]) === String(value)) o.selected = true;
    sel.append(o);
  }
  sel.addEventListener('change', () => { setSetting(key, sel.value); onChange?.(sel.value); });
  return sel;
}
function range(key, min, max, step, unit = '') {
  const out = h('output', {}, state.settings[key] + unit);
  const input = h('input', { type: 'range', min, max, step, value: state.settings[key] });
  input.addEventListener('input', () => { setSetting(key, +input.value); out.textContent = input.value + unit; });
  return h('div.set-range', {}, input, out);
}
const group = (title, ...rows) => h('section.set-group', {}, title ? h('h2', {}, title) : null, h('div.set-card', {}, ...rows));

const PAGES = {
  general: () => [
    group('Démarrage',
      row('Démarrer en plein écran', 'Atoll prend tout l’écran à l’ouverture, comme un système qu’on allume.', toggle('bootFullscreen')),
      row('Animation de démarrage', null, toggle('bootAnimation')),
    ),
    group('Langue',
      row('Langue de l’interface', null, select('lang', [['fr', 'Français'], ['en', 'English']], (v) => { setLang(v); toast(v === 'en' ? 'Language changed. Some panels update after reopening.' : 'Langue changée.'); })),
    ),
    group('Fenêtres',
      row('Animations réduites', 'Moins de mouvement à l’écran.', toggle('reduceMotion', (v) => document.documentElement.classList.toggle('reduce-motion', v))),
    ),
  ],
  appearance: () => {
    const themes = h('div.seg');
    for (const [mode, label] of [['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']]) {
      const b = h('button', { type: 'button' }, label);
      b.classList.toggle('on', state.settings.theme === mode);
      b.addEventListener('click', () => { setSetting('theme', mode); themes.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
      themes.append(b);
    }
    const accents = h('div.accents');
    for (const [id, color, label] of ACCENTS) {
      const b = h('button.accent', { type: 'button', title: label, style: { background: color } });
      b.classList.toggle('on', state.settings.accent === id);
      b.addEventListener('click', () => { setSetting('accent', id); accents.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
      accents.append(b);
    }
    const walls = h('div.walls');
    const drawWalls = () => {
      walls.replaceChildren();
      for (const wp of WALLPAPERS) {
        const b = h('button.wall', { type: 'button', title: wp.name }, h('span.wall-pic', { style: { background: wp.css } }), h('span', {}, wp.name));
        b.classList.toggle('on', !state.settings.wallpaperImage && state.settings.wallpaper === wp.id);
        b.addEventListener('click', () => { setSetting('wallpaperImage', null); setSetting('wallpaper', wp.id); applyWallpaper(); drawWalls(); });
        walls.append(b);
      }
      const custom = h('button.wall', { type: 'button' }, h('span.wall-pic.custom', { html: icon('photo') }), h('span', {}, 'Ta photo…'));
      if (state.settings.wallpaperImage) { custom.querySelector('.wall-pic').style.background = `center/cover url("${state.settings.wallpaperImage}")`; custom.querySelector('.wall-pic').innerHTML = ''; custom.classList.add('on'); }
      custom.addEventListener('click', async () => {
        const url = await window.atoll.pickWallpaper();
        if (url) { setSetting('wallpaperImage', url); applyWallpaper(); drawWalls(); }
      });
      walls.append(custom);
    };
    drawWalls();
    return [
      group('Thème', row('Apparence', 'Automatique suit le réglage de ton ordinateur.', themes), row('Couleur d’accentuation', null, accents)),
      group('Fond d’écran', walls),
    ];
  },
  dock: () => [
    group('Dock',
      row('Taille', null, range('dockSize', 40, 80, 2, ' px')),
      row('Agrandissement au survol', null, toggle('dockMagnify')),
      row('Affichage', 'Intelligent : le Dock s’efface quand une fenêtre vient sur lui.', select('dockMode', [['smart', 'Intelligent'], ['always', 'Toujours visible'], ['autohide', 'Masqué automatiquement']])),
    ),
    group('Bords de l’écran',
      row('Zone d’apparition du Dock', 'Hauteur de la bande, en bas de l’écran, qui fait monter le Dock.', range('revealDepth', 30, 160, 5, ' px')),
      row('Marge au-dessus du bord', 'Atoll ignore ces derniers pixels : en plein écran, macOS y fait apparaître son propre Dock. Les deux ne se superposent plus.', range('revealOffset', 0, 40, 1, ' px')),
    ),
  ],
  apps: () => {
    const list = h('div.set-apps');
    for (const a of allApps().filter((x) => x.id !== 'launchpad')) {
      const actions = h('div.set-app-actions');
      if (a.kind === 'web') {
        actions.append(
          h('button.tb-btn', { type: 'button', title: t('menu.editApp'), html: icon('pencil'), on: { click: () => bus.emit('app:edit', a.id) } }),
          h('button.tb-btn.danger', { type: 'button', title: t('menu.remove'), html: icon('trash'), on: { click: async () => {
            const ok = await dialog({ title: `${t('menu.remove')} « ${appName(a)} » ?`, ok: t('menu.remove'), danger: true });
            if (ok) removeApp(a.id);
          } } }),
        );
      }
      list.append(h('div.set-app', {}, appIcon(a, 34), h('div.set-app-text', {}, h('strong', {}, appName(a)), h('small', {}, a.url ? hostOf(a.url) : 'Intégrée à Atoll')), actions));
    }
    return [
      group('Applications installées', h('div.set-row', {}, h('div.set-label', {}, h('span', {}, 'Ajouter un site comme application'), h('small', {}, 'Ou, depuis une page ouverte : menu ⋯ de la fenêtre, « Installer cette page ».')),
        h('button.btn.primary', { type: 'button', on: { click: () => bus.emit('app:add') } }, t('menu.addApp'))), list),
    ];
  },
  keyboard: () => {
    const groups = { system: 'Système', windows: 'Fenêtres', spaces: 'Espaces', page: 'Pages web', desktop: 'Bureau et Dock' };
    return Object.entries(groups).map(([g, title]) => group(title, ...commandsMod.commands.filter((c) => c.group === g && c.label).map((c) =>
      row(commandsMod.labelOf(c), null, h('span.help-keys', {}, ...c.combos.map((k) => h('kbd', {}, prettyCombo(k))))))));
  },
  privacy: () => [
    group('Données de navigation',
      row('Effacer les cookies, connexions et le cache', 'Tu seras déconnecté de tous les sites.', h('button.btn.danger', { type: 'button', on: { click: async () => {
        const ok = await dialog({ title: 'Tout effacer ?', text: 'Cookies, connexions, stockage des sites et cache.', ok: 'Effacer', danger: true });
        if (ok) { await window.atoll.clearBrowsingData(); toast('Données effacées.', { icon: 'check' }); }
      } } }, 'Effacer…')),
      row('Autorisations des sites', 'Caméra, micro, position, notifications : Atoll demande pour chaque site et retient ta réponse.', h('button.btn', { type: 'button', on: { click: async () => {
        await window.atoll.forgetPermissions();
        toast('Les sites te redemanderont leurs autorisations.', { icon: 'check' });
      } } }, 'Tout oublier')),
      row('Ne pas déranger', 'Les sites ne peuvent plus envoyer de notifications.', toggle('doNotDisturb')),
    ),
    group('Ce qu’Atoll ne fait pas',
      h('p.set-note', {}, 'Atoll n’envoie aucune donnée d’usage, ne contient aucun mouchard et ne se connecte à aucun serveur à lui. Tes réglages, ton bureau et tes notes restent sur cet ordinateur.'),
    ),
  ],
  about: () => [
    h('div.about', {}, h('div.about-logo', { html: LOGO }), h('h1', {}, 'Atoll'), h('p', {}, `Version ${window.atoll?.env?.version || ''}`),
      h('p.about-text', {}, 'Le navigateur qui démarre comme un système. Moteur Chromium. Logiciel libre sous licence MIT, créé par Amadou Ba (PIXEWORK).'),
      h('div.about-actions', {},
        h('button.btn', { type: 'button', on: { click: () => window.atoll.openExternal('https://github.com/amadoubaui/atoll') } }, 'Code source sur GitHub'),
        h('button.btn', { type: 'button', on: { click: () => window.atoll.openExternal('https://github.com/amadoubaui/atoll/issues/new') } }, 'Signaler un problème'),
        h('button.btn.primary', { type: 'button', on: { click: () => window.atoll.openExternal('https://buymeacoffee.com/amadouba') } }, h('span', { html: icon('heart') }), 'Soutenir le projet'),
      )),
  ],
};

export const ACCENTS = [
  ['lagon', '#14b8a6', 'Lagon'],
  ['ocean', '#2f7cf6', 'Océan'],
  ['corail', '#e5604a', 'Corail'],
  ['orchidee', '#a855f7', 'Orchidée'],
  ['soleil', '#f59e0b', 'Soleil'],
  ['graphite', '#6b7280', 'Graphite'],
];

// --- Ajouter ou modifier une application ---------------------------------------------------------
export async function addAppDialog(prefill = {}) {
  const res = await dialog({
    title: t('dialog.addAppTitle'),
    fields: [
      { name: 'url', label: t('dialog.appUrl'), value: prefill.url || '', placeholder: 'exemple.com' },
      { name: 'name', label: t('dialog.appName'), value: prefill.name || '', placeholder: 'Nom affiché' },
    ],
    ok: t('dialog.add'),
    validate: (v) => (normalizeUrl(v.url) ? null : t('dialog.badUrl')),
  });
  if (!res) return null;
  const url = normalizeUrl(res.url);
  const name = res.name || prettyHost(url);
  const app = addWebApp({ name, url });
  toast(t('toast.installed', { name }), { icon: 'check' });
  return app;
}

export async function editAppDialog(id) {
  const a = getApp(id);
  if (!a) return;
  const res = await dialog({
    title: t('dialog.editAppTitle'),
    fields: [
      { name: 'name', label: t('dialog.appName'), value: appName(a) },
      { name: 'url', label: t('dialog.appUrl'), value: a.url || '' },
    ],
    ok: t('dialog.save'),
    validate: (v) => (normalizeUrl(v.url) ? null : t('dialog.badUrl')),
  });
  if (!res) return;
  updateApp(id, { name: res.name || a.name, url: normalizeUrl(res.url) });
}

export function prettyHost(url) {
  const host = hostOf(url).split('.');
  const main = host.length > 1 ? host[host.length - 2] : host[0];
  return main ? main[0].toUpperCase() + main.slice(1) : url;
}
