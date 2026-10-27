// Counts the project's own source lines (src/, excluding node_modules and generated/baked assets) → web/gen/loc.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', 'gen', 'frames', 'vr']);
const EXT = new Set(['.js', '.mjs', '.html', '.css', '.py', '.sh']);
let lines = 0, files = 0; const list = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (EXT.has(path.extname(e.name)) && !['package.json', 'package-lock.json'].includes(e.name)) {
      const n = fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim().length).length;
      lines += n; files++; list.push([path.relative(ROOT, p), n]);
    }
  }
})(ROOT);
fs.mkdirSync(path.join(ROOT, 'web/gen'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'web/gen/loc.json'), JSON.stringify({ lines, files, list }, null, 1));
console.log(`${lines} lines of code · ${files} files`);
