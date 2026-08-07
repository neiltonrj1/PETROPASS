/* ============================================================
   Monta o index.html que vai para o GitHub Pages.

       npm run build

   Junta, nesta ordem:
     src/shell/cabeca.html   (com o CSS de src/shell/estilo.css dentro)
     src/shell/corpo.html
     src/js/*.js             (em ordem alfabética — por isso os prefixos
                              numéricos 00-, 20-, 40-…)
   e injeta o objeto DATA montado a partir de src/dados/.

   Tudo num arquivo só de propósito: é o que faz o app abrir offline
   e continuar sendo publicado com um `git push` sem etapa extra.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SRC = path.join(RAIZ, 'src');
const DADOS = path.join(SRC, 'dados');
const le = p => fs.readFileSync(p, 'utf8');
const leJson = p => JSON.parse(le(p));
const existe = p => fs.existsSync(p);

/* Versão só-texto da lição, usada pela busca do app. */
function semTags(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------------- dados ---------------- */
function montaDados() {
  const trilhas = leJson(path.join(DADOS, 'trilhas.json'));

  /* Cada volume é uma pasta em src/conteudo/ com um volume.json e um
     arquivo HTML por aba de cada módulo. A ordem dos módulos é a do
     volume.json — não a ordem alfabética dos arquivos.               */
  const conteudo = [];
  const dirConteudo = path.join(SRC, 'conteudo');
  for (const pasta of fs.readdirSync(dirConteudo).sort()) {
    const dir = path.join(dirConteudo, pasta);
    if (!fs.statSync(dir).isDirectory()) continue;
    const vol = leJson(path.join(dir, 'volume.json'));
    vol.mods = vol.mods.map(m => {
      const mod = { ...m };
      for (const aba of ['licao', 'questoes', 'gabarito']) {
        const arq = path.join(dir, `${m.id}.${aba}.html`);
        if (existe(arq)) mod[aba] = le(arq).trim();
      }
      mod.txt = semTags(mod.licao || '');
      return mod;
    });
    conteudo.push(vol);
  }

  const quizzes = {};
  const dirQuiz = path.join(DADOS, 'quizzes');
  if (existe(dirQuiz)) {
    for (const arq of fs.readdirSync(dirQuiz).filter(f => f.endsWith('.json')).sort()) {
      quizzes[arq.replace(/\.json$/, '')] = leJson(path.join(dirQuiz, arq));
    }
  }

  const provas = [];
  const dirProvas = path.join(DADOS, 'provas');
  if (existe(dirProvas)) {
    for (const arq of fs.readdirSync(dirProvas).filter(f => f.endsWith('.json')).sort()) {
      const p = leJson(path.join(dirProvas, arq));
      if (p.questoes && p.questoes.length) {
        provas.push({
          id: p.id, trilha: p.trilha, ano: p.ano, nome: p.nome,
          processo: p.processo, questoes: p.questoes,
        });
      }
    }
  }

  /* Cada questão de prova ganha o módulo a que pertence, para aparecer
     dentro da lição certa e alimentar o gráfico de incidência.        */
  const temas = leJson(path.join(DADOS, 'temas.json'));
  const modsDaTrilha = {};
  for (const t of trilhas) {
    modsDaTrilha[t.id] = new Set();
    for (const vid of t.vols) {
      const v = conteudo.find(v => v.id === vid);
      if (v) v.mods.forEach(m => modsDaTrilha[t.id].add(m.id));
    }
  }
  for (const p of provas) {
    for (const q of p.questoes) {
      q.mod = classifica(q, temas, modsDaTrilha[p.trilha]);
    }
  }

  /* Incidência real por módulo, contada nas provas daquela trilha. */
  for (const t of trilhas) {
    const conta = new Map();
    let total = 0;
    for (const p of provas.filter(p => p.trilha === t.id)) {
      for (const q of p.questoes) {
        if (!q.mod) continue;
        conta.set(q.mod, (conta.get(q.mod) || 0) + 1);
        total++;
      }
    }
    const titulo = {};
    for (const v of conteudo) for (const m of v.mods) titulo[m.id] = m.t;
    t.estats = [...conta.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([mid, n]) => [encurta(titulo[mid] || mid), +(n / total * 100).toFixed(1), mid]);
    t.baseEstats = total;
  }

  const versao = leJson(path.join(RAIZ, 'package.json')).version;
  return { versao, trilhas, conteudo, quizzes, provas };
}

/* Acha o módulo cujas palavras-chave mais aparecem na questão. */
function classifica(q, temas, permitidos) {
  const texto = (q.q + ' ' + Object.values(q.alts || {}).join(' ')).toLowerCase();
  let melhor = null, melhorNota = 0, empate = false;
  for (const [mid, palavras] of Object.entries(temas)) {
    if (mid.startsWith('_') || !permitidos || !permitidos.has(mid)) continue;
    let nota = 0;
    for (const p of palavras) if (texto.includes(p)) nota += p.length;   // termo longo pesa mais
    if (nota > melhorNota) { melhorNota = nota; melhor = mid; empate = false; }
    else if (nota === melhorNota && nota > 0) empate = true;
  }
  return melhorNota >= 6 && !empate ? melhor : null;
}

/* Título curto para o gráfico de incidência. */
function encurta(t) {
  const corte = t.split(/[:(]/)[0].trim();
  return corte.length > 42 ? corte.slice(0, 40).trim() + '…' : corte;
}

/* ---------------- conferências antes de publicar ---------------- */
function confere(DATA) {
  const erros = [];
  const idsVol = new Set(DATA.conteudo.map(v => v.id));
  const idsMod = new Set();

  for (const v of DATA.conteudo) {
    if (!v.mods || !v.mods.length) erros.push(`volume ${v.id} está sem módulos`);
    for (const m of (v.mods || [])) {
      if (idsMod.has(m.id)) erros.push(`módulo repetido: ${m.id}`);
      idsMod.add(m.id);
      for (const campo of ['n', 't', 'licao']) {
        if (!m[campo]) erros.push(`módulo ${m.id} está sem "${campo}"`);
      }
    }
  }
  for (const t of DATA.trilhas) {
    for (const vid of t.vols) if (!idsVol.has(vid)) erros.push(`trilha ${t.id} aponta para o volume ${vid}, que não existe`);
    for (const s of (t.semanas || [])) {
      if (s[4] && !idsMod.has(s[4])) erros.push(`semana ${s[0]} da trilha ${t.id} aponta para o módulo ${s[4]}, que não existe`);
    }
  }
  for (const p of DATA.provas) {
    if (!DATA.trilhas.some(t => t.id === p.trilha)) erros.push(`prova ${p.id} é da trilha ${p.trilha}, que não existe`);
    for (const q of p.questoes) {
      if (!q.correta || !q.alts || !q.alts[q.correta]) erros.push(`questão ${p.id}/${q.n} sem alternativa correta`);
    }
  }
  return erros;
}

/* ---------------- montagem ---------------- */
const DATA = montaDados();
const erros = confere(DATA);
if (erros.length) {
  console.error('\n✗ o build parou porque os dados estão inconsistentes:\n');
  erros.slice(0, 30).forEach(e => console.error('   · ' + e));
  if (erros.length > 30) console.error(`   … e mais ${erros.length - 30}`);
  process.exit(1);
}

const css = le(path.join(SRC, 'shell', 'estilo.css'));
const cabeca = le(path.join(SRC, 'shell', 'cabeca.html')).replace('/*{{ESTILO}}*/', () => css);
const corpo = le(path.join(SRC, 'shell', 'corpo.html'));

const arquivosJs = fs.readdirSync(path.join(SRC, 'js')).filter(f => f.endsWith('.js')).sort();
const blocos = arquivosJs.map(f => {
  const codigo = le(path.join(SRC, 'js', f));
  /* Um `</script>` dentro de uma string JS fecharia a tag cedo demais
     e quebraria a página inteira — a barra precisa ser escapada.      */
  const seguro = codigo.replace(/<\/script/gi, '<\\/script');
  return `<script>\n/* ===== ${f} ===== */\n${seguro}\n</script>`;
});

/* O DATA entra antes do código do app, numa tag só dele. */
const tagDados = `<script>\nconst DATA = ${JSON.stringify(DATA)};\n</script>`;

const html = [
  cabeca,
  '<body class="deslogado">',
  corpo,
  tagDados,
  ...blocos,
  '</body>',
  '</html>',
  '',
].join('\n');

fs.writeFileSync(path.join(RAIZ, 'index.html'), html, 'utf8');

/* O service worker precisa de um nome de cache novo a cada versão,
   senão o aparelho continua servindo a versão velha do cache.        */
const swPath = path.join(RAIZ, 'sw.js');
if (existe(swPath)) {
  const sw = le(swPath).replace(/const CACHE\s*=\s*'[^']*'/, `const CACHE = 'petropass-v${DATA.versao}'`);
  fs.writeFileSync(swPath, sw, 'utf8');
}

const mods = DATA.conteudo.reduce((a, v) => a + v.mods.length, 0);
const comentadas = Object.values(DATA.quizzes).reduce((a, q) => a + q.length, 0);
const deProva = DATA.provas.reduce((a, p) => a + p.questoes.length, 0);
console.log(`✓ index.html gerado — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  ${DATA.trilhas.length} trilhas · ${DATA.conteudo.length} volumes · ${mods} módulos`);
console.log(`  ${comentadas} questões comentadas · ${deProva} questões de prova · ${DATA.provas.length} provas`);
