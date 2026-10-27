// Tiny static file server for the composition (ES modules need http, not file://).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm', '.hdr': 'application/octet-stream' };

export function startServer(port = 0) {
  const srv = http.createServer((req, res) => {
    const [pathname, query] = req.url.split('?');
    const url = decodeURIComponent(pathname);
    let file;
    if (url === '/') {
      file = path.join(ROOT, 'web/index.html');
    } else if (url.startsWith('/assets/')) {
      file = path.join(ROOT, '..', url.slice(8));
    } else if (url.startsWith('/__abs/')) {
      file = decodeURIComponent(url.slice(7));
    } else if (url.startsWith('/web/')) {
      file = path.join(ROOT, url);
    } else {
      // Try web/ first for relative paths from index.html
      const webFile = path.join(ROOT, 'web', url);
      const rootFile = path.join(ROOT, url);
      if (fs.existsSync(webFile)) {
        file = webFile;
      } else {
        file = rootFile;
      }
    }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('404 ' + url); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise(r => srv.listen(port, '127.0.0.1', () => r({ srv, port: srv.address().port })));
}

export const CHROME_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox',
  '--disable-web-security', '--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port } = await startServer(Number(process.argv[2] || 8123));
  console.log('serving on', port);
}
