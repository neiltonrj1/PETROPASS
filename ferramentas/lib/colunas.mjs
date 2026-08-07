/* ============================================================
   Separa um gabarito em tabela nas suas colunas, usando só a
   coordenada X das respostas. Serve para as folhas de 2012 e 2014,
   em que o nome do cargo é impresso na vertical e sai do PDF picado
   em dezenas de pedaços — não há título legível para casar.
   ============================================================ */
import { pdfItens } from './pdf.mjs';

const RESP = /^(\d{1,3})\s*[-–—]\s*([A-E])$/;

function paresDaPagina(itens) {
  const porY = [];
  const ord = [...itens].sort((a, b) => b.y - a.y || a.x - b.x);
  let linha = null;
  for (const it of ord) {
    if (!linha || Math.abs(linha.y - it.y) > 3) { linha = { y: it.y, itens: [] }; porY.push(linha); }
    linha.itens.push(it);
  }
  const pares = [];
  for (const L of porY) {
    const its = L.itens.sort((a, b) => a.x - b.x);
    for (let i = 0; i < its.length; i++) {
      for (let k = 1; k <= 3 && i + k <= its.length; k++) {
        const m = its.slice(i, i + k).map(t => t.s).join(' ').replace(/\s+/g, ' ').trim().match(RESP);
        if (m) { pares.push({ n: +m[1], letra: m[2], x: its[i].x, y: its[i].y }); i += k - 1; break; }
      }
    }
  }
  return pares;
}

/* Devolve as colunas de cada página: [{pag, x, respostas:{n:letra}}] */
export async function separaColunas(arquivo, { tolerancia = 8 } = {}) {
  const paginas = await pdfItens(arquivo);
  const saida = [];
  paginas.forEach((itens, pag) => {
    const pares = paresDaPagina(itens);
    const grupos = [];
    for (const p of pares.sort((a, b) => a.x - b.x)) {
      const g = grupos[grupos.length - 1];
      if (g && Math.abs(g.x - p.x) <= tolerancia) { g.itens.push(p); g.x = (g.x * (g.itens.length - 1) + p.x) / g.itens.length; }
      else grupos.push({ x: p.x, itens: [p] });
    }
    for (const g of grupos) {
      if (g.itens.length < 4) continue;   // 2014 quebra o cargo em blocos de 5 respostas
      const respostas = {};
      for (const p of g.itens) if (respostas[p.n] === undefined) respostas[p.n] = p.letra;
      saida.push({ pag, x: Math.round(g.x), respostas, total: Object.keys(respostas).length });
    }
  });
  return saida;
}
