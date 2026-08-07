/* ============================================================
   Servidor local com reconstrução automática.

       npm run dev     →  http://localhost:5173

   Toda vez que você salva um arquivo em src/, o index.html é
   refeito. Recarregue a página no navegador para ver.
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PORTA = 5173;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

function build() {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'ferramentas', 'build.mjs')], {
    cwd: RAIZ, encoding: 'utf8',
  });
  process.stdout.write(r.stdout || '');
  if (r.status !== 0) process.stderr.write(r.stderr || '');
  return r.status === 0;
}

build();

/* Um rebuild por lote de alterações — salvar em massa não dispara vinte builds. */
let pendente = null;
fs.watch(path.join(RAIZ, 'src'), { recursive: true }, (_, arquivo) => {
  clearTimeout(pendente);
  pendente = setTimeout(() => {
    console.log(`\n↻ ${arquivo} mudou — refazendo o index.html`);
    build();
  }, 150);
});

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const arq = path.join(RAIZ, rel);
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('não encontrado: ' + rel);
  }
  res.writeHead(200, {
    'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(arq).pipe(res);
}).listen(PORTA, () => {
  console.log(`\n▶ PETROPASS em http://localhost:${PORTA}`);
  console.log('  editando src/, o index.html se refaz sozinho. Ctrl+C para parar.\n');
});
