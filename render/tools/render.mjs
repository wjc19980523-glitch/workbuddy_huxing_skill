// Renders every frame of the composition with parallel headless Chrome workers.
// node tools/render.mjs <frameDir> [workers] [fromFrame] [toFrame] [projectPath]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, CHROME_ARGS } from './server.mjs';

const [dir = '/tmp/huxing_frames', W = '3', F0 = '0', F1 = '1500', projectPath = ''] = process.argv.slice(2);
const projectQuery = projectPath ? `?project=${encodeURIComponent(path.basename(projectPath))}` : '';
const FPS = 30, workers = Number(W), from = Number(F0), to = Number(F1);
fs.mkdirSync(dir, { recursive: true });
const name = f => `${dir}/f_${String(f).padStart(5, '0')}.jpg`;
const todo = []; for (let f = from; f < to; f++) if (!fs.existsSync(name(f))) todo.push(f);
console.log(`${todo.length} frames to render with ${workers} workers`);
const { srv, port } = await startServer();
const t0 = Date.now(); let done = 0;

async function worker(k) {
  const mine = todo.filter((_, i) => Math.floor(i * workers / todo.length) === k);   // contiguous chunk
  if (!mine.length) return;
  const b = await puppeteer.launch({ executablePath: (() => {
    const cands = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
    return cands.find((x) => { try { return fs.existsSync(x); } catch { return false; } }) || '/usr/bin/google-chrome';
  })(), headless: 'new', args: CHROME_ARGS, protocolTimeout: 0 });
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 720 });
  p.on('pageerror', e => console.log(`[w${k}] ERR`, e.message));
  const url = projectPath ? `http://127.0.0.1:${port}/?project=/__abs/${encodeURIComponent(projectPath)}` : `http://127.0.0.1:${port}/`;
  await p.goto(url, { timeout: 0, waitUntil: 'domcontentloaded' });
  await p.waitForFunction('window.__ready === true', { timeout: 0, polling: 500 });
  for (const f of mine) {
    await p.evaluate(t => window.__seek(t), f / FPS);
    const tmp = name(f) + '.tmp';
    await p.screenshot({ path: tmp, type: 'jpeg', quality: 93 });
    fs.renameSync(tmp, name(f));
    done++;
    if (done % 25 === 0) { const s = (Date.now() - t0) / 1000; console.log(`${done}/${todo.length} · ${s.toFixed(0)} s · eta ${(s / done * (todo.length - done) / 60).toFixed(1)} min`); }
  }
  await b.close();
}
await Promise.all([...Array(workers).keys()].map(worker));
srv.close();
console.log('render done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
