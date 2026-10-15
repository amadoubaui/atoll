#!/usr/bin/env node
// Lance Atoll en développement.
// Le moteur (Electron, donc Chromium) est installé une fois dans ~/.atoll-dev,
// hors du projet : le dépôt reste léger et sans node_modules.
//
//   node scripts/dev.js                 -> lance Atoll
//   ATOLL_USER_DATA=/tmp/x node ...     -> profil jetable (essais)
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const version = require('../package.json').atoll.electron;
const runtime = process.env.ATOLL_RUNTIME || path.join(os.homedir(), '.atoll-dev');
const pkg = path.join(runtime, 'node_modules', 'electron', 'package.json');

function installed() {
  try { return JSON.parse(fs.readFileSync(pkg, 'utf8')).version; } catch { return null; }
}

function npm(args, cwd) {
  execFileSync('npm', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

function ensure() {
  if (installed() !== version || !fs.existsSync(path.join(runtime, 'node_modules', 'playwright-core', 'package.json'))) {
    console.log(`Installation d'Electron ${version} dans ${runtime}…`);
    fs.mkdirSync(runtime, { recursive: true });
    const manifest = path.join(runtime, 'package.json');
    if (!fs.existsSync(manifest)) fs.writeFileSync(manifest, '{"name":"atoll-runtime","private":true}\n');
    npm(['install', `electron@${version}`, 'playwright-core', '--no-audit', '--no-fund'], runtime);
  }
  return path.join(runtime, 'node_modules', 'electron', 'cli.js');
}

function electronBinary() {
  ensure();
  return require(path.join(runtime, 'node_modules', 'electron'));
}

module.exports = { root, runtime, ensure, electronBinary };

if (require.main === module) {
  const cli = ensure();
  const child = spawn(process.execPath, [cli, root, ...process.argv.slice(2)], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
}
