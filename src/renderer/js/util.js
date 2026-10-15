// Petits outils partagés par toute la coquille.

// h('div.class#id', { attrs, on: { click } }, ...enfants)
export function h(spec, props = {}, ...children) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(spec) || [];
  const node = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') node.classList.add(part.slice(1));
    else node.id = part.slice(1);
  }
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'on') for (const [ev, fn] of Object.entries(value)) node.addEventListener(ev, fn);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Bus d'événements minimal entre modules.
const listeners = new Map();
export const bus = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  },
  emit(name, ...args) {
    for (const fn of listeners.get(name) || []) {
      try { fn(...args); } catch (err) { console.error(`[bus:${name}]`, err); }
    }
  },
};

export const reducedMotion = () => document.documentElement.classList.contains('reduce-motion')
  || matchMedia('(prefers-reduced-motion: reduce)').matches;

// Lance une animation Web et attend sa fin (immédiat si les animations sont réduites).
export function animate(node, frames, opts) {
  if (!node || reducedMotion()) return Promise.resolve();
  const anim = node.animate(frames, { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none', ...opts });
  return anim.finished.catch(() => {});
}

export function normalizeUrl(input) {
  const text = String(input || '').trim();
  if (!text) return null;
  if (/^https?:/i.test(text)) return text;
  if (/^localhost(:\d+)?(\/|$)/i.test(text) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(text)) return 'http://' + text;
  if (!/\s/.test(text) && /^[^/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(text)) return 'https://' + text;
  return null;
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
