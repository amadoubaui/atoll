#!/usr/bin/env node
// Fabrique Atoll pour Linux, sans dépendance : copie le moteur Electron, le
// renomme, y place le code d'Atoll, coupe les fusibles, puis en fait une
// archive tar.gz.
//
//   node scripts/build-linux.js          -> <runtime>/dist/Atoll-linux/atoll
//                                           <runtime>/dist/Atoll-<version>-linux-x64.tar.gz
//   node scripts/build-linux.js --fuses  -> relit seulement les fusibles de l'application fabriquée
//
// À lancer sous Linux (le moteur installé doit être celui de Linux).
// ATOLL_LINUX_DIST=<dossier> : moteur Linux déjà décompressé, pour fabriquer
// depuis un autre système (l'archive « electron-v…-linux-x64.zip »).
//
// L'archive contient un dossier « Atoll » : le programme atoll, atoll.desktop,
// l'icône et LISEZMOI.txt. Pas d'installateur.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dev = require('./dev');
const { cutFuses, checkFuses } = require('./fuses');

const pkg = require('../package.json');
const root = dev.root;
const args = process.argv.slice(2);
const arch = process.env.ATOLL_LINUX_ARCH || (process.arch === 'arm64' ? 'arm64' : 'x64');
const name = 'Atoll';
const tarName = `Atoll-${pkg.version}-linux-${arch}.tar.gz`;
const out = path.join(dev.runtime, 'dist');
const work = path.join(out, 'Atoll-linux');
const appDir = path.join(work, name);
const bin = path.join(appDir, 'atoll');

if (args.includes('--fuses')) {
  checkFuses(bin);
  process.exit(0);
}

let dist = process.env.ATOLL_LINUX_DIST;
if (!dist) {
  const cli = dev.ensure();
  dist = path.join(dev.runtime, 'node_modules', 'electron', 'dist');
  if (!fs.existsSync(path.join(dist, 'electron'))) {
    // Le téléchargement du moteur a pu être différé : un lancement à vide le déclenche.
    try { execFileSync(process.execPath, [cli, '--version'], { stdio: 'pipe' }); } catch {}
  }
}
if (!fs.existsSync(path.join(dist, 'electron')) || !fs.existsSync(path.join(dist, 'chrome-sandbox'))) {
  console.error(`Moteur Linux introuvable dans ${dist}. Ce script se lance sous Linux (ou avec ATOLL_LINUX_DIST).`);
  process.exit(1);
}

console.log('Copie du moteur…');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.cpSync(dist, appDir, { recursive: true, verbatimSymlinks: true });
fs.renameSync(path.join(appDir, 'electron'), bin);
fs.chmodSync(bin, 0o755);

console.log('Installation du code d’Atoll…');
const resources = path.join(appDir, 'resources');
fs.rmSync(path.join(resources, 'default_app.asar'), { force: true });
const target = path.join(resources, 'app');
fs.mkdirSync(path.join(target, 'assets'), { recursive: true });
fs.cpSync(path.join(root, 'src'), path.join(target, 'src'), { recursive: true });
for (const f of ['package.json', 'LICENSE']) fs.copyFileSync(path.join(root, f), path.join(target, f));
fs.copyFileSync(path.join(root, 'assets', 'icon.png'), path.join(target, 'assets', 'icon.png'));

// Fusibles d'Electron (scripts/fuses.js) : sous Linux, la table est dans le programme lui-même.
cutFuses(bin);
checkFuses(bin);

// Icône et raccourci pour le menu des applications (voir LISEZMOI.txt).
fs.copyFileSync(path.join(root, 'assets', 'icon.png'), path.join(appDir, 'atoll.png'));
fs.writeFileSync(path.join(appDir, 'atoll.desktop'), [
  '[Desktop Entry]',
  'Type=Application',
  'Name=Atoll',
  'Comment=Le navigateur qui démarre comme un système',
  'Exec=atoll %U',
  'Icon=atoll',
  'Terminal=false',
  'Categories=Network;WebBrowser;',
  'StartupWMClass=Atoll',
  '',
].join('\n'));

const notice = fs.readFileSync(path.join(__dirname, 'LISEZMOI-linux.txt'), 'utf8').replace(/\{version\}/g, pkg.version);
fs.writeFileSync(path.join(appDir, 'LISEZMOI.txt'), notice);
console.log('Application prête : ' + bin);

const tarball = path.join(out, tarName);
fs.rmSync(tarball, { force: true });
try {
  execFileSync('tar', ['-czf', tarball, '--owner=0', '--group=0', name], { cwd: work, stdio: 'inherit' });
  console.log('Archive : ' + tarball);
} catch (err) {
  console.error('Archive non créée : ' + err.message);
  process.exitCode = 1;
}
