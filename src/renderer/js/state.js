// L'état d'Atoll : applications, Dock, bureau, notes, réglages et fenêtres
// ouvertes. Il est enregistré par le processus principal (atoll-state.json).
import { bus } from './util.js';

const WEB_APPS = [
  ['gmail', 'Gmail', 'https://mail.google.com/', '#ea4335'],
  ['calendar', 'Agenda', 'https://calendar.google.com/', '#4285f4'],
  ['drive', 'Drive', 'https://drive.google.com/', '#fbbc04'],
  ['maps', 'Plans', 'https://www.google.com/maps', '#34a853'],
  ['youtube', 'YouTube', 'https://www.youtube.com/', '#ff0033'],
  ['whatsapp', 'WhatsApp', 'https://web.whatsapp.com/', '#25d366'],
  ['claude', 'Claude', 'https://claude.ai/', '#d97757'],
  ['chatgpt', 'ChatGPT', 'https://chatgpt.com/', '#10a37f'],
  ['notion', 'Notion', 'https://www.notion.so/', '#191919'],
  ['figma', 'Figma', 'https://www.figma.com/', '#a259ff'],
  ['canva', 'Canva', 'https://www.canva.com/', '#00c4cc'],
  ['excalidraw', 'Excalidraw', 'https://excalidraw.com/', '#6965db'],
  ['spotify', 'Spotify', 'https://open.spotify.com/', '#1db954'],
  ['github', 'GitHub', 'https://github.com/', '#24292f'],
  ['wikipedia', 'Wikipédia', 'https://fr.wikipedia.org/', '#3a3a3a'],
  ['x', 'X', 'https://x.com/', '#000000'],
  ['linkedin', 'LinkedIn', 'https://www.linkedin.com/', '#0a66c2'],
];

export const BUILTIN = ['launchpad', 'browser', 'settings', 'notes', 'welcome', 'folder'];

export function defaultState() {
  const apps = {
    launchpad: { id: 'launchpad', kind: 'builtin', name: 'Launchpad' },
    browser: { id: 'browser', kind: 'builtin', name: 'Navigateur' },
    settings: { id: 'settings', kind: 'builtin', name: 'Réglages' },
    notes: { id: 'notes', kind: 'builtin', name: 'Notes' },
    welcome: { id: 'welcome', kind: 'builtin', name: 'Bienvenue' },
    folder: { id: 'folder', kind: 'builtin', name: 'Dossier', hidden: true },
  };
  for (const [id, name, url, color] of WEB_APPS) apps[id] = { id, kind: 'web', name, url, color, icon: null };
  // Google Agenda déclare l'icône générale de Google : on lui donne la sienne.
  apps.calendar.iconUrl = 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png';

  // Le bureau se remplit en colonnes depuis le coin haut-droit, comme sur macOS.
  const desktopItems = [
    { type: 'app', appId: 'welcome' },
    { type: 'folder', name: 'Google', items: ['gmail', 'calendar', 'drive', 'maps'], color: '#4f8df7' },
    { type: 'folder', name: 'Création', items: ['figma', 'canva', 'excalidraw'], color: '#a77bf3' },
    { type: 'folder', name: 'Réseaux', items: ['x', 'linkedin', 'whatsapp'], color: '#2fbf8f' },
    { type: 'app', appId: 'chatgpt' },
    { type: 'app', appId: 'github' },
    { type: 'app', appId: 'wikipedia' },
  ];
  const desktop = desktopItems.map((item, i) => ({ id: `d${i + 1}`, col: 0, row: i, ...item }));

  return {
    version: 1,
    firstRun: true,
    settings: {
      lang: 'fr',
      theme: 'auto',
      accent: 'lagon',
      wallpaper: 'lagon',
      wallpaperImage: null,
      bootFullscreen: true,
      bootAnimation: true,
      dockSize: 54,
      dockMagnify: true,
      dockMode: 'smart', // always | smart | autohide
      revealOffset: 8, // bande ignorée tout en bas (là où le Dock de macOS apparaît)
      revealDepth: 70, // hauteur de la zone qui fait apparaître le Dock
      windowToolbar: true,
      doNotDisturb: false,
      muted: false,
      uiScale: 1,
      reduceMotion: false,
      searchEngine: 'google',
    },
    apps,
    dock: ['launchpad', 'browser', 'gmail', 'calendar', 'whatsapp', 'youtube', 'spotify', 'notion', 'claude', 'figma', 'notes', 'settings'],
    desktop,
    notes: [
      { id: 'n1', title: 'Bienvenue dans Notes', body: 'Tes notes restent sur cet ordinateur.\n\nÉcris ici ce que tu veux garder sous la main : idées, listes, adresses.', updated: Date.now() },
    ],
    spaces: 1,
    session: [],
  };
}

function merge(saved) {
  const base = defaultState();
  if (!saved || saved.version !== 1) return base;
  const state = { ...base, ...saved, settings: { ...base.settings, ...(saved.settings || {}) } };
  // Les applications intégrées existent toujours, même si l'état est ancien.
  for (const id of BUILTIN) if (!state.apps[id]) state.apps[id] = base.apps[id];
  state.dock = (state.dock || []).filter((id) => state.apps[id]);
  state.desktop = (state.desktop || []).filter((d) => d.type === 'folder' || state.apps[d.appId]);
  for (const d of state.desktop) if (d.type === 'folder') d.items = (d.items || []).filter((id) => state.apps[id]);
  return state;
}

export const state = merge(window.atoll?.loadState?.());

let timer = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { window.atoll?.saveState(JSON.stringify(state)); } catch (err) { console.error(err); }
  }, 150);
}

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
  bus.emit('settings', key, value);
}
