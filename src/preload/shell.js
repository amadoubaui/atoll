// Pont entre la coquille (src/renderer) et le processus principal.
// La coquille n'a pas accès à Node : seulement à ces quelques fonctions.
const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (fn) => {
  const handler = (event, ...args) => fn(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('atoll', {
  env: ipcRenderer.sendSync('env'),
  loadState: () => ipcRenderer.sendSync('state:load'),
  saveState: (json) => ipcRenderer.send('state:save', json),
  setShortcuts: (list) => ipcRenderer.send('shortcuts:set', list),
  fetchIcon: (url) => ipcRenderer.invoke('icon:fetch', url),
  setFullscreen: (on) => ipcRenderer.invoke('fullscreen:set', on),
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  quit: () => ipcRenderer.invoke('quit'),
  setDoNotDisturb: (on) => ipcRenderer.invoke('dnd:set', on),
  setTheme: (mode) => ipcRenderer.invoke('theme:set', mode),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),
  pickWallpaper: () => ipcRenderer.invoke('wallpaper:pick'),
  zoom: (wcId, delta) => ipcRenderer.invoke('webview:zoom', wcId, delta),
  onShortcut: listen('shortcut'),
  onPointer: listen('pointer'),
  onOpenUrl: listen('open-url'),
  onInstallPage: listen('install-page'),
  onFullscreen: listen('fullscreen'),
  onFocus: listen('focus'),
  onDownload: listen('download'),
  onFoundInPage: listen('found-in-page'),
  onModifierUp: listen('modifier-up'),
});
