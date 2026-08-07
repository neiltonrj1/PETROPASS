/* ============================================================
   Leitura de PDF — texto simples e texto com coordenadas.
   Usa pdfjs-dist (build legacy, que roda no Node sem DOM).
   ============================================================ */
import fs from 'node:fs';

async function abre(arquivo) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(arquivo));
  return pdfjs.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
}

/* Texto por linhas, agrupando pelo Y de cada fragmento. */
export async function pdfTexto(arquivo) {
  const doc = await abre(arquivo);
  const paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const linhas = [];
    let atual = [], ultimoY = null;
    for (const it of tc.items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5]);
      if (ultimoY !== null && Math.abs(y - ultimoY) > 3) { linhas.push(atual.join('')); atual = []; }
      atual.push(it.str);
      if (it.hasEOL) { linhas.push(atual.join('')); atual = []; }
      ultimoY = y;
    }
    if (atual.length) linhas.push(atual.join(''));
    paginas.push(linhas);
  }
  return paginas;
}

/* Fragmentos com coordenadas — necessário para gabaritos em tabela de várias colunas. */
export async function pdfItens(arquivo) {
  const doc = await abre(arquivo);
  const paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const itens = [];
    for (const it of tc.items) {
      const s = (it.str || '').trim();
      if (!s) continue;
      itens.push({ s, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]), w: Math.round(it.width || 0) });
    }
    paginas.push(itens);
  }
  return paginas;
}

/* Limpa marca d'água, rodapé do site e cabeçalho repetido de cada página. */
export function limpaPagina(linhas) {
  const lixo = /^(pcimarkpci|www\.pciconcursos|CONTINUA|RASCUNHO)/i;
  return linhas
    .map(l => l.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(l => l && !lixo.test(l));
}
