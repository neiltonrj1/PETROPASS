/* ============================================================
   Teste de fumaça: abre o index.html gerado num navegador de
   mentira (jsdom), entra com um usuário fictício e passa por
   TODAS as telas de TODAS as trilhas, abrindo todos os módulos
   e todas as abas. Qualquer erro de JavaScript reprova.

       npm test

   Não substitui abrir o app no navegador, mas pega na hora o
   erro bobo que só apareceria depois de publicado.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const RAIZ = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

const erros = [];
/* O jsdom não busca o config.js; injetamos um de mentira para o app
   seguir o mesmo caminho de quando está publicado.                  */
const comCfg = html.replace('<script src="config.js"></script>',
  '<script>window.PETROPASS_CFG={url:"https://exemplo.supabase.co",key:"' + 'x'.repeat(60) + '"}</script>');

const dom = new JSDOM(comCfg, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole: new (await import('jsdom')).VirtualConsole()
    .on('jsdomError', e => erros.push('erro de script: ' + e.message))
    .on('error', (...a) => erros.push('console.error: ' + a.join(' '))),
});
const { window } = dom;

/* O jsdom não rola a página nem desenha: silenciamos essas duas coisas
   para o log mostrar só o que é problema de verdade.                 */
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
window.confirm = () => true;

/* O canvas não existe no jsdom; devolvemos um contexto de brinquedo
   para as figuras poderem "desenhar" sem quebrar o teste.          */
window.HTMLCanvasElement.prototype.getContext = function () {
  const nada = () => {};
  return new Proxy({}, {
    get: (_, p) => (p === 'canvas' ? this
      : p === 'measureText' ? (() => ({ width: 10 }))
      : p === 'createLinearGradient' || p === 'createRadialGradient' ? (() => ({ addColorStop: nada }))
      : p === 'getImageData' ? (() => ({ data: [] }))
      : nada),
    set: () => true,
  });
};

await new Promise(r => window.addEventListener('load', r, { once: true }));

const ok = (nome, fn) => {
  try { fn(); process.stdout.write('.'); }
  catch (e) { erros.push(`${nome}: ${e.message}`); process.stdout.write('x'); }
};

/* Entra sem passar pelo Supabase. */
window.eval(`
  USER = {id:'teste', email:'teste@exemplo.com', nome:'Teste', aprovado:true};
  S = JSON.parse(JSON.stringify(DEF));
  document.body.classList.remove('deslogado');
`);

const DATA = window.eval('DATA');
console.log(`\napp: v${DATA.versao} · ${DATA.trilhas.length} trilhas · ${DATA.conteudo.length} volumes`);

ok('tela de escolha de prova', () => {
  window.telaTrilha(true);
  const n = window.document.querySelectorAll('.trilha-card').length;
  if (n !== DATA.trilhas.length) throw new Error(`apareceram ${n} cartões, esperava ${DATA.trilhas.length}`);
});

for (const t of DATA.trilhas) {
  process.stdout.write(`\n${t.icone} ${t.curto.padEnd(10)} `);
  ok(`escolher ${t.id}`, () => window.escolheTrilha(t.id));

  for (const v of ['home', 'estudar', 'treinar', 'provas', 'plano', 'notas', 'config']) {
    ok(`${t.id}/${v}`, () => {
      window.go(v);
      if (!window.document.getElementById('main').innerHTML.trim()) throw new Error('tela ficou vazia');
    });
  }

  /* abre cada módulo da trilha, em cada aba disponível */
  const mods = window.eval('modsTrilha().map(m=>m.id)');
  for (const mid of mods) {
    ok(`${t.id}/módulo ${mid}`, () => {
      window.abrirModulo(mid);
      const abas = [...window.document.querySelectorAll('.abas button')].length;
      if (!abas) throw new Error('leitor abriu sem abas');
    });
    const abas = window.eval(`(function(){
      var m = findMod(LEITOR.vol, LEITOR.mod);
      var a = ['licao'];
      if (FIGURAS.some(f=>f.mod===m.id)) a.push('figuras');
      if (m.questoes) a.push('questoes');
      if (questoesDoModulo(m.id).length) a.push('prova');
      if (CALCULOS.some(c=>c.mod===m.id)) a.push('calculos');
      if (m.gabarito) a.push('gabarito');
      return a;
    })()`);
    for (const aba of abas) ok(`${t.id}/${mid}/${aba}`, () => window.trocaAba(aba));
    window.fecharLeitor();
  }

  /* responde a primeira questão de cada quiz e de cada prova */
  const quizzes = window.eval('volsTrilha().filter(v=>(DATA.quizzes[v.id]||[]).length).map(v=>v.id)');
  for (const vid of quizzes) {
    ok(`${t.id}/quiz ${vid}`, () => { window.iniciaQuiz(vid); window.respondeQuestao(vid, 0, 'A'); window.go('treinar'); });
  }
  const provas = window.eval('provasTrilha().map(p=>p.id)');
  for (const pid of provas) {
    ok(`${t.id}/simulado ${pid}`, () => { window.iniciaSimulado(pid); window.respondeSim('A'); window.go('provas'); });
  }

  ok(`${t.id}/caderno de erros`, () => window.go('notas'));
  ok(`${t.id}/marcar bloco`, () => { window.go('plano'); window.marcaBloco(window.eval('kBloco(semanaAtual(),1,"m")')); });
  ok(`${t.id}/marcar semana`, () => window.toggleWk(0));
}

/* ---- questão interativa (v6) ---- */
process.stdout.write('\nquestão     ');
ok('questões da lição viraram interativas', () => {
  window.escolheTrilha('inspecao');
  const n = window.eval('DATA.conteudo.reduce(function(a,v){return a+v.mods.reduce(function(b,m){return b+((m.qs||[]).length)},0)},0)');
  if (n < 150) throw new Error(`só ${n} questões de lição converteram`);
  window.abrirModulo('v1m2', 'questoes');
  if (!window.document.querySelector('.qz')) throw new Error('nenhuma questão renderizou');
  if (!window.document.querySelector('.qz-alts .alt')) throw new Error('as alternativas não apareceram');
});
ok('não existem mais abas de gabarito e cálculos', () => {
  const abas = [...window.document.querySelectorAll('.abas button')].map(b => b.textContent.trim().toLowerCase());
  if (abas.some(a => a.startsWith('gabarito') || a.startsWith('cálculos'))) {
    throw new Error('ainda há aba separada: ' + abas.join(', '));
  }
});
ok('responder corrige e mostra a explicação', () => {
  const r = window.eval(`(function(){
    var mod = null;
    DATA.conteudo.forEach(function(v){ v.mods.forEach(function(m){ if(m.id==='v1m2') mod=m; }); });
    var q = mod.qs[0];
    delete S.quiz['licao:v1m2'];
    respondeQuestao('licao:v1m2', q.n, q.correta === 'A' ? 'B' : 'A');
    return {marcada: S.quiz['licao:v1m2'][q.n], correta: q.correta, temErro: S.erros.some(function(e){return e.vol==='licao:v1m2'})};
  })()`);
  if (!r.marcada) throw new Error('a resposta não foi guardada');
  if (!r.temErro) throw new Error('errar não alimentou o caderno de erros');
  if (!window.document.querySelector('.qz-bloco.ruim')) throw new Error('não apareceu o bloco de erro');
  if (!window.document.querySelector('.alt.correta')) throw new Error('a alternativa correta não foi destacada');
});
ok('refazer limpa a resposta', () => {
  const q = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var n = mod.qs[0].n; refazQuestao('licao:v1m2', n);
    return {resp: S.quiz['licao:v1m2'][n], erro: S.erros.some(function(e){return e.vol==='licao:v1m2'})};
  })()`);
  if (q.resp !== undefined) throw new Error('a resposta não foi apagada');
  if (q.erro) throw new Error('o erro continuou no caderno');
});
ok('dicas revelam uma de cada vez e escondem a letra', () => {
  const r = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var q = mod.qs[0], id = 'licao:v1m2:'+q.n;
    S.dicas = {};
    var ds = dicasDe(q, mod);
    pedeDica(id, ds.length);
    var n1 = S.dicas[id];
    pedeDica(id, ds.length); pedeDica(id, ds.length); pedeDica(id, ds.length);
    var texto = ds.map(function(d){return d.c}).join(' ');
    return {n1:n1, teto:S.dicas[id], total:ds.length, vazou: /letra\\s+[A-E]\\b/.test(texto)};
  })()`);
  if (r.n1 !== 1) throw new Error('a primeira dica não abriu sozinha');
  if (r.teto > r.total) throw new Error('a dica passou do total disponível');
  if (r.vazou) throw new Error('uma dica entregou a letra da resposta');
});
ok('rascunho guarda por questão', () => {
  window.eval(`salvaRascunho('licao:v1m2:11', 'meu raciocínio')`);
  if (window.eval(`S.rascunho['licao:v1m2:11']`) !== 'meu raciocínio') throw new Error('o rascunho não foi salvo');
});
ok('resolução passo a passo entra na questão que ela resolve', () => {
  const achou = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    return (mod.qs||[]).some(function(q){ return !!calculoDaQuestao('v1m2', q.origem); });
  })()`);
  if (!achou) throw new Error('nenhum cálculo casou com a questão de origem');
});
ok('revisão dirigida cobre todos os acervos', () => {
  const r = window.eval(`(function(){
    S.erros = [];
    var provas = provasTrilha();
    if(provas.length < 2) return {pulou:true};
    provas.slice(0,2).forEach(function(p){
      S.erros.push({vol:p.id, qi:p.questoes[0].n, origem:'x', marcou:'A', correta:'B', ponto:'', motivo:'', d:''});
    });
    refazerErradas();
    return {acervos: new Set(REV.map(function(x){return x.vol})).size, total: REV.length};
  })()`);
  if (r.pulou) return;
  if (r.acervos < 2) throw new Error('a revisão pegou só um acervo');
  if (r.total !== window.eval('S.erros.length')) throw new Error('a revisão não pegou todas as erradas');
  if (!window.document.querySelector('.qz')) throw new Error('a tela de revisão não renderizou as questões');
  window.eval('REV=null'); window.go('treinar');
});
ok('acertar com dica não estica a revisão', () => {
  const r = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var q = mod.qs[1], id = 'licao:v1m2:'+q.n;
    S.rev['v1m2'] = {nivel:2, prox:hojeISO(), visto:''};
    S.dicas = {}; delete S.quiz['licao:v1m2'];
    respondeQuestao('licao:v1m2', q.n, q.correta);      // sem dica
    var limpo = S.rev['v1m2'].nivel;
    S.rev['v1m2'] = {nivel:2, prox:hojeISO(), visto:''};
    S.dicas[id] = 1; refazQuestao('licao:v1m2', q.n);
    respondeQuestao('licao:v1m2', q.n, q.correta);      // com dica
    return {limpo:limpo, comApoio:S.rev['v1m2'].nivel};
  })()`);
  if (r.limpo !== 3) throw new Error('acerto limpo devia subir para o degrau 3');
  if (r.comApoio !== 2) throw new Error('acerto com dica não podia subir de degrau');
});
ok('abrir a lição não faz o intervalo crescer', () => {
  const r = window.eval(`(function(){
    S.rev['v1m3'] = {nivel:1, prox: somaDias(hojeISO(),-5), visto: somaDias(hojeISO(),-30)};
    abrirModulo('v1m3'); fecharLeitor();
    return S.rev['v1m3'].nivel;
  })()`);
  if (r !== 1) throw new Error('só abrir a lição mudou o degrau da revisão');
});
ok('estados local e nuvem se juntam sem perder nada', () => {
  const r = window.eval(`(function(){
    var local = JSON.parse(JSON.stringify(DEF));
    local.seq = 5; local.notas = {a:'do aparelho'}; local.ink = {'m1:licao':[1]};
    var nuvem = JSON.parse(JSON.stringify(DEF));
    nuvem.seq = 9; nuvem.notas = {b:'da nuvem'};
    var j = juntaEstados(local, nuvem);
    return {a:j.notas.a, b:j.notas.b, ink:!!j.ink['m1:licao']};
  })()`);
  if (!r.a) throw new Error('a nota que só existia no aparelho foi descartada');
  if (!r.b) throw new Error('a nota da nuvem sumiu');
  if (!r.ink) throw new Error('as anotações a caneta do aparelho foram perdidas');
});
/* O jsdom não resolve var() em getComputedStyle, então aqui se confere
   a regra em si: sem `html{font-size:var(--fs)}` o ajuste de tamanho
   de texto não alcança nenhuma das medidas em rem do sistema.       */
ok('o tamanho do texto escala a página', () => {
  const css = [...window.document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  if (!/html\s*\{[^}]*font-size\s*:\s*var\(--fs/.test(css)) {
    throw new Error('falta html{font-size:var(--fs)} — o controle de tamanho não escala os rem');
  }
});
ok('questões de prova herdaram explicação', () => {
  const n = window.eval('DATA.provas.reduce(function(a,p){return a+p.questoes.filter(function(q){return !!q.explica}).length},0)');
  if (n < 100) throw new Error(`só ${n} questões de prova têm explicação`);
});
/* "Cesgranrio 2018, Q22" existe em três provas diferentes. Sem a trilha na
   chave, a explicação de metalurgia ia parar numa questão de motor CC. */
ok('a explicação herdada não vem de outra trilha', () => {
  const ruins = window.eval(`(function(){
    var volDoMod = {};
    DATA.conteudo.forEach(function(v){ v.mods.forEach(function(m){ volDoMod[m.id]=v.id; }); });
    var trilhasDoVol = {};
    DATA.trilhas.forEach(function(t){ t.vols.forEach(function(vid){ (trilhasDoVol[vid]=trilhasDoVol[vid]||[]).push(t.id); }); });
    var out = [];
    DATA.provas.forEach(function(p){ p.questoes.forEach(function(q){
      if(!q.modExplica) return;
      if((trilhasDoVol[volDoMod[q.modExplica]]||[]).indexOf(p.trilha) < 0)
        out.push(p.id+' '+q.origem+' <= '+q.modExplica);
    }); });
    return out;
  })()`);
  if (ruins.length) throw new Error(`${ruins.length} explicações vieram de outra trilha (ex.: ${ruins[0]})`);
});
/* Versão adaptada tem gabarito próprio; herdar a explicação dela punha um
   texto defendendo uma letra embaixo do gabarito de outra. */
ok('explicação de questão adaptada não é herdada pela prova', () => {
  const n = window.eval(`(function(){
    var alvo = {};
    DATA.conteudo.forEach(function(v){ v.mods.forEach(function(m){ (m.qs||[]).forEach(function(q){
      if(/adaptad/i.test(q.origem||'') && q.explica) alvo[q.explica.slice(0,120)] = true;
    }); }); });
    var n = 0;
    DATA.provas.forEach(function(p){ p.questoes.forEach(function(q){
      if(q.explica && alvo[q.explica.slice(0,120)]) n++;
    }); });
    return n;
  })()`);
  if (n) throw new Error(`${n} questões de prova herdaram a explicação de uma versão adaptada`);
});
/* Regressão: quando os eventos de ponteiro saíram do canvas para o
   #pagewrap, o ajustaTouch continuou mexendo no canvas — que tem
   pointer-events:none. A ordem de não rolar a página ia para um elemento
   que o navegador ignora, e não dava para escrever com dedo nem caneta. */
ok('a barra da caneta manda no elemento que recebe o toque', () => {
  const r = window.eval(`(function(){
    escolheTrilha('inspecao'); VIEW='estudar'; abrirModulo('v1m1','licao');
    var wrap = document.getElementById('pagewrap');
    if(!wrap) return {erro:'não achei o #pagewrap'};
    TOOL.modo='caneta'; TOOL.dedo=true; ajustaTouch();
    var desenhando = wrap.style.touchAction;
    TOOL.modo='ler'; ajustaTouch();
    var lendo = wrap.style.touchAction;
    TOOL.modo='caneta'; TOOL.dedo=false; penPerto=false; ajustaTouch();
    var semDedo = wrap.style.touchAction;
    fecharLeitor();
    return {desenhando:desenhando, lendo:lendo, semDedo:semDedo};
  })()`);
  if (r.erro) throw new Error(r.erro);
  if (r.desenhando !== 'none') throw new Error(`com o dedo ligado a página tinha de travar a rolagem, veio "${r.desenhando}"`);
  if (r.lendo !== 'auto') throw new Error(`em modo Ler a página tem de rolar normalmente, veio "${r.lendo}"`);
  if (r.semDedo !== 'auto') throw new Error(`sem dedo e sem caneta a página tem de rolar, veio "${r.semDedo}"`);
});
ok('a escolha da barra sobrevive ao recarregamento', () => {
  const r = window.eval(`(function(){
    TOOL.modo='ler'; TOOL.dedo=true; salvaTinta();
    var gravado = JSON.parse(JSON.stringify(S.cfg.tinta));
    TOOL.modo='caneta'; TOOL.dedo=false;      // finge que o app reabriu
    carregaTinta();
    return {gravado:gravado, modo:TOOL.modo, dedo:TOOL.dedo};
  })()`);
  if (r.gravado.modo !== 'ler') throw new Error('o modo não foi gravado');
  if (r.modo !== 'ler' || r.dedo !== true) throw new Error('a escolha não voltou depois de recarregar');
});

/* Regressão: mapas, figuras e tabelas adicionados nas últimas versões
   fizeram várias lições crescerem bastante de altura. Um traço salvo
   antes disso reescalava proporcional a essa altura nova e virava um
   borrão cobrindo boa parte da tela — mesmo com a caneta em modo "Ler",
   porque o redesenho roda de qualquer forma, não é uma anotação nova. */
ok('anotação antiga não estica quando a página cresce muito', () => {
  const r = window.eval(`(function(){
    if(typeof escalaTraco !== 'function') return {erro:'escalaTraco não existe'};
    return {
      cresceu: escalaTraco(3000, 400),     // página 7,5× mais alta que quando o traço foi salvo
      encolheu: escalaTraco(300, 2000),    // e o caso inverso
      ajusteFonte: +escalaTraco(1300, 1000).toFixed(2),  // variação normal de fonte/tela
      semDadoAntigo: escalaTraco(500, 0),
    };
  })()`);
  if (r.erro) throw new Error(r.erro);
  if (r.cresceu !== 1) throw new Error(`página 7,5× mais alta devia manter escala 1, veio ${r.cresceu}`);
  if (r.encolheu !== 1) throw new Error(`página muito menor devia manter escala 1, veio ${r.encolheu}`);
  if (r.ajusteFonte !== 1.3) throw new Error(`ajuste normal de fonte devia escalar, veio ${r.ajusteFonte}`);
  if (r.semDadoAntigo !== 1) throw new Error('traço sem tamanho salvo devia cair em escala 1');
});
ok('a revisão sobe no máximo um degrau por dia', () => {
  const r = window.eval(`(function(){
    S.rev['v1m4'] = {nivel:0};
    for(var i=0;i<6;i++) agendaRevisao('v1m4','limpa');   // seis acertos numa sentada
    var hoje = S.rev['v1m4'].nivel;
    S.rev['v1m4'].subiuEm = somaDias(hojeISO(), -1);      // finge que virou o dia
    agendaRevisao('v1m4','limpa');
    return {hoje:hoje, depois:S.rev['v1m4'].nivel};
  })()`);
  if (r.hoje !== 1) throw new Error(`seis acertos no mesmo dia subiram ${r.hoje} degraus de uma vez`);
  if (r.depois !== 2) throw new Error('no dia seguinte o degrau não subiu');
});
ok('o bloco eliminatório tem peso na cobertura', () => {
  window.escolheTrilha('inspecao');
  const c = window.eval('cobertura().map(function(x){return {id:x.vol.id, peso:x.peso}})');
  const basicas = c.find(x => x.id === 'v4');
  if (!basicas) throw new Error('Português e Inglês não aparece na cobertura');
  if (basicas.peso < 15) throw new Error(`Português e Inglês com peso ${basicas.peso}% — são 20 das 70 questões`);
  const soma = c.reduce((a, x) => a + x.peso, 0);
  if (soma < 90 || soma > 110) throw new Error(`os pesos dos blocos somam ${soma}%`);
});
ok('toda questão comentada sabe o seu módulo', () => {
  const orfas = window.eval(`(function(){
    var n = 0;
    for(var vid in DATA.quizzes) DATA.quizzes[vid].forEach(function(q){ if(!q.mod) n++; });
    return n;
  })()`);
  if (orfas) throw new Error(`${orfas} questões comentadas sem módulo — não entram na revisão nem na cobertura`);
});
/* As figuras são SVG escrito por agente e entram inline na página. */
ok('as figuras das questões são SVG seguro e sem tamanho fixo', () => {
  const r = window.eval(`(function(){
    var comFig = [], ruins = [];
    DATA.provas.forEach(function(p){ p.questoes.forEach(function(q){
      if(!q.fig) return;
      comFig.push(p.id+'/Q'+q.n);
      var s = q.fig;
      if(!/^<svg[\\s>]/i.test(s)) ruins.push(p.id+'/Q'+q.n+': não começa com <svg');
      if(!/viewBox\\s*=/i.test(s)) ruins.push(p.id+'/Q'+q.n+': sem viewBox');
      if(/<script|\\son[a-z]+\\s*=|javascript:|<foreignObject/i.test(s)) ruins.push(p.id+'/Q'+q.n+': conteúdo executável');
      if(/<svg[^>]*\\s(width|height)\\s*=/i.test(s)) ruins.push(p.id+'/Q'+q.n+': tamanho fixo no <svg>');
    }); });
    return {n: comFig.length, ruins: ruins};
  })()`);
  if (r.ruins.length) throw new Error(r.ruins.slice(0, 4).join(' · '));
  if (!r.n) return;                       // ainda não há figura recuperada
  /* e uma delas tem de renderizar de verdade */
  const desenhou = window.eval(`(function(){
    for(var i=0;i<DATA.provas.length;i++){
      var p = DATA.provas[i];
      var q = p.questoes.filter(function(q){return !!q.fig})[0];
      if(!q) continue;
      escolheTrilha(p.trilha); iniciaSimulado(p.id);
      SIM.i = p.questoes.indexOf(q); render();
      return !!document.querySelector('.qz-fig svg');
    }
    return true;
  })()`);
  if (!desenhou) throw new Error('a figura não apareceu na tela da questão');
  window.eval('SIM=null'); window.go('provas');
});
ok('o caderno comentado usa a mesma peça das outras questões', () => {
  const r = window.eval(`(function(){
    S.rev = {}; S.tentativas = {}; S.quiz['v1'] = {};
    var q = DATA.quizzes['v1'][0];
    iniciaQuiz('v1');
    respondeQuestao('v1', q.n, q.correta);
    return {rev: !!S.rev[q.mod], tent: (S.tentativas['v1:'+q.n]||[]).length};
  })()`);
  if (!r.rev) throw new Error('responder no caderno comentado não agendou a revisão do módulo');
  if (r.tent !== 1) throw new Error('a tentativa não entrou no histórico de rodadas');
  if (!window.document.querySelector('.qz-alts')) throw new Error('o caderno não renderizou pela peça nova');
  if (!window.document.querySelector('.qz-bloco.atencao')) throw new Error('o motivo dos distratores não apareceu');
  window.eval('QZ=null'); window.go('treinar');
});

/* ---- rodadas e histórico de tentativas ---- */
process.stdout.write('\nrodadas     ');
ok('a rodada 2 só libera com o módulo fechado', () => {
  const r = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var f='licao:v1m2';
    S.quiz[f]={}; S.rodada={}; S.tentativas={};
    respondeQuestao(f, mod.qs[0].n, mod.qs[0].correta);   // só uma
    novaRodada(f);
    var bloqueou = rodadaAtual(f) === 1;
    mod.qs.forEach(function(q){ respondeQuestao(f, q.n, q.correta); });
    novaRodada(f);
    return {bloqueou: bloqueou, agora: rodadaAtual(f), limpou: Object.keys(S.quiz[f]).length};
  })()`);
  if (!r.bloqueou) throw new Error('deixou virar a rodada sem responder tudo');
  if (r.agora !== 2) throw new Error('não virou a rodada com o módulo fechado');
  if (r.limpou !== 0) throw new Error('a rodada nova não zerou as respostas');
});
ok('o histórico de tentativas sobrevive à nova rodada', () => {
  const n = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var q = mod.qs[0];
    return (S.tentativas['licao:v1m2:'+q.n]||[]).length;
  })()`);
  if (n < 2) throw new Error(`só ${n} tentativa(s) guardada(s) — o histórico se perdeu`);
});
ok('conta quantas vezes errou cada questão', () => {
  const e = window.eval(`(function(){
    var mod=null; DATA.conteudo.forEach(function(v){v.mods.forEach(function(m){if(m.id==='v1m2')mod=m})});
    var f='licao:v1m2', q=mod.qs[0];
    S.tentativas['licao:v1m2:'+q.n] = [{r:1,m:'A',ok:false},{r:2,m:'B',ok:false},{r:3,m:q.correta,ok:true}];
    return errosDaQuestao(f, q);
  })()`);
  if (e !== 2) throw new Error(`contou ${e} erros, esperava 2`);
});
ok('dá para esconder e reabrir as dicas', () => {
  window.eval(`S.dicasFechadas={}; fechaDicas('licao:v1m2:11');`);
  if (!window.eval(`S.dicasFechadas['licao:v1m2:11']`)) throw new Error('não fechou');
  window.eval(`fechaDicas('licao:v1m2:11')`);
  if (window.eval(`S.dicasFechadas['licao:v1m2:11']`)) throw new Error('não reabriu');
});
ok('o mapa fecha o módulo (vem depois da lição)', () => {
  window.abrirModulo('v1m2', 'licao');
  const page = window.document.getElementById('page').innerHTML;
  const iMapa = page.indexOf('mapa-m');
  const iTexto = page.indexOf('<p>');
  if (iMapa < 0) throw new Error('o mapa sumiu da lição');
  if (iTexto >= 0 && iMapa < iTexto) throw new Error('o mapa ficou antes do texto da lição');
});

/* ---- mapas mentais e mnemônicos ---- */
process.stdout.write('\nmapas       ');
ok('os mapas cobrem os assuntos mais pesados', () => {
  const n = window.eval('Object.keys(DATA.mapas||{}).length');
  if (n < 15) throw new Error(`só ${n} módulos têm mapa`);
});
ok('todas as trilhas têm mapa', () => {
  const faltam = window.eval(`(function(){
    var fora = [];
    DATA.trilhas.forEach(function(t){
      var antes = S.trilha; S.trilha = t.id;
      if(modulosComMapa() === 0) fora.push(t.id);
      S.trilha = antes;
    });
    return fora.join(',');
  })()`);
  if (faltam) throw new Error('trilha sem nenhum mapa: ' + faltam);
});
ok('o mapa aparece no topo da lição', () => {
  window.escolheTrilha('inspecao');
  window.abrirModulo('v1m2', 'licao');
  if (!window.document.querySelector('.mapa-m')) throw new Error('o mapa não renderizou');
  if (!window.document.querySelector('.mapa-ramo')) throw new Error('os ramos não apareceram');
  if (!window.document.querySelector('.mnem-c')) throw new Error('os mnemônicos não apareceram');
});
ok('o mapa recolhe e volta', () => {
  window.alternaMapa();
  const fechado = !window.document.querySelector('.mapa-corpo');
  window.alternaMapa();
  const aberto = !!window.document.querySelector('.mapa-corpo');
  if (!fechado || !aberto) throw new Error('o botão de recolher não funciona');
});
ok('módulo sem mapa não quebra a lição', () => {
  const semMapa = window.eval(`modsTrilha().filter(function(m){ return !mapaDoModulo(m.id); })[0]`);
  if (!semMapa) return;
  window.abrirModulo(semMapa.id, 'licao');
  if (!window.document.getElementById('page').innerHTML.trim()) throw new Error('a lição ficou vazia');
});

/* ---- painel de estudo (v5) ---- */
process.stdout.write('\npainel      ');
ok('meta e cronômetro', () => {
  window.escolheTrilha('producao');
  window.eval('S.cfg.metaMin = 60; S.tempo[S.trilha+":"+hojeISO()] = 25;');
  window.go('home');
  const min = window.eval('minutosHoje()');
  if (min !== 25) throw new Error(`minutosHoje() devolveu ${min}, esperava 25`);
  if (!window.document.querySelector('.anel')) throw new Error('o anel da meta não apareceu');
});
ok('revisão espaçada avança de degrau', () => {
  const r = window.eval(`(function(){
    var m = modsTrilha()[0].id;
    delete S.rev[m];
    agendaRevisao(m, false);           var n0 = S.rev[m].nivel, p0 = S.rev[m].prox;
    agendaRevisao(m, true);            var n1 = S.rev[m].nivel, p1 = S.rev[m].prox;
    agendaRevisao(m, false);           var n2 = S.rev[m].nivel;
    return {n0:n0, n1:n1, n2:n2, cresceu: diasEntre(p0,p1) > 0};
  })()`);
  if (r.n0 !== 0) throw new Error('a primeira revisão devia nascer no degrau 0');
  if (r.n1 !== 1) throw new Error('acertar devia subir um degrau');
  if (r.n2 !== 0) throw new Error('errar devia voltar ao degrau 0');
  if (!r.cresceu) throw new Error('o intervalo não aumentou ao subir de degrau');
});
ok('revisão vencida entra na fila', () => {
  const n = window.eval(`(function(){
    var m = modsTrilha()[1].id;
    S.rev[m] = {nivel:1, prox: somaDias(hojeISO(), -3), visto: somaDias(hojeISO(), -10)};
    return revisoesVencidas().filter(function(r){ return r.mod.id === m; }).length;
  })()`);
  if (n !== 1) throw new Error('o módulo vencido não apareceu em revisoesVencidas()');
});
ok('histórico de desempenho por semana', () => {
  window.eval('S.hist = {}; registraResposta(true); registraResposta(false); registraResposta(true);');
  const s = window.eval('serieDesempenho()');
  const ultimo = s[s.length - 1];
  if (ultimo !== 67) throw new Error(`a última semana deu ${ultimo}%, esperava 67%`);
});
ok('cobertura por bloco', () => {
  const c = window.eval('cobertura()');
  if (!c.length) throw new Error('cobertura() veio vazia');
  if (c.some(x => x.pct < 0 || x.pct > 100)) throw new Error('percentual de cobertura fora de 0–100');
});
ok('mapa da sessão no simulado', () => {
  const pid = window.eval('provasTrilha()[0] && provasTrilha()[0].id');
  if (!pid) return;
  window.iniciaSimulado(pid);
  window.respondeSim('A');
  if (!window.document.querySelector('.mapa b')) throw new Error('o mapa da sessão não apareceu');
  window.go('provas');
});
ok('painel não vaza entre trilhas', () => {
  window.escolheTrilha('projetos');
  const m = window.eval('minutosHoje()');
  if (m !== 0) throw new Error('o tempo de Produção apareceu em Projetos');
  window.escolheTrilha('producao');
  if (window.eval('minutosHoje()') !== 25) throw new Error('o tempo de Produção se perdeu');
});

/* dados de uma trilha não podem vazar para outra */
ok('progresso separado por prova', () => {
  window.escolheTrilha('inspecao');
  const a = window.eval('stats().blocos');
  window.escolheTrilha('eletrica');
  const b = window.eval('stats().blocos');
  window.escolheTrilha('inspecao');
  const c = window.eval('stats().blocos');
  if (a !== c) throw new Error('o progresso de Inspeção mudou ao passar por Elétrica');
  if (a === 0 || b === 0) throw new Error('os blocos marcados no teste não foram registrados');
});

ok('exportar backup', () => window.eval('JSON.stringify(S)'));

console.log('\n');
dom.window.close();          // o cliente do Supabase deixa temporizadores rodando
if (erros.length) {
  console.error(`✗ ${erros.length} problema(s):\n`);
  erros.forEach(e => console.error('   · ' + e));
  process.exit(1);
}
console.log('✓ todas as telas de todas as trilhas abriram sem erro');
process.exit(0);
