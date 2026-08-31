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
import { montaQuestoes } from './lib/licao-questoes.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const SRC = path.join(RAIZ, 'src');
const DADOS = path.join(SRC, 'dados');
const avisos = [];
/* O BOM que alguns editores (e o PowerShell) deixam no começo do arquivo é
   caractere inválido dentro de <style> e <script>: o parser de CSS descarta
   a primeira regra por causa dele. Some com ele em toda leitura.          */
const le = p => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
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
      /* As questões da lição viram questões que o app corrige, com
         alternativa clicável e explicação. O HTML original fica de
         reserva: se algum módulo não converter, ele ainda é exibido. */
      const { qs, perdidas } = montaQuestoes(mod.questoes, mod.gabarito);
      if (qs.length) {
        mod.qs = qs;
        delete mod.questoes; delete mod.gabarito;     // já estão dentro de qs
        if (perdidas.length) avisos.push(`${m.id}: ${perdidas.length} questão(ões) não converteram (${perdidas.join(',')})`);
      } else if (mod.questoes) {
        avisos.push(`${m.id}: nenhuma questão converteu — o HTML antigo será exibido como estava`);
      }
      mod.txt = semTags(mod.licao || '');
      return mod;
    });
    conteudo.push(vol);
  }

  /* Questões de lição que citam figura mas nasceram sem uma: ao contrário
     das questões de prova (extraídas de PDF, onde às vezes o TEXTO também
     sai corrompido), a questão de lição é escrita à mão e o texto já está
     certo — falta só o desenho. Por isso o override aqui é mais simples,
     só `fig`/`legenda`, chaveado por {mod, n}, sem risco de apagar
     alternativa (não mexe em `alts`).                                    */
  const arqFigLicao = path.join(DADOS, 'questoes-figura-licao.json');
  if (existe(arqFigLicao)) {
    const figs = leJson(arqFigLicao).filter(x => x && x.mod && x.n && x.fig);
    let postas = 0, semLugar = 0;
    for (const f of figs) {
      const v = conteudo.find(v => v.mods.some(m => m.id === f.mod));
      const m = v && v.mods.find(m => m.id === f.mod);
      const q = m && m.qs && m.qs.find(q => q.n === f.n);
      if (!q) { semLugar++; continue; }
      q.fig = limpaSvg(f.fig);
      q.figLegenda = limpaEnunciado(f.legenda || '');
      postas++;
    }
    if (postas || semLugar) avisos.push(`${postas} questões de lição receberam a figura` +
      (semLugar ? ` · ${semLugar} sem questão correspondente` : ''));
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
          ...(p.extra ? { extra: true } : {}),
        });
      }
    }
  }

  /* Boa parte das questões que estão nas lições foi tirada das mesmas
     provas que o extrator leu. Quando ano e número batem, a explicação
     escrita para a lição passa a valer também na prova — assim o aluno
     não fica com um "gabarito: letra E" seco no simulado.

     A trilha TEM de entrar na chave. "Cesgranrio 2018, Q22" existe na
     prova de Inspeção, na de Elétrica e na de Produção, e são questões
     completamente diferentes: sem a trilha, a explicação de metalurgia
     ia parar numa questão de motor CC. Como a alternativa correta é
     conferida no gabarito oficial de cada prova, o aluno via "gabarito:
     letra C" e, logo abaixo, um texto defendendo a letra E de outro
     assunto — e as dicas progressivas, que saem desse mesmo texto,
     também apontavam para a questão errada.                          */
  const porOrigem = new Map();
  const chaveOrigem = s => {
    const m = String(s || '').match(/(\d{4})[^0-9]*Q\s*(\d{1,3})/i);
    return m ? m[1] + '/' + m[2] : null;
  };
  const trilhasDoVol = {};
  for (const t of trilhas) for (const vid of t.vols) (trilhasDoVol[vid] = trilhasDoVol[vid] || []).push(t.id);
  /* Questão marcada "adaptada" foi modificada de propósito na lição —
     número trocado, alternativa reescrita, ordem invertida. A explicação
     dela vale para a versão adaptada, NÃO para a questão original da
     prova, que muitas vezes tem outro gabarito. Herdar essa explicação
     punha um texto defendendo a letra A embaixo de um gabarito B.     */
  const ADAPTADA = /adaptad/i;
  let bloqueadas = 0;
  for (const v of conteudo) for (const m of v.mods) for (const q of (m.qs || [])) {
    const k = chaveOrigem(q.origem);
    if (!k || !q.explica) continue;
    if (ADAPTADA.test(q.origem)) { bloqueadas++; continue; }
    for (const tid of (trilhasDoVol[v.id] || [])) {
      const kt = tid + '|' + k;
      if (!porOrigem.has(kt)) porOrigem.set(kt, { explica: q.explica, mod: m.id });
    }
  }
  let herdadas = 0;
  for (const p of provas) for (const q of p.questoes) {
    const k = chaveOrigem(q.origem);
    const achou = k && porOrigem.get(p.trilha + '|' + k);
    if (achou) { q.explica = achou.explica; q.modExplica = achou.mod; herdadas++; }
  }
  if (herdadas) avisos.push(`${herdadas} questões de prova receberam a explicação escrita na lição` +
    (bloqueadas ? ` (${bloqueadas} versões adaptadas não foram herdadas, de propósito)` : ''));

  /* Cada questão de prova ganha o módulo a que pertence, para aparecer
     dentro da lição certa e alimentar o gráfico de incidência.        */
  const temas = leJson(path.join(DADOS, 'temas.json'));

  /* As questões comentadas são as mais ricas do acervo: têm explicação
     da certa, motivo de CADA distrator (`erradas`) e pontos a memorizar.
     Ganham aqui duas coisas que faltavam para rodarem no mesmo motor das
     outras — um número estável (`n`, igual ao índice que S.quiz já usava,
     por isso ninguém perde resposta) e o módulo a que pertencem, sem o
     qual elas não alimentavam a revisão espaçada nem apareciam na conta
     de cobertura.                                                      */
  for (const [vid, qs] of Object.entries(quizzes)) {
    const vol = conteudo.find(v => v.id === vid);
    const permitidos = vol ? new Set(vol.mods.map(m => m.id)) : null;
    qs.forEach((q, i) => {
      q.n = i;
      /* `mod` escrito à mão no JSON manda; a classificação por palavra-chave
         só entra onde ninguém decidiu.                                   */
      if (permitidos && !q.mod) q.mod = classifica(q, temas, permitidos);
    });
    const semMod = qs.filter(q => !q.mod).length;
    if (semMod) avisos.push(`${vid}: ${semMod} de ${qs.length} questões comentadas sem módulo identificado`);
  }

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

  /* Incidência real por módulo, contada nas provas daquela trilha. Prova
     "extra" (complementar, de outro processo seletivo — ver provas.config)
     fica de fora daqui: ela entra no treino normalmente, mas não pode
     inflar "o que mais cai", que precisa ficar calibrado só pelo processo
     que rege o edital atual.                                            */
  for (const t of trilhas) {
    const conta = new Map();
    let total = 0;
    for (const p of provas.filter(p => p.trilha === t.id && !p.extra)) {
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

  /* Questões recuperadas do caderno renderizado: as que o extrator tinha
     descartado por dependerem de figura ou por o texto ter saído corrompido.
     Vêm de src/dados/questoes-figura.json, com o desenho refeito em SVG.  */
  const arqFig = path.join(DADOS, 'questoes-figura.json');
  if (existe(arqFig)) {
    const recuperadas = leJson(arqFig).filter(x => x && x.prova && x.n && x.q && x.alts && x.correta);
    let postas = 0, semLugar = 0;
    for (const r of recuperadas) {
      const p = provas.find(p => p.id === r.prova);
      if (!p) { semLugar++; continue; }
      const alts = {};
      for (const L of ['A', 'B', 'C', 'D', 'E']) if (r.alts[L]) alts[L] = limpaEnunciado(r.alts[L]);
      const nova = {
        n: r.n, origem: `Cesgranrio ${p.ano}, Q${r.n}`,
        q: limpaEnunciado(r.q), alts, correta: r.correta, htm: true,
        ...(r.fig ? { fig: limpaSvg(r.fig), figLegenda: limpaEnunciado(r.legenda || '') } : {}),
      };
      const i = p.questoes.findIndex(q => q.n === r.n);
      if (i >= 0) p.questoes[i] = { ...p.questoes[i], ...nova }; else p.questoes.push(nova);
      postas++;
      /* sai da lista de descartadas: a conta tem de continuar honesta */
      for (const k of ['comFigura', 'quebradas', 'semGabarito']) {
        if (p.deFora && p.deFora[k]) p.deFora[k] = p.deFora[k].filter(n => n !== r.n);
      }
    }
    for (const p of provas) { p.questoes.sort((a, b) => a.n - b.n); p.total = p.questoes.length; }
    avisos.push(`${postas} questões recuperadas do caderno (${recuperadas.filter(r => r.fig).length} com figura redesenhada)` +
      (semLugar ? ` · ${semLugar} sem prova correspondente` : ''));
  }

  /* Figuras recortadas do caderno original por ferramentas/extrair-figuras.mjs.
     Vão como ARQUIVO em figuras/, não embutidas: são dezenas de PNGs e o
     index.html já tem mais de 2 MB. O service worker recebe a lista no
     precache, então o app continua inteiro offline.                     */
  const arqFigProvas = path.join(DADOS, 'figuras-provas.json');
  const usadas = [];
  if (existe(arqFigProvas)) {
    const lista = leJson(arqFigProvas);
    let postas = 0;
    for (const f of lista) {
      if (!existe(path.join(RAIZ, 'figuras', f.arquivo))) continue;
      const p = provas.find(p => p.id === f.prova);
      if (!p) continue;
      const q = p.questoes.find(q => q.n === f.n);
      if (q) {
        q.figArq = 'figuras/' + f.arquivo;
        /* 'bloco' = não deu para isolar o desenho, então o recorte traz o
           enunciado inteiro do caderno. Nesse caso o app mostra a imagem
           NO LUGAR do texto, senão o enunciado apareceria duas vezes. */
        if (f.tipo === 'bloco') q.figBloco = true;
        postas++; usadas.push('./figuras/' + f.arquivo);
      }
    }
    if (postas) avisos.push(`${postas} questões receberam a figura recortada do caderno`);
  }
  /* O service worker precisa saber das figuras, senão elas não existem
     offline — e o app é usado no celular, no ônibus, sem sinal.       */
  const arqSw = path.join(RAIZ, 'sw.js');
  if (existe(arqSw)) {
    const base = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
    const sw = le(arqSw).replace(/^const ARQ = \[[^\]]*\];/m,
      'const ARQ = ' + JSON.stringify([...base, ...usadas]) + ';');
    fs.writeFileSync(arqSw, sw, 'utf8');
  }

  /* marca as questões que chegaram incompletas, em todos os acervos */
  const contaAviso = {};
  /* Questão que já tem o desenho — refeito em SVG ou recortado do caderno —
     não pode continuar avisando que falta figura. O aviso existe para quem
     ficou sem. */
  const marca = q => {
    if (q.fig || q.figArq) return;
    const a = avisoDaQuestao(q);
    if (a) { q.aviso = a; contaAviso[a] = (contaAviso[a] || 0) + 1; }
  };
  for (const v of conteudo) for (const m of v.mods) (m.qs || []).forEach(marca);
  for (const vid in quizzes) quizzes[vid].forEach(marca);
  for (const p of provas) p.questoes.forEach(marca);
  const totalAviso = Object.values(contaAviso).reduce((a, b) => a + b, 0);
  if (totalAviso) avisos.push(`${totalAviso} questões marcadas como incompletas: ` +
    Object.entries(contaAviso).map(([k, n]) => `${n} ${k}`).join(', '));

  const arqMapas = path.join(DADOS, 'mapas.json');
  const mapas = existe(arqMapas) ? leJson(arqMapas) : {};
  delete mapas._leia;
  const semMapa = [];
  for (const v of conteudo) for (const m of v.mods) if (!mapas[m.id]) semMapa.push(m.id);
  if (semMapa.length) avisos.push(`${Object.keys(mapas).length} módulos com mapa mental; ainda sem mapa: ${semMapa.length}`);

  /* De qual parte do edital 2026 cada módulo vem — modId -> {enfase,
     nomeEnfase, item, titulo} ou {foraDoEdital:true}. Módulo sem entrada
     aqui simplesmente não ganha etiqueta (caso do v4, comum a todas as
     trilhas: Português/Inglês são da Fase 2, fora da tabela por ênfase). */
  const arqEdital = path.join(DADOS, 'edital.json');
  const edital = existe(arqEdital) ? leJson(arqEdital) : {};

  const arqNovidades = path.join(DADOS, 'novidades.json');
  const novidades = existe(arqNovidades) ? leJson(arqNovidades) : {};

  const versao = leJson(path.join(RAIZ, 'package.json')).version;
  return { versao, trilhas, conteudo, quizzes, provas, mapas, edital, novidades };
}

/* O SVG das figuras é escrito por agente e entra inline na página. Antes
   de entrar, some tudo o que pode executar: script, handler on*, href
   javascript:, <foreignObject> e referência externa. O desenho é para
   desenhar — não precisa de nada disso.                                */
function limpaSvg(svg) {
  let s = String(svg || '')
    .replace(/<\s*(script|foreignObject|iframe|object|embed)\b[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|xlink:href|src)\s*=\s*("|')\s*(javascript|data):[^"']*\2/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  if (!/^<svg[\s>]/i.test(s)) return '';
  if (!/<\/svg>\s*$/i.test(s)) return '';
  /* largura fixa quebra o layout responsivo — quem manda é o viewBox */
  s = s.replace(/<svg([^>]*)>/i, (m, at) => '<svg' + at.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '') + '>');
  if (!/viewBox\s*=/i.test(s)) return '';
  return s;
}

/* O enunciado recuperado pode trazer tabela, expoente e índice — coisas
   que a questão original tinha e que viram texto morto se forem escapadas.
   Aqui passa uma lista curta de tags de formatação e NADA mais: sem
   atributo, sem link, sem estilo. O que não estiver na lista é escapado. */
const TAGS_OK = new Set(['table', 'thead', 'tbody', 'tr', 'td', 'th', 'sup', 'sub', 'b', 'strong', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'small']);
function limpaEnunciado(txt) {
  let s = String(txt || '');
  /* O desenho aparece logo abaixo do enunciado, então o marcador de lugar
     que o transcritor deixou vira lixo na tela. */
  s = s.replace(/[ \t]*\n?[ \t]*\[\s*figura[^\]]*\][ \t]*\n?[ \t]*/gi, '\n\n')
    .replace(/\(\s*figura abaixo\s*\)/gi, '')
    .replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  /* V_T e I_A vindos da transcrição viram índice de verdade. Só uma letra
     de cada lado, para não estragar nome_de_arquivo nem fórmula. */
  s = s.replace(/\b([A-Za-zΔΩμφθ])_([A-Za-z0-9])\b/g, '$1<sub>$2</sub>');
  return s.replace(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g, (tag, nome) => {
    const n = nome.toLowerCase();
    if (!TAGS_OK.has(n)) return tag.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return tag.startsWith('</') ? `</${n}>` : `<${n}>`;      // descarta todo atributo
  });
}

/* ---------------- questão que chegou incompleta ----------------
   Na conversão do caderno para texto, tabela e lista de afirmativas se
   perdem. O extrator de provas já barrava isso; as questões da lição
   nunca passaram pelo mesmo teste e havia gente respondendo no escuro.

   São três gravidades:
     'alternativas-iguais' e 'itens-ausentes' → não há resposta possível
     'marcador-de-figura'                     → o texto admite a lacuna
     'pede-desenho'                           → cita um desenho; pode ser
        um diagrama clássico (Fe-C) que o aluno tem de saber de cor, então
        continua respondível — só ganha aviso.                          */
const SO_ROTULO = /^(apenas\s+)?([IVX]+|[A-E])(\s*(,|e|\se\s)\s*([IVX]+|[A-E]))*\.?$/i;
const PEDE_DESENHO = /\b(figura|figuras|esquema|gr[áa]fico|gr[áa]ficos|desenho|diagrama|ilustra[çc][ãa]o|croqui|circuito abaixo|tabela abaixo|tabela a seguir|tabela acima)\b/i;

function avisoDaQuestao(q) {
  const alts = q.alts || {};
  const letras = ['A', 'B', 'C', 'D', 'E'].filter(x => x in alts);
  const txt = letras.map(x => String(alts[x] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const baixo = txt.map(t => t.toLowerCase());
  if (baixo.some((t, i) => t && baixo.indexOf(t) !== i)) return 'alternativas-iguais';

  const e = String(q.q || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\[\s*figura/i.test(e)) return 'marcador-de-figura';
  if (letras.length >= 4 && txt.every(t => SO_ROTULO.test(t))
      && !/(^|[\s(])(I|II|III|IV|V)\s*[-–—.):]\s*\S/.test(e)) return 'itens-ausentes';
  if (PEDE_DESENHO.test(e)) return 'pede-desenho';
  return null;
}

/* Comparação sem acento e sem caixa: a lista de palavras-chave é escrita
   à mão e o enunciado vem da banca. Exigir que "concordância" batesse
   letra a letra com "concordancia" fazia a busca falhar em silêncio. */
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Acha o módulo cujas palavras-chave mais aparecem na questão. */
function classifica(q, temas, permitidos) {
  const texto = semAcento(q.q + ' ' + Object.values(q.alts || {}).join(' '));
  let melhor = null, melhorNota = 0, empate = false;
  for (const [mid, palavras] of Object.entries(temas)) {
    if (mid.startsWith('_') || !permitidos || !permitidos.has(mid)) continue;
    let nota = 0;
    for (const p of palavras) if (texto.includes(semAcento(p))) nota += p.length;   // termo longo pesa mais
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
      for (const q of (m.qs || [])) {
        if (!q.correta || !q.alts || !q.alts[q.correta]) erros.push(`questão ${m.id}/Q${q.n} sem alternativa correta`);
        if (!q.explica) erros.push(`questão ${m.id}/Q${q.n} sem explicação`);
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

/* Todos os .css de src/shell/, em ordem alfabética — estilo.css vem
   primeiro e define os tokens; os demais acrescentam componentes.  */
const css = fs.readdirSync(path.join(SRC, 'shell'))
  .filter(f => f.endsWith('.css')).sort()
  .map(f => `/* ===== ${f} ===== */\n` + le(path.join(SRC, 'shell', f)))
  .join('\n\n');
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
if (avisos.length) {
  console.log('\n⚠ avisos de conteúdo:');
  avisos.forEach(a => console.log('   · ' + a));
  console.log('');
}
console.log(`✓ index.html gerado — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  ${DATA.trilhas.length} trilhas · ${DATA.conteudo.length} volumes · ${mods} módulos`);
console.log(`  ${comentadas} questões comentadas · ${deProva} questões de prova · ${DATA.provas.length} provas`);
