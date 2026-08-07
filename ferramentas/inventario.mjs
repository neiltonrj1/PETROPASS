/* Mede o material de referência da pasta: páginas e volume de texto.
   Serve para dimensionar o que dá para aproveitar antes de escrever.

       node ferramentas/inventario.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { pdfTexto } from './lib/pdf.mjs';
import { PASTA_PDF } from './provas.config.mjs';

const alvos = [];
const varrer = (dir, rotulo) => {
  if (!fs.existsSync(dir)) return;
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    const st = fs.statSync(p);
    if (st.isDirectory()) varrer(p, rotulo + '/' + nome);
    else if (/\.pdf$/i.test(nome) && st.size > 600 * 1024) alvos.push({ p, rotulo, nome, mb: st.size / 1024 / 1024 });
  }
};
varrer(path.join(PASTA_PDF, 'Específico'), 'curso · Específico');
varrer(path.join(PASTA_PDF, 'Português'), 'curso · Português');
for (const nome of fs.readdirSync(PASTA_PDF)) {
  const p = path.join(PASTA_PDF, nome);
  if (!fs.statSync(p).isFile() || !/\.pdf$/i.test(nome)) continue;
  if (/prova|gabarito|engenheiro|^\d+\.pdf$/i.test(nome)) continue;
  if (fs.statSync(p).size < 900 * 1024) continue;
  alvos.push({ p, rotulo: 'livro', nome, mb: fs.statSync(p).size / 1024 / 1024 });
}

console.log(`${alvos.length} arquivos de referência\n`);
let totPag = 0, totPal = 0;
for (const a of alvos) {
  try {
    const pgs = await pdfTexto(a.p);
    const texto = pgs.flat().join(' ');
    const palavras = (texto.match(/\S+/g) || []).length;
    totPag += pgs.length; totPal += palavras;
    console.log(`${a.rotulo.padEnd(20)} ${String(pgs.length).padStart(4)} pág · ${String(Math.round(palavras / 1000)).padStart(4)}k palavras · ${a.nome.slice(0, 46)}`);
  } catch (e) {
    console.log(`${a.rotulo.padEnd(20)}  erro ao ler: ${a.nome.slice(0, 46)} (${e.message.slice(0, 40)})`);
  }
}
console.log(`\nTOTAL: ${totPag} páginas · ${Math.round(totPal / 1000)} mil palavras de referência disponíveis`);
