/* ============================================================
   Leitura de gabaritos da Cesgranrio.

   A banca usa dois desenhos de folha:

   (1) TABELA LARGA — uma coluna por prova. O topo traz "PROVA 1",
       "PROVA 2", ... lado a lado e cada linha da tabela repete o
       mesmo número de questão em todas as colunas:
           21 - A   21 - D   21 - B   21 - B ...
       Aqui a posição do par dentro da linha É o índice da coluna.

   (2) BLOCO POR PROVA — o título "PROVA 23 – ENGENHEIRO(A) ..."
       e, logo abaixo, as 50 respostas em 5 colunas de 10:
           21 - B   31 - A   41 - E   51 - C   61 - D
       Aqui os números da linha são diferentes entre si.

   O leitor identifica o desenho sozinho e devolve {questão: letra}.
   ============================================================ */
import { pdfItens } from './pdf.mjs';
import { separaColunas } from './colunas.mjs';

const RESP = /^(\d{1,3})\s*[-–—]\s*([A-E])$/;
const TITULO = /PROVA\s*0*(\d{1,2})\b/i;

/* Agrupa os fragmentos de uma página em linhas.
   Arredondar o Y quebraria linhas que ficam em cima da fronteira, então
   ordenamos por Y e só abrimos linha nova quando o salto passa de 3 px. */
function linhasDaPagina(itens) {
  const ord = [...itens].sort((a, b) => b.y - a.y);
  const linhas = [];
  let atual = null;
  for (const it of ord) {
    if (!atual || Math.abs(atual.y - it.y) > 3) { atual = { y: it.y, itens: [] }; linhas.push(atual); }
    atual.itens.push(it);
  }
  for (const L of linhas) L.itens.sort((a, b) => a.x - b.x);
  return linhas;                                // já de cima para baixo
}

/* Reconstrói os pares "número - letra" de uma linha, na ordem em que aparecem. */
function paresDaLinha(itens) {
  const pares = [];
  for (let i = 0; i < itens.length; i++) {
    for (let k = 1; k <= 3 && i + k <= itens.length; k++) {
      const trecho = itens.slice(i, i + k);
      const m = trecho.map(t => t.s).join(' ').replace(/\s+/g, ' ').trim().match(RESP);
      if (m) { pares.push({ n: +m[1], letra: m[2], x: trecho[0].x }); i += k - 1; break; }
    }
  }
  return pares;
}

/* ---------- desenho (1): tabela larga ---------- */
function porTabelaLarga(linhas, numeroDaProva, itens) {
  // acha os títulos das colunas: "PROVA 7" numa peça só...
  const titulos = [];
  for (const L of linhas) {
    for (let i = 0; i < L.itens.length; i++) {
      const txt = L.itens.slice(i, i + 2).map(t => t.s).join(' ').replace(/\s+/g, ' ').trim();
      const m = txt.match(/^PROVA\s*0*(\d{1,2})$/i);
      if (m) titulos.push({ n: +m[1], x: L.itens[i].x, y: L.y });
    }
  }
  // ...ou com a palavra numa linha e o número na linha de baixo.
  // Cuidado: "14" costuma sair picado em "1" e "4", então juntamos os
  // algarismos que estiverem na mesma linha antes de ler o número.
  if (titulos.length < 3) {
    const marcas = itens.filter(i => i.s.toUpperCase() === 'PROVA');
    // metade da distância entre duas colunas: o número não pode vir de outra
    const xs = marcas.map(m => m.x).sort((a, b) => a - b);
    let meio = 14;
    for (let i = 1; i < xs.length; i++) meio = Math.min(meio, (xs[i] - xs[i - 1]) / 2);
    for (const it of marcas) {
      const perto = itens
        .filter(o => /^\d{1,2}$/.test(o.s) && o.y < it.y && o.y > it.y - 34 && Math.abs(o.x - it.x) < meio)
        .sort((a, b) => b.y - a.y || a.x - b.x);
      if (!perto.length) continue;
      const yLinha = perto[0].y;
      const n = +perto.filter(o => Math.abs(o.y - yLinha) <= 2).map(o => o.s).join('');
      if (n > 0) titulos.push({ n, x: it.x, y: it.y });
    }
  }
  if (titulos.length < 3) return null;
  titulos.sort((a, b) => a.x - b.x);
  const alvo = titulos.findIndex(t => t.n === numeroDaProva);
  if (alvo < 0) return null;

  /* Nada de casar por posição dentro da linha: quando duas linhas da
     tabela ficam quase coladas elas se fundem e a contagem desanda.
     Como cada coluna tem um X próprio, basta recolher as respostas que
     caem na faixa X da coluna procurada.                              */
  let passo = Infinity;
  for (let i = 1; i < titulos.length; i++) passo = Math.min(passo, titulos[i].x - titulos[i - 1].x);
  if (!isFinite(passo) || passo <= 0) return null;
  const xAlvo = titulos[alvo].x;

  const mapa = {};
  for (const L of linhas) {
    for (const q of paresDaLinha(L.itens)) {
      if (Math.abs(q.x - xAlvo) > passo * 0.45) continue;
      if (mapa[q.n] === undefined) mapa[q.n] = q.letra;
    }
  }
  return Object.keys(mapa).length >= 10 ? mapa : null;
}

/* ---------- desenho (2): um bloco por prova ---------- */
function porBloco(linhas, numeroDaProva) {
  const titulos = linhas
    .map(L => ({ y: L.y, txt: L.itens.map(t => t.s).join(' ').replace(/\s+/g, ' ').trim() }))
    .filter(L => TITULO.test(L.txt))
    .map(L => ({ y: L.y, n: +L.txt.match(TITULO)[1] }));
  if (!titulos.length) return null;

  const alvo = titulos.find(t => t.n === numeroDaProva);
  if (!alvo) return null;
  const abaixo = titulos.filter(t => t.y < alvo.y).map(t => t.y);
  const limite = abaixo.length ? Math.max(...abaixo) : -Infinity;

  const mapa = {};
  for (const L of linhas) {
    if (L.y >= alvo.y || L.y <= limite) continue;
    for (const p of paresDaLinha(L.itens)) if (mapa[p.n] === undefined) mapa[p.n] = p.letra;
  }
  return Object.keys(mapa).length >= 10 ? mapa : null;
}

/* ---------- desenho (3): coluna indicada à mão ----------
   Gabaritos de 2012 e 2014 põem o nome do cargo na vertical, picado em
   dezenas de fragmentos — não dá para casar por texto. Nesses casos o
   catálogo informa o índice da coluna (`coluna`), conferido depois pelo
   cruzamento com as questões de gabarito já conhecido.               */
function porIndiceDeColuna(linhas, indice, faixa) {
  const mapa = {};
  for (const L of linhas) {
    const p = paresDaLinha(L.itens);
    if (p.length < 3) continue;
    if (!p.every(q => q.n === p[0].n)) continue;              // linha da tabela
    if (faixa && (p[0].n < faixa[0] || p[0].n > faixa[1])) continue;
    if (indice >= p.length) continue;
    if (mapa[p[0].n] === undefined) mapa[p[0].n] = p[indice].letra;
  }
  return Object.keys(mapa).length >= 10 ? mapa : null;
}

/* Lê o gabarito de UMA prova.
   `prova.num`     — número que a banca deu à prova, quando o PDF traz "PROVA n"
   `prova.pagina`  + `prova.faixaX` — para as folhas de 2012 e 2014, em que o
     nome do cargo é impresso na vertical e sai do PDF picado: aí se indica a
     página (1 = a primeira) e a faixa horizontal ocupada por aquele cargo.
     Descubra os valores com `node ferramentas/mapear-gabarito.mjs <pdf> <ano>`. */
export async function leGabarito(arquivo, prova) {
  const num = typeof prova === 'number' ? prova : prova.num;
  const coluna = typeof prova === 'object' ? prova.coluna : undefined;

  if (typeof prova === 'object' && prova.faixaX) {
    const cols = await separaColunas(arquivo);
    const [x0, x1] = prova.faixaX;
    const mapa = {};
    for (const c of cols) {
      if (prova.pagina && c.pag !== prova.pagina - 1) continue;
      if (c.x < x0 || c.x > x1) continue;
      for (const [n, L] of Object.entries(c.respostas)) if (mapa[n] === undefined) mapa[n] = L;
    }
    return Object.keys(mapa).length ? mapa : null;
  }

  const paginas = await pdfItens(arquivo);
  const juntos = {};
  for (const itens of paginas) {
    const linhas = linhasDaPagina(itens);
    let r = null;
    if (coluna !== undefined) r = porIndiceDeColuna(linhas, coluna, [21, 70]);
    else r = porBloco(linhas, num) || porTabelaLarga(linhas, num, itens);
    if (r) {
      Object.assign(juntos, r);
      // a tabela larga pode continuar na página seguinte (21-40 numa, 41-70 noutra)
      if (Object.keys(juntos).length >= 50) return juntos;
    }
  }
  return Object.keys(juntos).length ? juntos : null;
}

/* Lê as questões de conhecimentos básicos (1 a 20), que são iguais para todo mundo. */
export async function leBasicas(arquivo) {
  const paginas = await pdfItens(arquivo);
  const mapa = {};
  for (const itens of paginas) {
    for (const L of linhasDaPagina(itens)) {
      const p = paresDaLinha(L.itens);
      if (p.length < 5) continue;
      const seq = p.every((q, i) => i === 0 || q.n === p[i - 1].n + 1);   // 1-2-3-4-5...
      if (!seq) continue;
      for (const q of p) if (q.n <= 20 && mapa[q.n] === undefined) mapa[q.n] = q.letra;
    }
    if (Object.keys(mapa).length >= 20) break;
  }
  return mapa;
}
