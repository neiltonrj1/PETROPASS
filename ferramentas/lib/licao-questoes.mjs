/* ============================================================
   Converte as duas abas antigas de cada módulo — "questoes"
   (enunciados em HTML) e "gabarito" (as respostas comentadas) —
   numa lista de questões de verdade, que o app sabe corrigir.

   O material foi escrito em três marcações diferentes ao longo do
   tempo, e todas precisam continuar valendo:

     (1) <p><strong>Q11</strong> <em>(Cesgranrio 2012, Q23)</em> — enunciado</p>
         <p>(A) …<br>(B) …</p>                  ← alternativas em outro parágrafo

     (2) <p><strong>Q1 (Cesgranrio 2018, Q24).</strong> enunciado<br>
         (A) …<br>(B) …</p>                     ← tudo junto, origem dentro do strong

     (3) <p><strong>Q1</strong> <em>(Cesgranrio 2018, Q2)</em> — enunciado<br>
         (A) …<br>(B) …</p>                     ← origem em <em>, alternativas juntas

   Por isso o recorte é feito sobre o TEXTO, não sobre as tags: junta-se
   tudo o que pertence à questão e depois se separa enunciado de
   alternativas pelo marcador "(A)".

   Gabarito, em formato único:
     <p><strong>Q11 — letra B.</strong> comentário…</p>

   Saída: [{n, origem, q, alts, correta, explica}]
   ============================================================ */

const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const tiraTags = s => s
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, ' ').trim();

function paragrafos(html) {
  const out = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/* Um parágrafo abre questão nova quando começa com <strong>Q<número>. */
const abreQuestao = p => /^\s*<strong>\s*Q\s*\d+\b/i.test(p);

function leEnunciados(html) {
  const ps = paragrafos(html);
  const blocos = [];
  for (const p of ps) {
    if (abreQuestao(p)) blocos.push([p]);
    else if (blocos.length) blocos[blocos.length - 1].push(p);
  }

  const questoes = [];
  for (const bloco of blocos) {
    const texto = tiraTags(bloco.join('\n'));

    /* "Q11 (Cesgranrio 2012, Q23). —"  ou  "Q11 — " */
    const cab = texto.match(/^Q\s*(\d+)\s*(?:\(([^)]*)\))?\s*[.:]?\s*(?:—|–|-)?\s*/i);
    if (!cab) continue;
    const n = +cab[1];
    let origem = (cab[2] || '').trim();
    let corpo = texto.slice(cab[0].length);

    /* formato (1)/(3): a origem pode ter vindo num <em> logo depois */
    if (!origem) {
      const em = corpo.match(/^\(([^)]*)\)\s*(?:—|–|-)?\s*/);
      if (em) { origem = em[1].trim(); corpo = corpo.slice(em[0].length); }
    }

    const iA = corpo.search(/(^|\n)\s*\(A\)/);
    if (iA < 0) continue;
    const q = corpo.slice(0, iA).replace(/\s+/g, ' ').trim();
    const bloco2 = corpo.slice(iA);

    const alts = {};
    for (let i = 0; i < LETRAS.length; i++) {
      const L = LETRAS[i], prox = LETRAS[i + 1];
      const re = prox
        ? new RegExp(`\\(${L}\\)\\s*([\\s\\S]*?)(?=\\(${prox}\\))`)
        : new RegExp(`\\(${L}\\)\\s*([\\s\\S]*)$`);
      const m = bloco2.match(re);
      if (m) alts[L] = m[1].replace(/\s+/g, ' ').trim();
    }
    questoes.push({ n, origem, q, alts });
  }
  return questoes;
}

function leGabaritos(html) {
  const mapa = {};
  for (const p of paragrafos(html)) {
    const m = p.match(/^\s*<strong>\s*Q\s*(\d+)\s*(?:—|–|-)\s*letra\s*([A-E])[^<]*<\/strong>\s*([\s\S]*)$/i);
    if (!m) continue;
    mapa[+m[1]] = { correta: m[2].toUpperCase(), explica: m[3].trim() };
  }
  return mapa;
}

export function montaQuestoes(htmlQuestoes, htmlGabarito) {
  if (!htmlQuestoes || !htmlGabarito) return { qs: [], perdidas: [] };
  const enun = leEnunciados(htmlQuestoes);
  const gab = leGabaritos(htmlGabarito);

  const qs = [], perdidas = [];
  for (const e of enun) {
    const g = gab[e.n];
    const completa = LETRAS.every(L => (e.alts[L] || '').length > 0);
    if (!g || !completa || e.q.length < 15) { perdidas.push(e.n); continue; }
    qs.push({ n: e.n, origem: e.origem, q: e.q, alts: e.alts, correta: g.correta, explica: g.explica });
  }
  return { qs, perdidas };
}
