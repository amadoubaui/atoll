// Éléments d'interface communs : menus contextuels, boîtes de dialogue, bulles.
import { h, $, clamp, animate } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { prettyCombo } from './keys.js';

const layer = () => $('#overlays');

// --- Menu (contextuel ou déroulant) -------------------------------------------------------
// items : [{ label, icon, combo, action, disabled, checked, danger } | '-' ]
let openMenu = null;
export function closeMenu() {
  if (!openMenu) return;
  const m = openMenu;
  openMenu = null;
  m.cleanup();
  m.node.classList.add('closing');
  setTimeout(() => m.node.remove(), 120);
}

export function showMenu(items, x, y, opts = {}) {
  closeMenu();
  const node = h('div.menu', { role: 'menu', tabindex: '-1' });
  if (opts.className) node.classList.add(opts.className);
  const buttons = [];
  for (const item of items) {
    if (!item) continue;
    if (item === '-') { node.append(h('div.menu-sep')); continue; }
    if (item.header) { node.append(h('div.menu-header', {}, item.header)); continue; }
    const btn = h('button.menu-item', { role: 'menuitem', disabled: !!item.disabled, type: 'button' });
    if (item.danger) btn.classList.add('danger');
    btn.innerHTML = `<span class="mi-check">${item.checked ? icon('check') : ''}</span>${item.icon ? icon(item.icon, 'mi-icon') : ''}<span class="mi-label"></span>${item.combo ? `<span class="mi-combo">${prettyCombo(item.combo)}</span>` : ''}`;
    btn.querySelector('.mi-label').textContent = item.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      item.action?.();
    });
    btn.addEventListener('mouseenter', () => btn.focus({ preventScroll: true }));
    node.append(btn);
    buttons.push(btn);
  }
  layer().append(node);
  const r = node.getBoundingClientRect();
  const W = innerWidth, H = innerHeight;
  node.style.left = clamp(x, 6, W - r.width - 6) + 'px';
  node.style.top = (y + r.height > H - 6 ? Math.max(6, y - r.height) : y) + 'px';

  const onDown = (e) => { if (!node.contains(e.target) && !opts.anchor?.contains(e.target)) closeMenu(); };
  const onKey = (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); opts.onEscape?.(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); next(i, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); next(i, -1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { opts.onArrow?.(e.key === 'ArrowLeft' ? -1 : 1, e); }
  };
  const next = (i, d) => {
    const enabled = buttons.filter((b) => !b.disabled);
    if (!enabled.length) return;
    const cur = enabled.indexOf(buttons[i]);
    enabled[(cur + d + enabled.length) % enabled.length].focus();
  };
  setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', closeMenu);
  openMenu = {
    node,
    cleanup() {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', closeMenu);
      opts.onClose?.();
    },
  };
  node.focus({ preventScroll: true });
  if (opts.focusFirst) next(-1, 1);
  return node;
}
export const menuIsOpen = () => !!openMenu;

// --- Boîte de dialogue -----------------------------------------------------------------------
// fields : [{ name, label, value, placeholder, type }]
export function dialog({ title, text, fields = [], ok = t('dialog.ok'), cancel = t('dialog.cancel'), danger, validate, extra }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const form = h('form.dialog', { role: 'dialog', 'aria-modal': 'true' });
    form.append(h('h2', {}, title));
    if (text) form.append(h('p.dialog-text', {}, text));
    const inputs = {};
    for (const f of fields) {
      const input = h('input', { name: f.name, value: f.value || '', placeholder: f.placeholder || '', type: f.type || 'text', autocomplete: 'off', spellcheck: false });
      inputs[f.name] = input;
      form.append(h('label.field', {}, h('span', {}, f.label), input));
    }
    if (extra) form.append(extra);
    const error = h('p.dialog-error');
    form.append(error);
    const cancelBtn = h('button.btn', { type: 'button' }, cancel);
    const okBtn = h('button.btn.primary', { type: 'submit' }, ok);
    if (danger) okBtn.classList.add('danger');
    form.append(h('div.dialog-actions', {}, cancelBtn, okBtn));
    const scrim = h('div.scrim', {}, form);
    layer().append(scrim);
    animate(form, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 200 });

    const close = (value) => {
      scrim.classList.add('closing');
      setTimeout(() => scrim.remove(), 160);
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', onKey, true);
    cancelBtn.onclick = () => close(null);
    scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(null); });
    form.onsubmit = (e) => {
      e.preventDefault();
      const values = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v.value.trim()]));
      const problem = validate?.(values);
      if (problem) { error.textContent = problem; return; }
      close(fields.length ? values : true);
    };
    const first = Object.values(inputs)[0];
    setTimeout(() => { (first || okBtn).focus(); first?.select?.(); }, 30);
  });
}

// --- Bulles d'information ---------------------------------------------------------------------
export function toast(message, { icon: ic = 'info', action, timeout = 4200 } = {}) {
  let box = $('#toasts');
  if (!box) { box = h('div#toasts'); layer().append(box); }
  const node = h('div.toast', { role: 'status' });
  node.innerHTML = `${icon(ic)}<span></span>`;
  node.querySelector('span').textContent = message;
  if (action) node.append(h('button.toast-action', { type: 'button', on: { click: () => { action.run(); dismiss(); } } }, action.label));
  box.append(node);
  const dismiss = () => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 260);
  };
  node.addEventListener('click', (e) => { if (!e.target.closest('.toast-action')) dismiss(); });
  setTimeout(dismiss, timeout);
  return dismiss;
}
