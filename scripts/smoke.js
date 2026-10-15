#!/usr/bin/env node
// Essai rapide : lance Atoll avec un profil jetable, relève les erreurs et
// prend une capture d'écran.  node scripts/smoke.js <dossier-captures>
const path = require('path');
const fs = require('fs');
const os = require('os');
const dev = require('./dev');
const { _electron } = require(path.join(dev.runtime, 'node_modules', 'playwright-core'));

(async () => {
  const out = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'atoll-shots-'));
  fs.mkdirSync(out, { recursive: true });
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'atoll-smoke-'));
  const bin = process.env.ATOLL_BIN;
  const app = await _electron.launch({ executablePath: bin || dev.electronBinary(), args: bin ? ['--atoll-test'] : [dev.root, '--atoll-test'], env: { ...process.env, ATOLL_USER_DATA: userData, ATOLL_TEST: '1' } });
  const page = await app.firstWindow();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1440, 900); w.center(); });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 }).catch(() => errors.push('pas prêt'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, 'smoke.png') });
  console.log(errors.join('\n') || 'aucune erreur');
  console.log('capture :', path.join(out, 'smoke.png'));
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
