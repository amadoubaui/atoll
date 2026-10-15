// Atoll — processus principal.
//
// Une seule fenêtre native : « l'écran ». Tout ce qui s'y voit (bureau, dock,
// barre de menus, fenêtres des applications) est dessiné par la coquille
// (src/renderer). Chaque application web vit dans un élément <webview> de la
// coquille : c'est ce qui permet de la déplacer, de l'animer et de faire passer
// le dock ou les menus par-dessus, comme dans un vrai système.
//
// Ce fichier s'occupe de ce que la coquille ne peut pas faire seule :
// démarrer en plein écran, verrouiller les pages web, intercepter les
// raccourcis clavier même quand une page a le focus, suivre le pointeur
// au-dessus des pages (pour faire apparaître le dock), enregistrer l'état.
const { app, BrowserWindow, Menu, ipcMain, session, screen, shell, dialog, clipboard, nativeTheme, webContents } = require('electron');
const fs = require('fs');
const path = require('path');
const { fetchIcon } = require('./icons');
const { comboFromInput } = require('./keys');

const isMac = process.platform === 'darwin';
const testMode = process.argv.includes('--atoll-test') || !!process.env.ATOLL_TEST;

if (process.env.ATOLL_USER_DATA) app.setPath('userData', path.resolve(process.env.ATOLL_USER_DATA));
app.setName('Atoll');

// Une seule instance : relancer Atoll ramène l'écran existant.
if (!testMode && !app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const PARTITION = 'persist:atoll';
const statePath = () => path.join(app.getPath('userData'), 'atoll-state.json');
let shellWin = null;
let shortcutSet = new Set();
let doNotDisturb = false;

// --- État (bureau, dock, réglages, fenêtres ouvertes) ---------------------------
function loadState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return null; }
}
let pendingState = null;
let saveTimer = null;
function writeStateNow() {
  if (!pendingState) return;
  const file = statePath();
  const tmp = file + '.tmp';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, pendingState);
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error('Enregistrement impossible :', err.message);
  }
  pendingState = null;
}
function scheduleSave(json) {
  pendingState = json;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeStateNow, 300);
}

// --- Permissions retenues par site ----------------------------------------------
const grantsPath = () => path.join(app.getPath('userData'), 'atoll-permissions.json');
function loadGrants() {
  try { return JSON.parse(fs.readFileSync(grantsPath(), 'utf8')) || {}; } catch { return {}; }
}
function saveGrants(grants) {
  try { fs.writeFileSync(grantsPath(), JSON.stringify(grants, null, 1)); } catch {}
}

// --- Identité du navigateur ----------------------------------------------------------
// Sans « Electron/… » ni « Atoll/… » dans l'identité, les sites (Google en tête)
// traitent Atoll comme le Chrome qu'il est.
function cleanUserAgent(ua) {
  return ua.replace(/\sElectron\/\S+/, '').replace(/\s(Atoll|atoll)\/\S+/, '');
}

function webSession() {
  return session.fromPartition(PARTITION);
}

function setupSession() {
  const ses = webSession();
  ses.setUserAgent(cleanUserAgent(ses.getUserAgent()));
  app.userAgentFallback = cleanUserAgent(app.userAgentFallback);

  // Permissions des sites. Sans danger : accordées d'office. Sensibles (caméra,
  // micro, position, lecture du presse-papiers, notifications) : Atoll demande,
  // une fois par site, et retient la réponse. Le reste est refusé.
  const silent = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);
  const ask = { media: 'utiliser la caméra ou le micro', geolocation: 'connaître ta position', notifications: 't’envoyer des notifications', 'clipboard-read': 'lire le presse-papiers' };
  const grants = loadGrants();
  const pending = new Map();
  ses.setPermissionRequestHandler(async (wc, permission, callback, details = {}) => {
    if (permission === 'notifications' && doNotDisturb) return callback(false);
    if (silent.has(permission)) return callback(true);
    if (!ask[permission]) return callback(false);
    let origin;
    try { origin = new URL(details.requestingUrl || wc.getURL()).origin; } catch { return callback(false); }
    if (!/^https?:/.test(origin)) return callback(false);
    const what = permission === 'media' && details.mediaTypes?.length
      ? (details.mediaTypes.includes('video') && details.mediaTypes.includes('audio') ? 'utiliser la caméra et le micro' : details.mediaTypes.includes('video') ? 'utiliser la caméra' : 'utiliser le micro')
      : ask[permission];
    const key = `${origin}|${permission}|${what}`;
    if (key in grants) return callback(grants[key]);
    // Une seule question à la fois pour la même demande.
    if (!pending.has(key)) {
      pending.set(key, dialog.showMessageBox(shellWin, {
        type: 'question',
        message: `${new URL(origin).host} voudrait ${what}.`,
        detail: 'Ta réponse est retenue pour ce site. Tu peux tout oublier dans Réglages > Confidentialité.',
        buttons: ['Refuser', 'Autoriser'],
        defaultId: 0,
        cancelId: 0,
      }).then(({ response }) => {
        grants[key] = response === 1;
        saveGrants(grants);
        return grants[key];
      }).finally(() => pending.delete(key)));
    }
    callback(await pending.get(key));
  });
  ses.setPermissionCheckHandler((wc, permission, origin) => {
    if (permission === 'notifications' && doNotDisturb) return false;
    if (silent.has(permission)) return true;
    try { origin = new URL(origin).origin; } catch { return false; }
    return Object.entries(grants).some(([k, v]) => v && k.startsWith(`${origin}|${permission}|`));
  });
  ipcMain.handle('permissions:forget', () => { for (const k of Object.keys(grants)) delete grants[k]; saveGrants(grants); return true; });

  // Téléchargements : directement dans « Téléchargements », la coquille l'annonce.
  ses.on('will-download', (event, item) => {
    const dir = app.getPath('downloads');
    let name = item.getFilename();
    // Un programme ou un script ne s'enregistre pas sans accord.
    if (/\.(app|command|tool|terminal|pkg|mpkg|dmg|sh|scpt|workflow|exe|msi|bat|cmd|ps1|vbs|jar|scr)$/i.test(name)) {
      const ok = dialog.showMessageBoxSync(shellWin, {
        type: 'warning',
        message: `Télécharger « ${name} » ?`,
        detail: `Ce fichier est un programme ou un script, proposé par ${(() => { try { return new URL(item.getURL()).host; } catch { return 'un site'; } })()}. N’accepte que s’il vient d’un site de confiance.`,
        buttons: ['Annuler', 'Télécharger'],
        defaultId: 0,
        cancelId: 0,
      });
      if (ok !== 1) { item.cancel(); return; }
    }
    let target = path.join(dir, name);
    for (let i = 1; fs.existsSync(target); i++) {
      const ext = path.extname(name);
      target = path.join(dir, `${path.basename(name, ext)} (${i})${ext}`);
    }
    item.setSavePath(target);
    send('download', { state: 'started', name: path.basename(target) });
    item.once('done', (e, state) => send('download', { state, name: path.basename(target), path: target }));
  });
}

function send(channel, ...args) {
  if (shellWin && !shellWin.isDestroyed()) shellWin.webContents.send(channel, ...args);
}

// --- La fenêtre « écran » ---------------------------------------------------------
function createShell() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  shellWin = new BrowserWindow({
    width: Math.round(width * 0.86),
    height: Math.round(height * 0.86),
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#0b1220',
    title: 'Atoll',
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 12, y: 7 },
    frame: isMac,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'shell.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });
  shellWin.center();

  shellWin.webContents.on('will-navigate', (e) => e.preventDefault());
  shellWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  shellWin.webContents.on('will-attach-webview', (event, prefs, params) => {
    // Les pages web n'ont accès à rien d'autre qu'au web.
    delete prefs.preload;
    prefs.nodeIntegration = false;
    prefs.nodeIntegrationInSubFrames = false;
    prefs.contextIsolation = true;
    prefs.sandbox = true;
    prefs.webSecurity = true;
    prefs.allowRunningInsecureContent = false;
    params.partition = PARTITION;
    const src = params.src || 'about:blank';
    if (!/^(https?:|about:blank$)/i.test(src)) event.preventDefault();
  });
  shellWin.webContents.on('did-attach-webview', (event, wc) => setupWebview(wc));

  // Atoll démarre en prenant tout l'écran, comme un système qu'on allume.
  // On peut ensuite sortir du plein écran et redimensionner la fenêtre.
  const startFullscreen = !testMode && process.env.ATOLL_WINDOWED !== '1' && (loadState()?.settings?.bootFullscreen ?? true);
  shellWin.once('ready-to-show', () => {
    shellWin.show();
    if (startFullscreen) shellWin.setFullScreen(true);
  });
  const reportFullscreen = () => send('fullscreen', shellWin.isFullScreen());
  shellWin.on('enter-full-screen', reportFullscreen);
  shellWin.on('leave-full-screen', reportFullscreen);
  shellWin.on('focus', () => send('focus', true));
  shellWin.on('blur', () => send('focus', false));
  shellWin.on('closed', () => { shellWin = null; });

  shellWin.webContents.on('before-input-event', (event, input) => onKey(event, input, shellWin.webContents.id));

  shellWin.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  // En essai, la souris est simulée : la vraie position du pointeur la contredirait.
  if (!testMode) startPointerWatch();
}

// --- Pages web (webviews) ----------------------------------------------------------
function setupWebview(wc) {
  wc.on('before-input-event', (event, input) => onKey(event, input, wc.id));

  wc.setWindowOpenHandler(({ url, disposition, features }) => {
    if (!/^https?:/i.test(url) && url !== 'about:blank') return { action: 'deny' };
    // Fenêtres surgissantes (connexion Google, paiement…) : une vraie fenêtre
    // enfant, pour que la page qui l'a ouverte garde le lien avec elle.
    if (disposition === 'new-window' && features) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: shellWin,
          width: 520, height: 680,
          autoHideMenuBar: true,
          webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false },
        },
      };
    }
    // Un lien « nouvel onglet » devient une nouvelle fenêtre dans Atoll.
    send('open-url', { url, from: wc.id, background: disposition === 'background-tab' });
    return { action: 'deny' };
  });

  wc.on('did-create-window', (child) => {
    child.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) send('open-url', { url });
      return { action: 'deny' };
    });
    child.webContents.on('will-navigate', (event, url) => { if (!/^(https?:|about:blank$)/i.test(url)) event.preventDefault(); });
    child.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape' && input.meta) child.close();
    });
  });

  wc.on('context-menu', (event, params) => showContextMenu(wc, params));
  wc.on('found-in-page', (event, result) => send('found-in-page', wc.id, result));
}

function showContextMenu(wc, p) {
  const items = [];
  const nav = wc.navigationHistory;
  // Seuls les liens web s'ouvrent ailleurs : jamais smb:, file: ou une autre application.
  if (p.linkURL && /^https?:/i.test(p.linkURL)) {
    items.push(
      { label: 'Ouvrir le lien dans une nouvelle fenêtre', click: () => send('open-url', { url: p.linkURL, from: wc.id }) },
      { label: 'Ouvrir le lien dans le navigateur du système', click: () => shell.openExternal(p.linkURL) },
      { label: 'Copier l’adresse du lien', click: () => clipboard.writeText(p.linkURL) },
      { type: 'separator' },
    );
  }
  if (p.mediaType === 'image' && p.srcURL) {
    items.push(
      { label: 'Enregistrer l’image', click: () => wc.downloadURL(p.srcURL) },
      { label: 'Copier l’image', click: () => wc.copyImageAt(p.x, p.y) },
      { type: 'separator' },
    );
  }
  if (p.isEditable) {
    items.push({ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
      { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' });
  } else if (p.selectionText) {
    items.push({ role: 'copy', label: 'Copier' },
      { label: `Rechercher « ${p.selectionText.slice(0, 24)}${p.selectionText.length > 24 ? '…' : ''} »`, click: () => send('open-url', { url: 'https://www.google.com/search?q=' + encodeURIComponent(p.selectionText), from: wc.id }) });
  } else {
    items.push(
      { label: 'Précédent', enabled: nav.canGoBack(), click: () => nav.goBack() },
      { label: 'Suivant', enabled: nav.canGoForward(), click: () => nav.goForward() },
      { label: 'Recharger', click: () => wc.reload() },
      { type: 'separator' },
      { label: 'Installer cette page comme application', click: () => send('install-page', wc.id) },
    );
  }
  items.push({ type: 'separator' }, { label: 'Inspecter', click: () => wc.inspectElement(p.x, p.y) });
  Menu.buildFromTemplate(items).popup({ window: shellWin });
}

// --- Raccourcis clavier ----------------------------------------------------------------
// Les raccourcis d'Atoll doivent marcher même quand une page a le focus : la
// coquille donne la liste, et chaque touche est comparée ici avant que la
// page ne la reçoive.
function onKey(event, input, wcId) {
  if (input.type === 'keyUp' && (input.key === 'Alt' || input.key === 'Meta' || input.key === 'Control')) send('modifier-up', input.key);
  if (input.type !== 'keyDown') return;
  const combo = comboFromInput(input, isMac);
  if (!combo || !shortcutSet.has(combo)) return;
  event.preventDefault();
  send('shortcut', combo, wcId);
}

// --- Suivi du pointeur -------------------------------------------------------------------
// Au-dessus d'une page web, la coquille ne reçoit plus les mouvements de la
// souris. Pour faire apparaître le dock ou la barre de menus près des bords,
// le pointeur est relevé ici et transmis quand il approche d'un bord.
let lastPointer = '';
function startPointerWatch() {
  setInterval(() => {
    if (!shellWin || shellWin.isDestroyed() || !shellWin.isVisible()) return;
    const b = shellWin.getContentBounds();
    const p = screen.getCursorScreenPoint();
    const x = p.x - b.x;
    const y = p.y - b.y;
    const inside = x >= 0 && y >= 0 && x < b.width && y < b.height;
    const near = inside && (y < 140 || y > b.height - 160);
    const key = near ? `${x},${y},${b.width},${b.height}` : `far:${inside}`;
    if (key === lastPointer) return;
    lastPointer = key;
    send('pointer', { x, y, w: b.width, h: b.height, inside, near });
  }, 33);
}

// --- Messages de la coquille -------------------------------------------------------------
ipcMain.on('state:load', (event) => { event.returnValue = loadState(); });
ipcMain.on('state:save', (event, json) => { if (typeof json === 'string' && json.length < 20e6) scheduleSave(json); });
ipcMain.on('shortcuts:set', (event, list) => { if (Array.isArray(list)) shortcutSet = new Set(list.map(String)); });
ipcMain.on('env', (event) => {
  event.returnValue = { platform: process.platform, test: testMode, demo: !!process.env.ATOLL_DEMO, version: app.getVersion(), locale: app.getLocale(), fullscreen: !!shellWin?.isFullScreen() };
});
ipcMain.handle('icon:fetch', (event, url) => fetchIcon(webSession(), url, app.getPath('userData')));
ipcMain.handle('fullscreen:set', (event, on) => { shellWin?.setFullScreen(!!on); return !!on; });
ipcMain.handle('window:control', (event, action) => {
  if (!shellWin) return;
  if (action === 'minimize') shellWin.minimize();
  if (action === 'maximize') shellWin.isMaximized() ? shellWin.unmaximize() : shellWin.maximize();
  if (action === 'close') shellWin.close();
});
ipcMain.handle('quit', () => app.quit());
ipcMain.handle('dnd:set', (event, on) => { doNotDisturb = !!on; });
ipcMain.handle('theme:set', (event, mode) => { nativeTheme.themeSource = ['light', 'dark'].includes(mode) ? mode : 'system'; });
ipcMain.handle('open-external', (event, url) => { if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url); });
ipcMain.handle('clear-browsing-data', async () => {
  await webSession().clearStorageData();
  await webSession().clearCache();
  return true;
});
ipcMain.handle('wallpaper:pick', async () => {
  const res = await dialog.showOpenDialog(shellWin, {
    title: 'Choisir un fond d’écran',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'] }],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const dir = path.join(app.getPath('userData'), 'wallpapers');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `fond-${Date.now()}${path.extname(res.filePaths[0]).toLowerCase()}`);
  fs.copyFileSync(res.filePaths[0], dest);
  return 'file://' + dest.split(path.sep).map(encodeURIComponent).join('/').replace(/^file:\/\/%3A/, 'file://');
});
ipcMain.handle('webview:zoom', (event, wcId, delta) => {
  const wc = webContents.fromId(wcId);
  if (!wc) return 1;
  const next = delta === 0 ? 1 : Math.min(3, Math.max(0.3, wc.getZoomFactor() + delta));
  wc.setZoomFactor(next);
  return next;
});

// --- Menu natif ------------------------------------------------------------------------------
// Il n'est pas affiché en plein écran, mais c'est lui qui fait marcher
// copier, coller et annuler dans les pages web sous macOS.
function buildMenu() {
  const template = [
    ...(isMac ? [{ label: 'Atoll', submenu: [
      { role: 'about', label: 'À propos d’Atoll' }, { type: 'separator' },
      { role: 'hide', label: 'Masquer Atoll' }, { role: 'hideOthers', label: 'Masquer les autres' }, { type: 'separator' },
      { role: 'quit', label: 'Quitter Atoll' },
    ] }] : []),
    { label: 'Édition', submenu: [
      { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
      { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
      { role: 'pasteAndMatchStyle', label: 'Coller sans la mise en forme' }, { role: 'selectAll', label: 'Tout sélectionner' },
    ] },
    { label: 'Présentation', submenu: [
      { role: 'togglefullscreen', label: 'Plein écran' },
      { label: 'Outils de développement d’Atoll', accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I', click: () => shellWin?.webContents.toggleDevTools() },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (!shellWin) return;
  if (shellWin.isMinimized()) shellWin.restore();
  shellWin.show();
  shellWin.focus();
});

app.on('open-url', (event, url) => { event.preventDefault(); send('open-url', { url }); });

app.whenReady().then(() => {
  buildMenu();
  setupSession();
  createShell();
  app.on('activate', () => { if (!shellWin) createShell(); });
});

app.on('before-quit', writeStateNow);
app.on('window-all-closed', () => { writeStateNow(); app.quit(); });
