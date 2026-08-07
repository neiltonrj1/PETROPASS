/* ============================================================
   Confere, prova a prova, se o caderno e o gabarito foram lidos
   por inteiro. Rode sempre que acrescentar uma prova nova:

       npm run conferir
   ============================================================ */
import path from 'node:path';
import fs from 'node:fs';
import { pdfTexto } from './lib/pdf.mjs';
import { recortaQuestoes } from './lib/prova.mjs';
import { leGabarito } from './lib/gabarito.mjs';
import { PROVAS, PASTA_PDF } from './provas.config.mjs';

const faltantes = (obj, ini, fim, chave = x => x) => {
  const f = [];
  for (let i = ini; i <= fim; i++) if (chave(obj, i) === undefined) f.push(i);
  return f;
};

console.log('prova         questões               gabarito');
console.log('─'.repeat(78));

for (const p of PROVAS) {
  const cad = path.join(PASTA_PDF, p.pdf);
  const gab = path.join(PASTA_PDF, p.gab);
  let linhaQ = 'PDF não encontrado', linhaG = '—';

  if (fs.existsSync(cad)) {
    const qs = recortaQuestoes(await pdfTexto(cad), { ate: p.ate });
    const achou = new Set(qs.map(q => q.n));
    const falta = faltantes(null, p.ini, p.ate, (_, i) => (achou.has(i) ? true : undefined));
    linhaQ = `${String(qs.filter(q => q.n >= p.ini).length).padStart(2)}/${p.ate - p.ini + 1}` +
      (falta.length ? `  falta ${falta.join(',')}` : '  completo');
  }
  if (fs.existsSync(gab)) {
    const g = await leGabarito(gab, p);
    if (!g) linhaG = `NÃO LIDO (${p.gab}, prova ${p.num})`;
    else {
      const falta = faltantes(g, p.ini, p.ate, (o, i) => o[i]);
      linhaG = falta.length ? `falta ${falta.join(',')}` : 'completo';
    }
  } else linhaG = 'PDF não encontrado';

  console.log(`${p.id.padEnd(12)} ${linhaQ.padEnd(24)} ${linhaG}`);
}
