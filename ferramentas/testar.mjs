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
    ok(`${t.id}/quiz ${vid}`, () => { window.iniciaQuiz(vid); window.responde(0, 'A'); window.go('treinar'); });
  }
  const provas = window.eval('provasTrilha().map(p=>p.id)');
  for (const pid of provas) {
    ok(`${t.id}/simulado ${pid}`, () => { window.iniciaSimulado(pid); window.respondeSim('A'); window.go('provas'); });
  }

  ok(`${t.id}/caderno de erros`, () => window.go('notas'));
  ok(`${t.id}/marcar bloco`, () => { window.go('plano'); window.marcaBloco(window.eval('kBloco(semanaAtual(),1,"m")')); });
  ok(`${t.id}/marcar semana`, () => window.toggleWk(0));
}

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
