// Transforme une touche pressée en raccourci écrit, par exemple « Mod+Shift+F ».
// « Mod » vaut ⌘ sous macOS et Ctrl ailleurs.
//
// Même logique que keyCombo() dans src/renderer/js/keys.js : les deux doivent
// rester identiques (la coquille tourne en modules du navigateur, sans
// accès aux modules de Node, d'où la copie).
const CODES = {
  Space: 'Space', Tab: 'Tab', Escape: 'Escape', Enter: 'Enter', NumpadEnter: 'Enter', Backspace: 'Backspace', Delete: 'Delete',
  ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
  Comma: ',', Period: '.', Slash: '/', Backquote: '`', IntlBackslash: '`', BracketLeft: '[', BracketRight: ']',
  Equal: '=', Minus: '-', NumpadAdd: '=', NumpadSubtract: '-', Digit0: '0', Numpad0: '0',
};
const PUNCT = new Set([',', '.', '/', '[', ']', '=', '-', '`', '+']);

function keyName(key, code) {
  if (/^F\d{1,2}$/.test(code || '')) return code;
  if (key && /^[a-z]$/i.test(key)) return key.toUpperCase();
  if (key && PUNCT.has(key)) return key === '+' ? '=' : key;
  const digit = /^(Digit|Numpad)(\d)$/.exec(code || '');
  if (digit) return digit[2];
  if (CODES[code]) return CODES[code];
  if (/^Key[A-Z]$/.test(code || '')) return code.slice(3);
  return null;
}

function comboFromInput(input, isMac) {
  if (['Meta', 'Control', 'Alt', 'Shift'].includes(input.key)) return null;
  const name = keyName(input.key, input.code);
  if (!name) return null;
  const parts = [];
  if (isMac ? input.meta : input.control) parts.push('Mod');
  if (isMac && input.control) parts.push('Ctrl');
  if (!isMac && input.meta) parts.push('Super');
  if (input.alt) parts.push('Alt');
  if (input.shift) parts.push('Shift');
  parts.push(name);
  return parts.join('+');
}

module.exports = { comboFromInput, keyName };
