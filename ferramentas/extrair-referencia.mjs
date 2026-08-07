/* ============================================================
   Extrai o texto do material de estudo da pasta para
   ferramentas/referencia/, onde ele serve de FONTE para escrever
   as lições — conferir números, achar o exemplo que falta, ver o
   recorte que a banca cobra.

       node ferramentas/extrair-referencia.mjs

   O que sai daqui não vai para o app: é material de terceiros e
   fica fora do repositório (ver .gitignore). O que vai para o app
   é o texto que escrevemos a partir dele.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { pdfTexto, limpaPagina } from './lib/pdf.mjs';
import { PASTA_PDF } from './provas.config.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DEST = path.join(RAIZ, 'ferramentas', 'referencia');
fs.mkdirSync(DEST, { recursive: true });

/* Só a versão "completa" de cada aula: a simplificada é um resumo dela. */
const alvos = [];
const dirEsp = path.join(PASTA_PDF, 'Específico');
if (fs.existsSync(dirEsp)) {
  for (const aula of fs.readdirSync(dirEsp).sort()) {
    const dir = path.join(dirEsp, aula);
    if (!fs.statSync(dir).isDirectory()) continue;
    const pdf = fs.readdirSync(dir).find(f => /completo\.pdf$/i.test(f))
             || fs.readdirSync(dir).find(f => /\.pdf$/i.test(f));
    if (pdf) alvos.push({ saida: aula.replace(/\s+/g, '-').toLowerCase() + '.txt', arq: path.join(dir, pdf) });
  }
}
/* livros com camada de texto */
for (const nome of fs.readdirSync(PASTA_PDF)) {
  if (!/\.pdf$/i.test(nome)) continue;
  if (/prova|gabarito|engenheiro|^\d+\.pdf$/i.test(nome)) continue;
  const p = path.join(PASTA_PDF, nome);
  if (!fs.statSync(p).isFile() || fs.statSync(p).size < 900 * 1024) continue;
  alvos.push({ saida: 'livro-' + nome.replace(/\.pdf$/i, '').slice(0, 40).replace(/[^\w-]/g, '-') + '.txt', arq: p });
}

for (const a of alvos) {
  const dest = path.join(DEST, a.saida);
  if (fs.existsSync(dest)) { console.log(`· já extraído: ${a.saida}`); continue; }
  try {
    const pgs = await pdfTexto(a.arq);
    const texto = pgs.map((p, i) => `\n\n===== página ${i + 1} =====\n` + limpaPagina(p).join('\n')).join('');
    const palavras = (texto.match(/\S+/g) || []).length;
    if (palavras < 500) { console.log(`⚠ sem camada de texto (escaneado): ${a.saida}`); continue; }
    fs.writeFileSync(dest, texto, 'utf8');
    console.log(`✓ ${a.saida.padEnd(46)} ${pgs.length} pág · ${Math.round(palavras / 1000)}k palavras`);
  } catch (e) {
    console.log(`✗ ${a.saida}: ${e.message.slice(0, 60)}`);
  }
}
console.log(`\nreferência em ferramentas/referencia/ (fora do repositório)`);
