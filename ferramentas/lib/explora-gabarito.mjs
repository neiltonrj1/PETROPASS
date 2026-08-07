/* Utilitário de inspeção: mostra as colunas de um gabarito com um rótulo
   aproximado, para descobrir qual coluna é a do cargo que interessa.
   Uso:  node ferramentas/lib/explora-gabarito.mjs "<caminho do pdf>" */
import { colunasDoGabarito } from './gabarito.mjs';
import { pdfItens } from './pdf.mjs';

const arq = process.argv[2];
const { colunas, paginas } = await colunasDoGabarito(arq);
console.log(`\n=== ${arq}`);
for (const c of colunas) {
  if (c.n < 8) continue;
  const ns = Object.keys(c.respostas).map(Number).sort((a, b) => a - b);
  // título: fragmentos da mesma faixa X que ficam acima da primeira resposta
  const itens = paginas[c.pag];
  const yTopo = Math.max(...itens.filter(i => Math.abs(i.x - c.x) < 60 && /^\d{1,3}\s*[-–—]?$/.test(i.s.trim())).map(i => i.y), 0);
  const titulo = itens
    .filter(i => i.y > yTopo && i.y < yTopo + 190 && i.x > c.x - 55 && i.x < c.x + 75)
    .sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.s).join('').replace(/\s+/g, ' ').slice(0, 90);
  console.log(`  pág ${c.pag + 1} · x≈${Math.round(c.x).toString().padStart(4)} · ${String(c.n).padStart(3)} respostas · ${ns[0]}..${ns[ns.length - 1]}  | ${titulo}`);
}
