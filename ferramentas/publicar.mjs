/* ============================================================
   Publica o projeto no GitHub sem precisar do git instalado.

       node ferramentas/publicar.mjs "mensagem do commit"
       node ferramentas/publicar.mjs --listar     (só mostra o que subiria)

   Usa o GitHub CLI (gh) já autenticado. O caminho é a Git Data API:
   monta a árvore completa de arquivos, cria um commit em cima do
   commit atual e move o branch para ele. Como a árvore é completa,
   arquivo que sumir daqui some do repositório também.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..');
const REPO = 'neiltonrj1/PETROPASS';
const BRANCH = 'main';
const GH = process.env.GH_PATH || 'C:\\Program Files\\GitHub CLI\\gh.exe';

/* O que NÃO vai para o repositório. */
const IGNORAR = [
  /^node_modules[\\/]/, /^\.git[\\/]/, /^_site[\\/]/, /^provas-pdf[\\/]/,
  /^demo\.html$/, /\.pdf$/i, /^package-lock\.json$/,
  /^ferramentas[\\/]DATA-original\.json$/,   // insumo da migração, já consumido
];

const BINARIOS = /\.(png|jpg|jpeg|gif|ico|woff2?|ttf|otf|pdf|zip)$/i;

function listar(dir = RAIZ, base = '') {
  const out = [];
  for (const nome of fs.readdirSync(dir)) {
    const rel = base ? `${base}/${nome}` : nome;
    const abs = path.join(dir, nome);
    if (IGNORAR.some(r => r.test(rel.replace(/\//g, path.sep)) || r.test(rel))) continue;
    if (fs.statSync(abs).isDirectory()) out.push(...listar(abs, rel));
    else out.push(rel);
  }
  return out;
}

function gh(args, entrada) {
  return execFileSync(GH, args, {
    input: entrada, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
}
const api = (rota, corpo, metodo) => JSON.parse(
  gh(['api', ...(metodo ? ['--method', metodo] : []), `repos/${REPO}/${rota}`,
    ...(corpo ? ['--input', '-'] : [])], corpo ? JSON.stringify(corpo) : undefined));

const arquivos = listar().sort();

if (process.argv.includes('--listar')) {
  let total = 0;
  for (const a of arquivos) {
    const t = fs.statSync(path.join(RAIZ, a)).size;
    total += t;
    console.log(`${(t / 1024).toFixed(1).padStart(9)} KB  ${a}`);
  }
  console.log(`\n${arquivos.length} arquivos · ${(total / 1024 / 1024).toFixed(2)} MB`);
  process.exit(0);
}

const mensagem = process.argv[2] || 'atualiza o app';

console.log(`Publicando ${arquivos.length} arquivos em ${REPO}@${BRANCH}…\n`);

/* 1. onde o branch está agora */
const ref = api(`git/ref/heads/${BRANCH}`);
const commitAtual = ref.object.sha;
console.log(`  commit atual: ${commitAtual.slice(0, 8)}`);

/* 2. blobs dos arquivos binários (os de texto vão inline na árvore) */
const itens = [];
for (const rel of arquivos) {
  const abs = path.join(RAIZ, rel);
  if (BINARIOS.test(rel)) {
    const blob = api('git/blobs', {
      content: fs.readFileSync(abs).toString('base64'),
      encoding: 'base64',
    }, 'POST');
    itens.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  blob  ${rel}`);
  } else {
    itens.push({ path: rel, mode: '100644', type: 'blob', content: fs.readFileSync(abs, 'utf8') });
  }
}

/* 3. árvore completa (sem base_tree: o que não está aqui é removido) */
console.log('  montando a árvore…');
const tree = api('git/trees', { tree: itens }, 'POST');

/* 4. commit e 5. mover o branch */
const commit = api('git/commits', {
  message: mensagem, tree: tree.sha, parents: [commitAtual],
}, 'POST');
api(`git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false }, 'PATCH');

console.log(`\n✓ publicado: ${commit.sha.slice(0, 8)} — ${mensagem}`);
console.log(`  https://github.com/${REPO}/commit/${commit.sha}`);
console.log('\n  O GitHub Actions vai refazer o build, rodar o teste e publicar o site.');
console.log(`  Acompanhe em https://github.com/${REPO}/actions`);
