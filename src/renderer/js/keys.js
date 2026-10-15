// Même logique que src/main/keys.js (à garder identique) : une touche devient
// un raccourci écrit, « Mod » valant ⌘ sous macOS et Ctrl ailleurs.
const CODES = {
  Space: 'Space', Tab: 'Tab', Escape: 'Escape', Enter: 'Enter', NumpadEnter: 'Enter', Backspace: 'Backspace', Delete: 'Delete',
  ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
  Comma: ',', Period: '.', Slash: '/', Backquote: '`', IntlBackslash: '`', BracketLeft: '[', BracketRight: ']',
  Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-', Digit0: '0', Numpad0: '0',
};
const PUNCT = new Set([',', '.', '/', '[', ']', '=', '-', '`', '+']);

export const isMac = window.atoll?.env?.platform === 'darwin';

export function keyName(key, code) {
  if (/^F\d{1,2}$/.test(code || '')) return code;
  if (key && /^[a-z]$/i.test(key)) return key.toUpperCase();
  if (key && PUNCT.has(key)) return key === '+' ? '=' : key;
  const digit = /^(Digit|Numpad)(\d)$/.exec(code || '');
  if (digit) return digit[2];
  if (CODES[code]) return CODES[code];
  if (/^Key[A-Z]$/.test(code || '')) return code.slice(3);
  return null;
}

export function keyCombo(e) {
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return null;
  const name = keyName(e.key, e.code);
  if (!name) return null;
  const parts = [];
  if (isMac ? e.metaKey : e.ctrlKey) parts.push('Mod');
  if (isMac && e.ctrlKey) parts.push('Ctrl');
  if (!isMac && e.metaKey) parts.push('Super');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(name);
  return parts.join('+');
}

// « Mod+Shift+F » -> « ⌘⇧F » (macOS) ou « Ctrl+Maj+F ».
export function prettyCombo(combo) {
  const parts = combo.split('+');
  const key = parts.pop();
  const keys = { Left: '←', Right: '→', Up: '↑', Down: '↓', Space: isMac ? 'Espace' : 'Espace', Enter: '↩', Escape: 'Échap', Tab: '⇥', Backspace: '⌫' };
  const k = keys[key] || key;
  if (isMac) {
    const mods = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Mod: '⌘' };
    const order = ['Ctrl', 'Alt', 'Shift', 'Mod'];
    return order.filter((m) => parts.includes(m)).map((m) => mods[m]).join('') + k;
  }
  const mods = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Maj', Super: 'Win' };
  return [...parts.map((m) => mods[m] || m), k].join('+');
}
