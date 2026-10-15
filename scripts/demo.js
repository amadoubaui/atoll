#!/usr/bin/env node
// Met Atoll en scène avec de vrais sites pour les captures d'écran et la
// vidéo de présentation (README, page du projet, annonces).
//
//   node scripts/demo.js <dossier>        -> captures PNG + demo.webm
// Il faut une connexion à Internet (les sites sont réels).
const fs = require('fs');
const os = require('os');
const path = require('path');
const dev = require('./dev');
const { _electron } = require(path.join(dev.runtime, 'node_modules', 'playwright-core'));

const out = path.resolve(process.argv[2] || 'docs/media');
const W = 1440, H = 900;
const MOD = process.platform === 'darwin' ? 'meta' : 'control';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function press(app, combo) {
  const parts = combo.split('+');
  let key = parts.pop();
  key = { ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down' }[key] || (key.length === 1 ? key.toUpperCase() : key);
  const mods = parts.map((m) => (m === 'Mod' ? MOD : m.toLowerCase()));
  await app.evaluate(({ webContents }, { key, mods }) => {
    const wc = webContents.getFocusedWebContents() || webContents.getAllWebContents().find((w) => w.getType() === 'window');
    wc.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers: mods });
    wc.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers: mods });
  }, { key, mods });
}
async function pointer(app, x, y) {
  await app.evaluate(({ BrowserWindow }, { x, y }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const b = w.getContentBounds();
    w.webContents.send('pointer', { x, y, w: b.width, h: b.height, inside: true, near: y < 140 || y > b.height - 160 });
  }, { x, y });
}
async function typeSlow(page, text) { for (const c of text) { await page.keyboard.type(c); await sleep(70); } }

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'atoll-demo-'));
  // Profil préparé : pas de fenêtre Bienvenue, fond « Lagon ».
  const theme = process.env.ATOLL_DEMO_THEME || 'light';
  fs.writeFileSync(path.join(userData, 'atoll-state.json'), JSON.stringify({ version: 1, firstRun: false, settings: { theme, wallpaper: theme === 'dark' ? 'aurore' : 'lagon' } }));
  const video = process.env.ATOLL_DEMO_VIDEO !== '0';
  const app = await _electron.launch({
    executablePath: dev.electronBinary(),
    args: [dev.root, '--atoll-test'],
    env: { ...process.env, ATOLL_USER_DATA: userData, ATOLL_TEST: '1', ATOLL_DEMO: '1' },
  });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => console.error('[erreur]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await app.evaluate(({ BrowserWindow }, { W, H }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(W, H); w.center(); }, { W, H });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
  // Vidéo : les images composées par Chromium (pages web comprises), horodatées.
  const frames = [];
  let cdp = null;
  const startVideo = async () => {
    if (!video) return;
    cdp = await page.context().newCDPSession(page);
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      frames.push({ t: metadata.timestamp, data });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  };
  const shot = (name) => page.screenshot({ path: path.join(out, `${name}-${theme}.png`) });
  const A = (fn, arg) => page.evaluate(fn, arg);
  // Les icônes des sites arrivent du réseau.
  await page.waitForFunction(() => Object.values(window.__atoll.state.apps).filter((a) => a.kind === 'web' && a.icon).length >= 12, null, { timeout: 30000 }).catch(() => {});
  await sleep(1200);

  await startVideo();
  // 1. Le bureau.
  await pointer(app, 720, 450);
  await shot('01-bureau');

  // 2. Trois applications ouvertes.
  const open = (id, rect) => A(({ id, rect }) => window.__atoll.wm.createWindow(id, { rect })?.id, { id, rect });
  await open('wikipedia', { x: 70, y: 70, w: 860, h: 640 });
  await sleep(900);
  await open('excalidraw', { x: 520, y: 150, w: 860, h: 600 });
  await sleep(2500);
  await shot('02-fenetres');

  // 3. Côte à côte au clavier.
  const wins = await A(() => window.__atoll.wm.allWindows().map((w) => w.id));
  await A((id) => window.__atoll.wm.focusWindow(id), wins[0]);
  await press(app, 'Ctrl+Alt+ArrowLeft');
  await sleep(500);
  await A((id) => window.__atoll.wm.focusWindow(id), wins[1]);
  await press(app, 'Ctrl+Alt+ArrowRight');
  await sleep(900);
  await shot('03-cote-a-cote');

  // 4. Launchpad.
  await press(app, 'Mod+Shift+A');
  await sleep(900);
  await shot('04-launchpad');
  await typeSlow(page, 'you');
  await sleep(400);
  await page.keyboard.press('Enter');
  await sleep(3500);

  // 5. Plein espace, puis le Dock qui monte près du bas.
  await press(app, 'Mod+Shift+F');
  await sleep(1500);
  await pointer(app, 720, 500);
  await shot('05-plein-espace');
  await pointer(app, 720, H - 40);
  await sleep(700);
  await shot('06-dock-revele');
  await pointer(app, 720, 8);
  await sleep(700);
  await shot('07-barre-haut');
  await pointer(app, 720, 500);
  await sleep(600);
  await press(app, 'Mod+Shift+F');
  await sleep(900);

  // 6. Mission Control.
  await press(app, 'Mod+Alt+ArrowUp');
  await sleep(1100);
  await shot('08-mission-control');
  await page.keyboard.press('Escape');
  await sleep(700);

  // 7. Recherche.
  await press(app, 'Mod+K');
  await sleep(400);
  await typeSlow(page, 'git');
  await sleep(700);
  await shot('09-recherche');
  await page.keyboard.press('Escape');
  await sleep(500);

  // 8. Centre de contrôle.
  await page.click('#menubar .cc-btn');
  await sleep(700);
  await shot('10-centre-de-controle');
  await page.keyboard.press('Escape');
  await sleep(600);

  // 9. Aide des raccourcis.
  await press(app, 'Mod+/');
  await sleep(700);
  await shot('11-raccourcis');
  await page.keyboard.press('Escape');
  await sleep(800);

  if (cdp) await cdp.send('Page.stopScreencast').catch(() => {});
  await app.close();
  if (frames.length) {
    // Chaque image dure jusqu'à la suivante (fichier de concaténation de ffmpeg).
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atoll-frames-'));
    let list = '';
    frames.forEach((f, i) => {
      const name = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`);
      fs.writeFileSync(name, Buffer.from(f.data, 'base64'));
      const d = i + 1 < frames.length ? frames[i + 1].t - f.t : 0.5;
      list += `file '${name}'\nduration ${Math.max(0.01, d).toFixed(3)}\n`;
    });
    list += `file '${path.join(dir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`)}'\n`;
    fs.writeFileSync(path.join(dir, 'list.txt'), list);
    const mp4 = path.join(out, `demo-${theme}.mp4`);
    require('child_process').execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-vf', 'fps=30,scale=1440:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', mp4]);
    console.log(`Vidéo : ${mp4} (${frames.length} images)`);
  }
  console.log('Captures dans ' + out);
})().catch((e) => { console.error(e); process.exit(1); });
