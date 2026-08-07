/* Testa CLIQUE DE VERDADE (não só renderização) num navegador real,
   via CDP do Chrome headless. Descobre o que está no ponto do botão
   e dispara o evento de mouse completo.                            */
import fs from 'node:fs';
import { spawn } from 'node:child_process';

import path from 'node:path';
import os from 'node:os';

const RAIZ = path.resolve(import.meta.dirname, '..') + path.sep;
/* Chrome do Windows por padrão; no Linux (GitHub Actions) usa o do PATH. */
const CHROME = process.env.CHROME_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'google-chrome');
const PORTA = 9222;

/* página de teste: entra logada e abre a aba de questões */
let html = fs.readFileSync(RAIZ + 'index.html', 'utf8')
  .replace('<script src="config.js"></script>', '')
  .replace('</body>', `<script>
setTimeout(function(){
  USER={id:'t',email:'t@t',nome:'T',aprovado:true};
  S=JSON.parse(JSON.stringify(DEF)); S.trilha='inspecao';
  document.body.classList.remove('deslogado');
  VIEW='estudar'; abrirModulo('v1m2','questoes');
  window.__pronto = true;
}, 80);
</script></body>`);
fs.writeFileSync(RAIZ + 'teste-clique.html', html, 'utf8');

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORTA}`,
  '--window-size=1100,1400', '--no-first-run', '--user-data-dir=' + path.join(os.tmpdir(), 'ppchrome'), '--no-sandbox',
  'file:///' + RAIZ.replace(/\\\\/g,'/') + 'teste-clique.html',
], { stdio: 'ignore' });

const esperar = ms => new Promise(r => setTimeout(r, ms));
const limpar = () => { try { fs.unlinkSync(RAIZ + 'teste-clique.html'); } catch (e) {} };

/* Espera o Chrome abrir a porta de depuração. Se ele não existir na
   máquina, o teste não falha: avisa e sai. Assim ele protege o
   desenvolvimento local sem travar quem não tem Chrome instalado. */
let lista = null;
for (let i = 0; i < 20 && !lista; i++) {
  await esperar(800);
  try { lista = await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json(); } catch (e) {}
}
if (!lista) {
  console.log('⚠ Chrome não respondeu na porta de depuração — teste de clique pulado.');
  console.log('  (instale o Chrome ou aponte CHROME_PATH para ele)');
  chrome.kill(); limpar(); process.exit(0);
}
const alvo = lista.find(t => t.type === 'page' && t.url.includes('teste-clique'));
if (!alvo) { console.log('⚠ não achei a aba de teste — pulado.'); chrome.kill(); limpar(); process.exit(0); }

const { default: WS } = await import('node:http').then(() => ({ default: null })).catch(() => ({ default: null }));
/* CDP por WebSocket sem dependência externa: usa o WebSocket do Node 22+ */
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
await new Promise(r => ws.onopen = r);
const cdp = (method, params = {}) => new Promise(res => {
  const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});
const js = async expr => {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return { erro: r.result.exceptionDetails.text };
  return r.result && r.result.result ? r.result.result.value : undefined;
};

await esperar(600);
const erros = [];
const ok = (nome, cond, detalhe) => {
  if (cond) process.stdout.write('.');
  else { process.stdout.write('x'); erros.push(nome + (detalhe ? ': ' + detalhe : '')); }
};

console.log('\nteste de clique real no Chrome\n');

/* 1. o que está no ponto do botão de alternativa? */
const noPonto = await js(`(function(){
  var b = document.querySelector('.qz .alt');
  if(!b) return 'sem alternativa na tela';
  var r = b.getBoundingClientRect();
  var el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
  return el ? (el.tagName + '.' + (el.className||'')).slice(0,60) : 'nada';
})()`);
ok('a alternativa está no topo da pilha', !/canvas|ink/i.test(String(noPonto)), 'no ponto do clique está: ' + noPonto);

/* 2. clicar de verdade numa alternativa */
const antes = await js(`JSON.stringify(S.quiz['licao:v1m2']||{})`);
const box = await js(`(function(){
  var b = document.querySelector('.qz .alt');
  var r = b.getBoundingClientRect();
  return JSON.stringify({x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2)});
})()`);
const { x, y } = JSON.parse(box);
for (const type of ['mousePressed', 'mouseReleased']) {
  await cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}
await esperar(400);
const depois = await js(`JSON.stringify(S.quiz['licao:v1m2']||{})`);
ok('clicar na alternativa registra a resposta', antes !== depois, `antes ${antes} · depois ${depois}`);
ok('a correção aparece na tela', await js(`!!document.querySelector('.qz-bloco.bom, .qz-bloco.ruim')`));

/* 3. clicar no botão de dica */
await js(`(function(){ delete S.quiz['licao:v1m2']; S.dicas={}; render(); })()`);
await esperar(300);
const cxDica = await js(`(function(){
  var b = [].slice.call(document.querySelectorAll('.qz-fbt')).filter(function(x){return /dica/i.test(x.textContent)})[0];
  if(!b) return null;
  var r = b.getBoundingClientRect();
  return JSON.stringify({x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)});
})()`);
if (cxDica) {
  const p = JSON.parse(cxDica);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  }
  await esperar(400);
  ok('clicar em "pedir dica" abre a dica', await js(`Object.keys(S.dicas||{}).length > 0 && !!document.querySelector('.qz-dica')`));
} else ok('botão de dica existe', false, 'não achei o botão');

/* 4. clicar no botão de rascunho e digitar */
const cxRasc = await js(`(function(){
  var b = [].slice.call(document.querySelectorAll('.qz-fbt')).filter(function(x){return /rascunh/i.test(x.textContent)})[0];
  if(!b) return null;
  var r = b.getBoundingClientRect();
  return JSON.stringify({x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)});
})()`);
if (cxRasc) {
  const p = JSON.parse(cxRasc);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  }
  await esperar(400);
  ok('clicar em "rascunhar" abre o campo', await js(`(function(){
    var t = document.querySelector('.qz-rascunho:not(.hide) textarea'); return !!t;
  })()`));
} else ok('botão de rascunho existe', false, 'não achei o botão');

/* 5. o mesmo no simulado da prova */
await js(`(function(){ VIEW='provas'; iniciaSimulado('insp-2018'); })()`);
await esperar(500);
const antesP = await js(`JSON.stringify(S.quiz['insp-2018']||{})`);
const boxP = await js(`(function(){
  var b = document.querySelector('.qz .alt'); if(!b) return null;
  var r = b.getBoundingClientRect();
  return JSON.stringify({x: Math.round(r.left+r.width/2), y: Math.round(r.top+r.height/2)});
})()`);
if (boxP) {
  const p = JSON.parse(boxP);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  }
  await esperar(400);
  ok('clicar na alternativa do simulado registra', antesP !== await js(`JSON.stringify(S.quiz['insp-2018']||{})`));
} else ok('alternativa do simulado existe', false);

console.log('\n');
if (erros.length) { console.error('✗ ' + erros.length + ' problema(s):'); erros.forEach(e => console.error('   · ' + e)); }
else console.log('✓ os cliques funcionam');
ws.close(); chrome.kill();
try { fs.unlinkSync(RAIZ + 'teste-clique.html'); } catch (e) {}
process.exit(erros.length ? 1 : 0);
