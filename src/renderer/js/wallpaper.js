// Fonds d'écran : dégradés dessinés pour Atoll (aucune image à télécharger)
// ou une image choisie par l'utilisateur.
import { $ } from './util.js';
import { state } from './state.js';

export const WALLPAPERS = [
  { id: 'lagon', name: 'Lagon', dark: false, css: `
    radial-gradient(ellipse 38% 30% at 50% 52%, #7ff3e2 0%, #2fd3c5 45%, rgba(47,211,197,0) 72%),
    radial-gradient(ellipse 46% 38% at 50% 52%, rgba(255,240,206,.0) 58%, #fff0cc 63%, #f6d9a3 66%, rgba(246,217,163,0) 71%),
    radial-gradient(ellipse 80% 70% at 50% 52%, #1fb5c9 0%, #0d8fb8 38%, #0a5f94 70%, #08345f 100%)` },
  { id: 'aurore', name: 'Aurore', dark: true, css: `
    radial-gradient(ellipse 60% 50% at 20% 25%, rgba(45,212,191,.55), transparent 70%),
    radial-gradient(ellipse 50% 45% at 80% 30%, rgba(129,140,248,.55), transparent 70%),
    radial-gradient(ellipse 70% 60% at 60% 90%, rgba(236,72,153,.35), transparent 70%),
    linear-gradient(160deg, #0b1023 0%, #111833 50%, #070a17 100%)` },
  { id: 'dune', name: 'Dune', dark: false, css: `
    radial-gradient(ellipse 90% 60% at 30% 110%, #e9a46a 0%, rgba(233,164,106,0) 70%),
    radial-gradient(ellipse 80% 55% at 85% 100%, #d97757 0%, rgba(217,119,87,0) 65%),
    linear-gradient(180deg, #fbe7cf 0%, #f6cfa4 45%, #eeb487 100%)` },
  { id: 'corail', name: 'Corail', dark: false, css: `
    radial-gradient(ellipse 60% 55% at 15% 20%, #ffd1c2 0%, rgba(255,209,194,0) 70%),
    radial-gradient(ellipse 55% 50% at 85% 75%, #ff8a73 0%, rgba(255,138,115,0) 70%),
    radial-gradient(ellipse 70% 60% at 60% 30%, #ffb199 0%, rgba(255,177,153,0) 70%),
    linear-gradient(135deg, #ffe6dc 0%, #ff9f8a 100%)` },
  { id: 'abysse', name: 'Abysse', dark: true, css: `
    radial-gradient(ellipse 70% 50% at 50% -10%, rgba(56,189,248,.45), transparent 70%),
    radial-gradient(ellipse 40% 30% at 75% 70%, rgba(20,184,166,.25), transparent 70%),
    linear-gradient(180deg, #06263f 0%, #041627 55%, #020a14 100%)` },
  { id: 'graphite', name: 'Graphite', dark: true, css: `
    radial-gradient(ellipse 80% 60% at 30% 20%, #3a3f4b 0%, transparent 70%),
    radial-gradient(ellipse 60% 50% at 80% 90%, #2a2e37 0%, transparent 70%),
    linear-gradient(160deg, #1d2027 0%, #121418 100%)` },
  { id: 'brume', name: 'Brume', dark: false, css: `
    radial-gradient(ellipse 60% 50% at 25% 30%, #e0e7ff 0%, rgba(224,231,255,0) 70%),
    radial-gradient(ellipse 55% 50% at 80% 70%, #ccfbf1 0%, rgba(204,251,241,0) 70%),
    linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)` },
];

export function currentWallpaper() {
  return WALLPAPERS.find((w) => w.id === state.settings.wallpaper) || WALLPAPERS[0];
}

export function applyWallpaper() {
  const node = $('#wallpaper');
  if (!node) return;
  const img = state.settings.wallpaperImage;
  if (img) {
    node.style.background = `center / cover no-repeat url("${img.replace(/"/g, '%22')}")`;
    node.dataset.tone = 'image';
  } else {
    const wp = currentWallpaper();
    node.style.background = wp.css;
    node.dataset.tone = wp.dark ? 'dark' : 'light';
  }
  document.body.dataset.wallTone = node.dataset.tone;
}
