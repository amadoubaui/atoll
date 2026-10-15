#!/usr/bin/env node
// Essais de bout en bout : Atoll est lancé avec un profil jetable et piloté
// comme le ferait quelqu'un (souris, clavier), sans réseau extérieur.
//
//   node scripts/test-ui.js                 -> essais
//   ATOLL_SHOTS=<dossier> node ...          -> captures d'écran en plus
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const dev = require('./dev');
dev.ensure(); // moteur et outil d'essai, installés au premier lancement
const { _electron } = require(path.join(dev.runtime, 'node_modules', 'playwright-core'));

const shots = process.env.ATOLL_SHOTS;
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';
const SNAP = process.platform === 'darwin' ? 'Control+Alt' : 'Alt+Shift';
const results = [];

// Petit site local, pour ne dépendre d'aucun service extérieur.
function startSite() {
  const server = http.createServer((req, res) => {
    const title = req.url.includes('two') ? 'Page deux' : 'Page d’essai';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>${title}</title><body style="font:20px system-ui;padding:40px;background:linear-gradient(135deg,#e0f2fe,#ccfbf1)">
      <h1>${title}</h1><input id="field" placeholder="champ de saisie" style="font-size:18px;padding:8px">
      <p><a id="two" href="/two">Aller à la page deux</a></p><p>atoll test page</p></body>`);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function launch(userData) {
  const app = await _electron.launch({
    executablePath: dev.electronBinary(),
    args: [dev.root, '--atoll-test'],
    env: { ...process.env, ATOLL_USER_DATA: userData, ATOLL_TEST: '1' },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errors.push(m.text()); });
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1440, 900); w.center(); });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
  await page.waitForTimeout(300);
  return { app, page, errors };
}

async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ✗ ${name}\n      ${String(err.stack || err).split('\n').slice(0, 4).join('\n      ')}`);
  }
}

const shot = async (page, name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, name + '.png') }); } };
const until = async (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout, polling: 50 });
const wins = (page) => page.evaluate(() => window.__atoll.wm.allWindows().map((w) => ({ id: w.id, app: w.appId, mode: w.mode, min: w.minimized, title: w.title, url: w.url, x: w.x, y: w.y, w: w.w, h: w.h })));
// Envoie une touche comme le ferait le clavier : par le processus principal,
// à la page qui a le focus (coquille ou page web).
const KEYS = { ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down' };
async function press(app, combo) {
  const parts = combo.split('+');
  let key = parts.pop();
  key = KEYS[key] || (key.length === 1 ? key.toUpperCase() : key);
  const mods = parts.map((m) => ({ Meta: 'meta', Control: 'control', Alt: 'alt', Shift: 'shift' }[m]));
  await app.evaluate(({ webContents }, { key, mods }) => {
    const wc = webContents.getFocusedWebContents() || webContents.getAllWebContents().find((w) => w.getType() === 'window');
    wc.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers: mods });
    if (key.length === 1) wc.sendInputEvent({ type: 'char', keyCode: key, modifiers: mods });
    wc.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers: mods });
  }, { key, mods });
  await new Promise((r) => setTimeout(r, 60));
}
// Position du pointeur telle que le processus principal la relève (au-dessus
// des pages web, la coquille ne reçoit pas les mouvements de la souris).
async function pointer(app, x, y) {
  await app.evaluate(({ BrowserWindow }, { x, y }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const b = w.getContentBounds();
    w.webContents.send('pointer', { x, y, w: b.width, h: b.height, inside: true, near: y < 140 || y > b.height - 160 });
  }, { x, y });
}
const focused = (page) => page.evaluate(() => window.__atoll.wm.focused()?.appId || null);

(async () => {
  const site = await startSite();
  const base = `http://127.0.0.1:${site.address().port}`;
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'atoll-test-'));
  let { app, page, errors } = await launch(userData);
  console.log('Atoll — essais de bout en bout');

  await step('premier démarrage : bureau, Dock, barre de menus, fenêtre Bienvenue', async () => {
    await until(page, () => document.querySelectorAll('.desk-item').length >= 5);
    assert.ok(await page.locator('#dock .dock-item').count() >= 10);
    assert.ok(await page.isVisible('#menubar'));
    await until(page, () => window.__atoll.wm.focused()?.appId === 'welcome');
    await shot(page, '01-bienvenue');
  });

  await step('⌘W ferme la fenêtre active', async () => {
    await press(app, `${MOD}+w`);
    await until(page, () => window.__atoll.wm.allWindows().length === 0);
  });

  let webId;
  await step('une application web s’installe et s’ouvre dans sa fenêtre', async () => {
    webId = await page.evaluate((url) => window.__atoll.addWebApp({ name: 'Essai', url }).id, base + '/');
    await until(page, (id) => !!document.querySelector(`#dock .dock-item[data-app="${id}"]`), webId);
    await page.click(`#dock .dock-item[data-app="${webId}"]`);
    await until(page, () => window.__atoll.wm.focused()?.title === 'Page d’essai');
    const w = (await wins(page))[0];
    assert.strictEqual(w.app, webId);
  });

  await step('les raccourcis marchent pendant qu’une page web a le focus', async () => {
    // Focus dans un champ de la page, puis ⌘⇧F : plein espace.
    const box = await page.locator('.window.focused webview').boundingBox();
    await page.mouse.click(box.x + 120, box.y + 100);
    await page.waitForTimeout(200);
    await press(app, `${MOD}+Shift+f`);
    await until(page, () => window.__atoll.wm.focused()?.mode === 'space');
    assert.ok(await page.evaluate(() => document.body.classList.contains('in-app-space')));
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const b = window.__atoll.wm.focused().webview.getBoundingClientRect(); return [b.left, b.top, b.width, b.height, innerWidth, innerHeight]; });
    assert.deepStrictEqual(r.slice(0, 4), [0, 0, r[4], r[5]], 'la page remplit tout l’écran, sans bordure');
    await shot(page, '03-plein-espace');
    await press(app, `${MOD}+Shift+f`);
    await until(page, () => window.__atoll.wm.focused()?.mode === 'normal' && !document.body.classList.contains('in-app-space'));
  });

  await step('en plein espace, le Dock monte près du bas mais pas tout au bord', async () => {
    await press(app, `${MOD}+Shift+f`);
    await until(page, () => window.__atoll.wm.focused()?.mode === 'space');
    await page.evaluate(() => { window.__atoll.edges.nativeFullscreen = true; });
    const H = 900;
    await pointer(app, 700, 400);
    await until(page, () => !document.querySelector('#dock').classList.contains('shown'));
    await pointer(app, 700, H - 40);
    await until(page, () => document.querySelector('#dock').classList.contains('shown'));
    await shot(page, '04-dock-revele');
    // Tout au bord, macOS a la main : le Dock d'Atoll s'efface.
    await pointer(app, 700, H - 1);
    await until(page, () => !document.querySelector('#dock').classList.contains('shown'));
    // En haut : la barre de menus descend.
    await pointer(app, 700, 6);
    await until(page, () => !document.querySelector('#menubar').classList.contains('hidden'));
    await pointer(app, 700, 450);
    await until(page, () => document.querySelector('#menubar').classList.contains('hidden'), null, 3000);
    await page.evaluate(() => { window.__atoll.edges.nativeFullscreen = false; });
    await press(app, `${MOD}+Shift+f`);
    await until(page, () => window.__atoll.wm.focused()?.mode === 'normal');
  });

  await step('aimantation : moitié gauche au clavier, puis glisser contre le bord droit', async () => {
    await press(app, `${SNAP}+ArrowLeft`);
    await until(page, () => window.__atoll.wm.focused()?.mode === 'left');
    let w = (await wins(page))[0];
    assert.strictEqual(w.x, 0);
    assert.strictEqual(w.w, 720);
    // Glisser la barre de titre jusqu'au bord droit.
    const bar = await page.locator('.window.focused .win-titlebar').boundingBox();
    await page.mouse.move(bar.x + bar.width / 2 + 60, bar.y + 20);
    await page.mouse.down();
    await page.mouse.move(1000, 300, { steps: 6 });
    await page.mouse.move(1439, 400, { steps: 6 });
    await page.mouse.up();
    await until(page, () => window.__atoll.wm.focused()?.mode === 'right');
    w = (await wins(page))[0];
    assert.strictEqual(w.x, 720);
  });

  await step('⌘M réduit dans le Dock, un clic sur l’icône la ramène', async () => {
    await press(app, `${MOD}+m`);
    await until(page, () => window.__atoll.wm.allWindows()[0].minimized);
    await page.mouse.move(700, 880);
    await page.click(`#dock .dock-item[data-app="${webId}"]`);
    await until(page, () => !window.__atoll.wm.allWindows()[0].minimized && window.__atoll.wm.focused());
  });

  await step('un lien « nouvel onglet » devient une nouvelle fenêtre', async () => {
    await page.evaluate(() => {
      const wv = window.__atoll.wm.focused().webview;
      return wv.executeJavaScript(`document.getElementById('two').target = '_blank'; document.getElementById('two').click();`, true);
    });
    await until(page, () => window.__atoll.wm.allWindows().length === 2);
    await until(page, () => window.__atoll.wm.allWindows().some((w) => w.title === 'Page deux'));
  });

  await step('Recherche (⌘K) : ouvrir Notes au clavier', async () => {
    await press(app, `${MOD}+k`);
    await page.waitForSelector('#spotlight .sp-input');
    await page.keyboard.type('notes');
    await page.waitForTimeout(100);
    await shot(page, '05-recherche');
    await page.keyboard.press('Enter');
    await until(page, () => window.__atoll.wm.focused()?.appId === 'notes');
  });

  await step('Launchpad (⌘⇧A) : recherche et lancement au clavier', async () => {
    await press(app, `${MOD}+Shift+a`);
    await page.waitForSelector('#launchpad.open');
    await page.waitForTimeout(250);
    await shot(page, '06-launchpad');
    await page.keyboard.type('régl');
    await page.keyboard.press('Enter');
    await until(page, () => window.__atoll.wm.focused()?.appId === 'settings');
    await until(page, () => !document.querySelector('#launchpad'));
  });

  await step('Mission Control (⌘⌥↑) montre toutes les fenêtres', async () => {
    await press(app, `${MOD}+Alt+ArrowUp`);
    await until(page, () => document.body.classList.contains('mission'));
    assert.strictEqual(await page.locator('.mc-cover').count(), 4);
    await page.waitForTimeout(450);
    await shot(page, '07-mission-control');
    await page.keyboard.press('Escape');
    await until(page, () => !document.body.classList.contains('mission'));
  });

  await step('⌥⇥ passe à la fenêtre précédente', async () => {
    const before = await focused(page);
    await page.keyboard.down('Alt');
    await page.keyboard.press('Tab');
    await page.waitForSelector('#switcher');
    await shot(page, '08-selecteur');
    await page.keyboard.up('Alt');
    await until(page, (b) => window.__atoll.wm.focused()?.appId !== b && !document.querySelector('#switcher'), before);
  });

  await step('espaces : nouveau bureau (⌘⌥N), retour (⌘⌥←)', async () => {
    await press(app, `${MOD}+Alt+n`);
    await until(page, () => window.__atoll.wm.getSpaces().length === 2 && window.__atoll.wm.currentSpace().id === window.__atoll.wm.getSpaces()[1].id);
    await press(app, `${MOD}+t`);
    await until(page, () => window.__atoll.wm.focused()?.appId === 'browser');
    await page.keyboard.type('127.0.0.1:' + new URL(base).port + '/two');
    await page.keyboard.press('Enter');
    await until(page, () => window.__atoll.wm.focused()?.title === 'Page deux');
    await press(app, `${MOD}+Alt+ArrowLeft`);
    await until(page, () => window.__atoll.wm.currentSpace().id === window.__atoll.wm.getSpaces()[0].id);
  });

  await step('aide des raccourcis (⌘/)', async () => {
    await press(app, `${MOD}+/`);
    await page.waitForSelector('#help.open');
    assert.ok(await page.locator('#help .help-row').count() > 30);
    await shot(page, '09-raccourcis');
    await page.keyboard.press('Escape');
    await until(page, () => !document.querySelector('#help'));
  });

  await step('barre de menus au clavier (⌘⌥M, flèches, Entrée)', async () => {
    await press(app, `${MOD}+Alt+m`);
    await page.waitForSelector('#overlays .menu');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    assert.ok(await page.evaluate(() => document.querySelector('#menubar .mb-item.open')?.dataset.key === 'app'));
    await page.keyboard.press('Escape');
    await until(page, () => !document.querySelector('#overlays .menu:not(.closing)'));
  });

  await step('Centre de contrôle : thème sombre', async () => {
    await page.click('#menubar .cc-btn');
    await page.waitForSelector('#control-center.open');
    await page.click('#control-center .cc-seg button[data-mode="dark"]');
    await until(page, () => document.documentElement.dataset.theme === 'dark');
    await shot(page, '10-centre-de-controle');
    await page.keyboard.press('Escape');
  });

  await step('bureau : nouveau dossier, une app glissée dedans', async () => {
    await page.evaluate(() => window.__atoll.wm.toggleShowDesktop());
    await press(app, `${MOD}+Shift+n`);
    await page.waitForSelector('.dialog input');
    await press(app, `${MOD}+a`);
    await page.keyboard.type('Projets');
    await page.keyboard.press('Enter');
    await until(page, () => window.__atoll.state.desktop.some((d) => d.type === 'folder' && d.name === 'Projets'));
    const folder = page.locator('.desk-item[data-type="folder"]', { hasText: 'Projets' });
    const icon = page.locator('.desk-item[data-type="app"]', { hasText: 'GitHub' });
    const a = await icon.boundingBox(), f = await folder.boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + 30);
    await page.mouse.down();
    await page.mouse.move(f.x + f.width / 2, f.y + 30, { steps: 10 });
    await page.mouse.up();
    await until(page, () => window.__atoll.state.desktop.find((d) => d.name === 'Projets').items.includes('github'));
    await page.evaluate(() => window.__atoll.wm.toggleShowDesktop());
  });

  await step('aucune erreur dans la coquille', async () => {
    assert.deepStrictEqual(errors, []);
  });

  await step('au redémarrage, les fenêtres et le bureau reviennent', async () => {
    const before = (await wins(page)).map((w) => w.app).sort();
    await page.waitForTimeout(700);
    await app.close();
    ({ app, page, errors } = await launch(userData));
    await until(page, (n) => window.__atoll.wm.allWindows().length === n, before.length);
    const after = (await wins(page)).map((w) => w.app).sort();
    assert.deepStrictEqual(after, before);
    assert.ok(await page.evaluate(() => window.__atoll.state.desktop.some((d) => d.name === 'Projets')));
    assert.strictEqual(await page.evaluate(() => window.__atoll.wm.getSpaces().length), 2);
    await shot(page, '11-session');
  });

  await app.close();
  site.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} essais réussis.`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
