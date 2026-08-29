/* ============================================================
   Recorta um caderno de prova da Cesgranrio em questões.

   Formato típico:
       21
       <enunciado, várias linhas>
       (A) ...
       (B) ...
       (E) ...
       22
       ...

   Duas armadilhas: o número da página também aparece sozinho no
   cabeçalho, e o texto extraído nem sempre respeita a ordem das
   questões (páginas com figura costumam sair fora de lugar).

   Por isso não varremos "esperando o próximo número": levantamos
   todos os candidatos a marcador e ficamos com a maior sequência
   crescente entre eles — o resto é cabeçalho ou ruído.
   ============================================================ */
import { limpaPagina } from './pdf.mjs';

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

/* Junta as páginas tirando cabeçalho e rodapé repetidos. */
function corpoDaProva(paginas) {
  const limpas = paginas.map(limpaPagina);
  const conta = new Map();
  for (const p of limpas) {
    for (const l of new Set([...p.slice(0, 5), ...p.slice(-3)])) {
      if (l.length > 3) conta.set(l, (conta.get(l) || 0) + 1);
    }
  }
  const repetida = l => (conta.get(l) || 0) >= Math.max(3, limpas.length * 0.4);
  const nPaginas = paginas.length;

  const out = [];
  for (const linhas of limpas) {
    const n = linhas.length;
    for (let i = 0; i < n; i++) {
      const l = linhas[i];
      if (repetida(l)) continue;
      // número solto no topo ou no pé da página = numeração da página
      const naBorda = i < 3 || i >= n - 3;
      if (naBorda && /^\d{1,3}$/.test(l) && +l <= nPaginas) continue;
      out.push(l);
    }
  }
  return out;
}

/* Desfaz a hifenização de fim de linha e junta o texto num parágrafo. */
function junta(linhas) {
  let t = '';
  for (const l of linhas) {
    if (/[a-zà-ÿ]-$/.test(t) && /^[a-zà-ÿ]/.test(l)) t = t.slice(0, -1) + l;
    else t += (t ? ' ' : '') + l;
  }
  return t.replace(/\s+/g, ' ').replace(/ ([,.;:!?)])/g, '$1').replace(/\( /g, '(').trim();
}

/* A última alternativa de uma questão não tem um próximo marcador "(X)" que
   feche o buffer — então, quando duas questões compartilham um contexto (uma
   figura, uma tabela) declarado como "Considere ... para responder às
   questões de nos N e M" entre elas, esse texto de ligação (e tudo que vem
   depois, que já é o enunciado da PRÓXIMA questão) era engolido inteiro pela
   última alternativa. É um padrão fixo da Cesgranrio — cortar nele. */
function cortaContextoCompartilhado(texto) {
  const gatilho = texto.search(/\b(considere|utilize)\b[^.]*?para responder\b/i);
  return gatilho < 0 ? texto : texto.slice(0, gatilho).trim();
}

/* Maior subsequência estritamente crescente (pelo número da questão). */
function maiorSequencia(cands) {
  if (!cands.length) return [];
  const melhor = new Array(cands.length).fill(1);
  const de = new Array(cands.length).fill(-1);
  let fim = 0;
  for (let i = 1; i < cands.length; i++) {
    for (let j = 0; j < i; j++) {
      if (cands[j].n < cands[i].n && melhor[j] + 1 > melhor[i]) { melhor[i] = melhor[j] + 1; de[i] = j; }
    }
    if (melhor[i] > melhor[fim]) fim = i;
  }
  const saida = [];
  for (let i = fim; i >= 0; i = de[i]) { saida.push(cands[i]); if (de[i] < 0) break; }
  return saida.reverse();
}

export function recortaQuestoes(paginas, { ate = 70, de = 1 } = {}) {
  const linhas = corpoDaProva(paginas);

  /* candidatos a marcador: linha com só um número no intervalo da prova,
     seguida de uma linha que começa com letra maiúscula ou acentuada     */
  const cands = [];
  for (let i = 0; i < linhas.length - 1; i++) {
    const m = linhas[i].match(/^(\d{1,3})$/);
    if (!m) continue;
    const n = +m[1];
    if (n < de || n > ate) continue;
    if (!/^[A-ZÀ-ÿ("]/.test(linhas[i + 1] || '')) continue;
    cands.push({ n, i });
  }

  const marcos = maiorSequencia(cands);
  const questoes = [];
  for (let k = 0; k < marcos.length; k++) {
    const ini = marcos[k].i + 1;
    const fim = k + 1 < marcos.length ? marcos[k + 1].i : linhas.length;
    const q = { n: marcos[k].n, enun: '', alts: {} };
    let buffer = [], alvo = null;
    const guarda = () => {
      if (alvo) q.alts[alvo] = cortaContextoCompartilhado(junta(buffer));
      else q.enun = junta(buffer);
      buffer = [];
    };
    for (let i = ini; i < fim; i++) {
      const linha = linhas[i];
      /* Respostas curtas (números, "sim/não", fórmulas de uma letra) costumam
         sair 2 a 5 por linha física no PDF — "(A) 0,5 (B) 1,0 (C) 1,5 ...".
         Uma âncora só no início da linha lia a primeira e engolia o resto
         como texto de A, derrubando a questão inteira no filtro final.
         Por isso varremos TODOS os marcadores (A)-(E) da linha, não só o
         primeiro.                                                        */
      const marcadores = [...linha.matchAll(/\(([A-E])\)/g)];
      if (!marcadores.length) { buffer.push(linha); continue; }
      const antes = linha.slice(0, marcadores[0].index).trim();
      if (antes) buffer.push(antes);
      for (let j = 0; j < marcadores.length; j++) {
        guarda();
        alvo = marcadores[j][1];
        const iniTexto = marcadores[j].index + marcadores[j][0].length;
        const fimTexto = j + 1 < marcadores.length ? marcadores[j + 1].index : linha.length;
        const texto = linha.slice(iniTexto, fimTexto).trim();
        buffer = texto ? [texto] : [];
      }
    }
    guarda();
    if (q.enun.length > 10 && LETRAS.every(L => (q.alts[L] || '').length > 0)) questoes.push(q);
  }
  return questoes;
}
