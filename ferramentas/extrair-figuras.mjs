/* ============================================================
   Recorta para `figuras/` a figura de cada questão que depende de desenho,
   direto do caderno de prova original.

       node ferramentas/extrair-figuras.mjs [idDaProva]

   POR QUE RECORTAR A PÁGINA em vez de extrair a imagem embutida: só uma
   minoria das figuras da Cesgranrio é imagem raster; a maioria é desenho
   vetorial, que não existe como "imagem" dentro do PDF. Renderizar a
   página e recortar resolve os dois casos com um código só, e o resultado
   é exatamente o que o candidato viu na prova.

   COMO A REGIÃO É ACHADA, sem palpite: o caderno é de duas colunas. Para
   cada questão sabemos onde o marcador dela começa e onde começa a
   questão seguinte DA MESMA COLUNA. Dentro dessa faixa, a figura é o
   maior vão vertical entre duas linhas de texto consecutivas — porque é
   exatamente isso que um desenho é: um buraco no texto.

   A renderização acontece num Chrome headless via CDP, porque o pdf.js
   não desenha glifo no Node.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { pdfItens } from './lib/pdf.mjs';
import { PROVAS, PASTA_PDF } from './provas.config.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DESTINO = path.join(RAIZ, 'figuras');
const WEB = path.join(RAIZ, 'ferramentas', 'web');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORTA_CDP = 9411, PORTA_HTTP = 8811;
const ESCALA = 2.4;                 // resolução do recorte
/* Vão mínimo, em pontos de PDF, para um buraco no texto contar como figura.
   55 era conservador demais e deixava de fora desenho pequeno — gráfico de
   uma linha, esquema de duas peças. 38 pega esses sem confundir com espaço
   entre parágrafos, que raramente passa de 25.                          */
const VAO_MIN = 38;
const MARGEM = 4;                   // folga em pontos ao redor do recorte

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
/* loadImage e não `new Image(); img.src = buffer`: a segunda forma não
   decodifica o buffer, e o recorte sai em branco sem erro nenhum. */
const { createCanvas, loadImage } = await import('@napi-rs/canvas');

fs.mkdirSync(DESTINO, { recursive: true });
const soEssa = process.argv[2];

/* ---------- 1. descobrir, por prova, que recorte fazer ---------- */
const tarefas = [];                 // {prova, pdfRel, pagina, n, x0,x1,y0,y1, alturaPag}

for (const p of PROVAS) {
  if (soEssa && p.id !== soEssa) continue;
  const cad = path.join(PASTA_PDF, p.pdf);
  const arqJson = path.join(RAIZ, 'src/dados/provas', p.id + '.json');
  if (!fs.existsSync(cad) || !fs.existsSync(arqJson)) continue;
  const dados = JSON.parse(fs.readFileSync(arqJson, 'utf8').replace(/^﻿/, ''));
  const querem = new Set(dados.deFora?.comFigura || []);
  if (!querem.size) continue;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(cad)), verbosity: 0 }).promise;
  const itens = await pdfItens(cad);

  for (let np = 1; np <= doc.numPages; np++) {
    const it = itens[np - 1] || [];
    if (!it.length) continue;
    const vp = (await doc.getPage(np)).getViewport({ scale: 1 });

    const marcas = it
      .filter(i => /^\d{1,3}$/.test(i.s.trim()) && +i.s.trim() >= p.ini && +i.s.trim() <= p.ate)
      .map(i => ({ n: +i.s.trim(), y: i.y, x: i.x }));
    if (!marcas.length) continue;

    const xs = [...new Set(marcas.map(m => m.x))].sort((a, b) => a - b);
    const meio = (xs[0] + xs[xs.length - 1]) / 2;
    const larguraCol = xs.length > 1 ? (xs[xs.length - 1] - xs[0]) : vp.width * 0.42;

    for (const alvo of marcas.filter(m => querem.has(m.n))) {
      const esquerda = alvo.x < meio;
      const daColuna = marcas.filter(m => (m.x < meio) === esquerda).sort((a, b) => b.y - a.y);
      const i = daColuna.findIndex(m => m.n === alvo.n);
      const fim = i + 1 < daColuna.length ? daColuna[i + 1].y : 40;   // rodapé

      /* linhas de texto desta questão, nesta coluna */
      const linhas = [...new Set(it
        .filter(t => t.y < alvo.y + 2 && t.y > fim
          && (t.x < meio + larguraCol * 0.55) === esquerda
          && t.s.trim())
        .map(t => Math.round(t.y)))].sort((a, b) => b - a);
      if (linhas.length < 2) continue;

      /* o maior vão entre duas linhas consecutivas é onde está o desenho */
      let melhor = null;
      for (let k = 0; k + 1 < linhas.length; k++) {
        const vao = linhas[k] - linhas[k + 1];
        if (vao >= VAO_MIN && (!melhor || vao > melhor.vao)) melhor = { vao, topo: linhas[k], base: linhas[k + 1] };
      }
      if (!melhor) continue;

      const x0 = esquerda ? xs[0] - MARGEM : xs[xs.length - 1] - MARGEM;
      tarefas.push({
        prova: p.id, pdfRel: p.pdf, pagina: np, n: alvo.n,
        x0, x1: x0 + larguraCol + MARGEM * 2,
        yTopo: melhor.topo - 6, yBase: melhor.base + 6,
        alturaPag: vp.height,
      });
    }
  }
  console.log(`· ${p.id.padEnd(11)} ${tarefas.filter(t => t.prova === p.id).length} recortes de ${querem.size} questões com figura`);
}

if (!tarefas.length) { console.log('\nnada a recortar'); process.exit(0); }
const paginas = [...new Set(tarefas.map(t => t.prova + '|' + t.pagina))];
console.log(`\n${tarefas.length} recortes em ${paginas.length} páginas\n`);

/* ---------- 2. renderizar as páginas ---------- */
const TIPOS = { '.html': 'text/html', '.mjs': 'text/javascript', '.pdf': 'application/pdf' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const arq = u.startsWith('/pdf/') ? path.join(PASTA_PDF, u.slice(5)) : path.join(WEB, u.slice(1));
  if (!fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
});
await new Promise(r => srv.listen(PORTA_HTTP, r));

const perfil = path.join(process.env.TEMP || '/tmp', 'ppfig' + process.pid);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORTA_CDP}`, '--no-first-run', '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
const dorme = ms => new Promise(r => setTimeout(r, ms));

let alvo = null;
for (let i = 0; i < 50 && !alvo; i++) {
  await dorme(400);
  try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json()).find(t => t.type === 'page'); } catch { /* subindo */ }
}
if (!alvo) { console.log('Chrome não subiu — defina CHROME_PATH'); chrome.kill(); srv.close(); process.exit(1); }

const ws = new WebSocket(alvo.webSocketDebuggerUrl);
let idc = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise(r => (ws.onopen = r));
const cdp = (m, params = {}) => new Promise(res => { const i = ++idc; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params })); });

const ligadas = [];
const brancos = [];
let feitos = 0;
for (const chave of paginas) {
  const [prova, npTxt] = chave.split('|');
  const np = +npTxt;
  const daPagina = tarefas.filter(t => t.prova === prova && t.pagina === np);
  const rel = daPagina[0].pdfRel.replace(/\\/g, '/');
  const url = `http://127.0.0.1:${PORTA_HTTP}/render-pagina.html?pdf=${encodeURIComponent('/pdf/' + rel)}&pg=${np}&s=${ESCALA}`;
  await cdp('Page.navigate', { url });

  let dim = null;
  for (let i = 0; i < 60 && !dim; i++) {
    await dorme(220);
    const t = (await cdp('Runtime.evaluate', { expression: 'document.title', returnByValue: true }))?.result?.result?.value;
    if (typeof t === 'string' && t.startsWith('PRONTO')) dim = t.slice(7);
  }
  if (!dim) { console.log(`  ✗ ${prova} p${np} não renderizou`); continue; }
  const [W, H] = dim.split('x').map(Number);
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  if (!shot?.result?.data) continue;

  const img = await loadImage(Buffer.from(shot.result.data, 'base64'));

  for (const t of daPagina) {
    /* PDF conta o y de baixo para cima; a imagem, de cima para baixo */
    const px = x => Math.max(0, Math.round(x * ESCALA));
    const py = y => Math.max(0, Math.round((t.alturaPag - y) * ESCALA));
    const x0 = px(t.x0), x1 = Math.min(W, px(t.x1));
    const y0 = py(t.yTopo), y1 = Math.min(H, py(t.yBase));
    const w = x1 - x0, h = y1 - y0;
    if (w < 40 || h < 40) continue;
    const cv = createCanvas(w, h);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
    /* Nem todo vão no texto é figura: às vezes é só espaço. Recorte em
       branco na tela é pior que figura nenhuma, porque o aluno fica
       procurando o desenho. Mede-se a tinta de verdade antes de gravar. */
    const pix = ctx.getImageData(0, 0, w, h).data;
    let escuros = 0;
    for (let i = 0; i < pix.length; i += 4) {
      if (pix[i] < 200 && pix[i + 1] < 200 && pix[i + 2] < 200) escuros++;
    }
    const tinta = escuros / (w * h);
    if (tinta < 0.004) { brancos.push(`${t.prova} Q${t.n}`); continue; }

    const nome = `${t.prova}-q${t.n}.png`;
    fs.writeFileSync(path.join(DESTINO, nome), cv.toBuffer('image/png'));
    ligadas.push({ prova: t.prova, n: t.n, arquivo: nome, w, h });
    feitos++;
    process.stdout.write(feitos % 10 === 0 ? String(feitos) : '.');
  }
}

ws.close(); chrome.kill(); srv.close();
/* o Chrome ainda pode estar segurando o perfil por um instante; se não der
   para apagar, não é motivo para perder o trabalho todo */
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* fica para o TEMP */ }

ligadas.sort((a, b) => a.prova.localeCompare(b.prova) || a.n - b.n);
fs.writeFileSync(path.join(RAIZ, 'src/dados/figuras-provas.json'), JSON.stringify(ligadas, null, 1) + '\n', 'utf8');
const porProva = {};
ligadas.forEach(l => (porProva[l.prova] = (porProva[l.prova] || 0) + 1));
console.log(`\n\n✓ ${ligadas.length} figuras em figuras/`);
console.log(JSON.stringify(porProva, null, 1));
if (brancos.length) console.log(`\n${brancos.length} recortes descartados por virem em branco (o vão não era figura):\n  ${brancos.join(' · ')}`);
