// Zones près des bords de l'écran : approcher le pointeur du bas fait monter
// le Dock, approcher du haut fait descendre la barre de menus et les réglages.
//
// Atoll démarre en plein écran macOS. Dans ce mode, le Dock et la barre de
// menus de macOS apparaissent quand le pointeur touche le bord même de
// l'écran. Pour que les deux ne se superposent pas, la zone d'Atoll s'arrête
// quelques pixels avant le bord : on descend « juste un peu » pour Atoll,
// jusqu'au bout pour macOS (et Atoll s'efface alors).
import { bus } from './util.js';
import { state } from './state.js';
import { MENUBAR_H } from './wm.js';

export const edges = { top: false, bottom: false, nativeFullscreen: !!window.atoll?.env?.fullscreen };
let hideTimer = { top: 0, bottom: 0 };

function set(which, on, delay = 0) {
  clearTimeout(hideTimer[which]);
  if (on) {
    if (!edges[which]) { edges[which] = true; bus.emit('edges', edges); }
    return;
  }
  if (!edges[which]) return;
  const off = () => { edges[which] = false; bus.emit('edges', edges); };
  if (delay) hideTimer[which] = setTimeout(off, delay); else off();
}

// Mesure de la zone basse : [h - décalage - profondeur, h - décalage].
export function bottomZone(h) {
  const offset = state.settings.revealOffset;
  const depth = state.settings.revealDepth;
  return { from: h - offset - depth, to: h - offset };
}

function onPointer({ x, y, w, h, inside }) {
  if (!inside) { set('top', false, 300); set('bottom', false, 300); return; }
  const fs = edges.nativeFullscreen;
  // macOS a la main tout au bord en plein écran : Atoll s'efface.
  const yieldBottom = fs && y >= h - 2;
  const yieldTop = fs && y <= 0;

  // Bas
  const zone = bottomZone(h);
  const dockTop = h - state.settings.dockSize - 16 - 20 - 24;
  if (yieldBottom) set('bottom', false);
  else if (y >= zone.from && y <= zone.to) set('bottom', true);
  else if (edges.bottom && y >= dockTop - 30) set('bottom', true);
  else set('bottom', false, 380);

  // Haut
  const revealed = document.body.classList.contains('in-app-space');
  if (yieldTop) set('top', false);
  else if (y >= 1 && y <= 12) set('top', true);
  else if (edges.top && y <= MENUBAR_H + (revealed ? 44 : 0) + 8) set('top', true);
  else if (document.querySelector('#menubar .menu-open, #control-center.open')) set('top', true);
  else set('top', false, 420);
}

export function initEdges() {
  window.atoll?.onPointer?.((p) => {
    if (!p.near && p.inside) { set('top', false, 300); set('bottom', false, 300); return; }
    onPointer(p);
  });
  // Au-dessus de la coquille elle-même, les mouvements arrivent aussi ici
  // (et c'est la seule source pendant les essais automatisés).
  document.addEventListener('mousemove', (e) => onPointer({ x: e.clientX, y: e.clientY, w: innerWidth, h: innerHeight, inside: true }), { passive: true });
  window.atoll?.onFullscreen?.((on) => { edges.nativeFullscreen = on; bus.emit('native-fullscreen', on); });
}
