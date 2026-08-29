/* ============================================================
   Lê os PDFs do catálogo e grava um JSON por prova em
   src/dados/provas/. Rode com:  npm run provas

   Regra importante: questão que só faz sentido olhando uma figura
   do caderno (circuito, gráfico, esquema) fica marcada com
   `precisaFigura` e NÃO entra no treino — sem o desenho ela
   ensinaria errado. O número dela continua registrado para você
   saber o que ficou de fora.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { pdfTexto } from './lib/pdf.mjs';
import { recortaQuestoes } from './lib/prova.mjs';
import { leGabarito } from './lib/gabarito.mjs';
import { PROVAS, PASTA_PDF } from './provas.config.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'src', 'dados', 'provas');
fs.mkdirSync(DESTINO, { recursive: true });

/* Marcas de que a questão depende de algo desenhado no caderno. */
const PEDE_FIGURA = /\b(figura|figuras|esquema|gráfico|gráficos|desenho|circuito abaixo|diagrama abaixo|tabela abaixo|ilustração|croqui|conforme apresentado abaixo|apresentada a seguir|abaixo representad|a seguir representad)\b/i;

/* Questão cheia de símbolos soltos costuma ser fórmula que virou lixo. */
function pareceQuebrada(q) {
  const t = q.enun;
  if (t.length < 60) return true;
  const alts = Object.values(q.alts);
  if (alts.some(a => a.length < 1)) return true;
  const estranhos = (t.match(/[^\wÀ-ÿ\s.,;:!?()%°ºª'"“”‘’\/\-–—+=<>×·§$&@#*\[\]{}]/g) || []).length;
  return estranhos / t.length > 0.06;
}

const resumo = [];

for (const p of PROVAS) {
  const cad = path.join(PASTA_PDF, p.pdf);
  const gabPdf = path.join(PASTA_PDF, p.gab);
  if (!fs.existsSync(cad)) { console.log(`· ${p.id}: caderno não encontrado (${p.pdf})`); continue; }
  if (!fs.existsSync(gabPdf)) { console.log(`· ${p.id}: gabarito não encontrado (${p.gab})`); continue; }

  const gab = await leGabarito(gabPdf, p);
  if (!gab) { console.log(`· ${p.id}: não consegui ler o gabarito`); continue; }

  const brutas = recortaQuestoes(await pdfTexto(cad), { ate: p.ate, de: p.ini });
  const questoes = [];
  const descartadas = { semGabarito: [], comFigura: [], quebradas: [] };

  for (const q of brutas) {
    if (q.n < p.ini || q.n > p.ate) continue;
    const correta = gab[q.n];
    if (!correta) { descartadas.semGabarito.push(q.n); continue; }
    if (pareceQuebrada(q)) { descartadas.quebradas.push(q.n); continue; }
    /* Questão que cita um desenho ENTRA, e é marcada. Antes ela era jogada
       fora porque sem a figura ensinaria errado — mas hoje o
       ferramentas/extrair-figuras.mjs recorta a figura do caderno, e o app
       sabe travar a questão que ficou mesmo sem desenho (`pede-desenho` no
       build). Descartar todas custava caro: era metade da prova de
       Elétrica e um terço da de Mecânica.                               */
    const precisaFigura = PEDE_FIGURA.test(q.enun);
    if (precisaFigura) descartadas.comFigura.push(q.n);
    questoes.push({
      n: q.n,
      origem: `Cesgranrio ${p.ano}, Q${q.n}`,
      q: q.enun,
      alts: q.alts,
      correta,
      ...(precisaFigura ? { pedeFigura: true } : {}),
    });
  }

  const saida = {
    id: p.id, trilha: p.trilha, ano: p.ano, nome: p.nome, processo: p.processo,
    caderno: p.pdf, folhaGabarito: p.gab,
    total: questoes.length,
    questoes,
    deFora: descartadas,
    /* prova de outro processo seletivo (não o que rege o edital atual):
       entra no treino, mas fica fora da conta de incidência */
    ...(p.extra ? { extra: true } : {}),
  };
  fs.writeFileSync(path.join(DESTINO, `${p.id}.json`), JSON.stringify(saida, null, 1), 'utf8');

  resumo.push({ id: p.id, trilha: p.trilha, ok: questoes.length, ...descartadas });
  console.log(`✓ ${p.id.padEnd(11)} ${String(questoes.length).padStart(2)} questões aproveitadas` +
    ` · fora: ${descartadas.comFigura.length} com figura, ${descartadas.semGabarito.length} sem gabarito, ${descartadas.quebradas.length} ilegíveis`);
}

const porTrilha = {};
for (const r of resumo) porTrilha[r.trilha] = (porTrilha[r.trilha] || 0) + r.ok;
console.log('\ntotal por trilha:', porTrilha);
console.log('total geral:', resumo.reduce((a, r) => a + r.ok, 0), 'questões reais de prova');
