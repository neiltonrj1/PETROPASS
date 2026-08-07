/* ============================================================
   Mostra as colunas de um gabarito e o texto que aparece acima
   de cada uma — é assim que se descobre a `faixaX` de um cargo
   quando a folha não traz "PROVA n" legível.

       node ferramentas/mapear-gabarito.mjs "<pdf>" [página]
   ============================================================ */
import { separaColunas } from './lib/colunas.mjs';
import { pdfItens } from './lib/pdf.mjs';

const arq = process.argv[2];
const soPagina = process.argv[3] ? +process.argv[3] : null;
if (!arq) { console.log('uso: node ferramentas/mapear-gabarito.mjs "<pdf>" [página]'); process.exit(1); }

const cols = await separaColunas(arq);
const paginas = await pdfItens(arq);

let atual = -1;
for (const c of cols) {
  if (soPagina && c.pag !== soPagina - 1) continue;
  if (c.pag !== atual) { atual = c.pag; console.log(`\n──── página ${c.pag + 1} ────`); }
  const ns = Object.keys(c.respostas).map(Number).sort((a, b) => a - b);
  const yTopo = Math.max(...paginas[c.pag].filter(i => Math.abs(i.x - c.x) < 30 && /^\d{1,3}\s*[-–—]?$/.test(i.s)).map(i => i.y), 0);
  const rotulo = paginas[c.pag]
    .filter(i => i.y > yTopo && i.y < yTopo + 170 && i.x > c.x - 45 && i.x < c.x + 60)
    .sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.s).join(' ').replace(/\s+/g, ' ').slice(0, 80);
  console.log(`x=${String(c.x).padStart(4)}  ${String(c.total).padStart(2)} resp  ${ns[0]}..${ns[ns.length - 1]}  │ ${rotulo}`);
}
