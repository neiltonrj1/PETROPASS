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
const semTarefa = [];               // questões que nem chegaram a ter um recorte planejado

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

    /* Um número solto entre 21 e 70 no meio do enunciado NÃO é marcador de
       questão — é um dado ("40 °C", "55 mm"). O marcador de verdade fica
       sempre na margem da coluna, sempre no mesmo x. Então: junta os
       candidatos, descobre quais x se repetem (as colunas) e só aceita
       quem estiver ali. Sem isso, um número no texto virava início de
       questão e o recorte saía do lugar — ou nem era planejado.       */
    const candidatos = it
      .filter(i => /^\d{1,3}$/.test(i.s.trim()) && +i.s.trim() >= p.ini && +i.s.trim() <= p.ate)
      .map(i => ({ n: +i.s.trim(), y: i.y, x: i.x }));
    if (!candidatos.length) continue;

    const freq = new Map();
    candidatos.forEach(c => freq.set(c.x, (freq.get(c.x) || 0) + 1));
    const colunas = [...freq.entries()].filter(([, n]) => n >= 2).map(([x]) => x).sort((a, b) => a - b);
    const marcas = (colunas.length ? candidatos.filter(c => colunas.some(x => Math.abs(c.x - x) <= 2)) : candidatos)
      /* a mesma questão só pode começar uma vez na página: fica a de cima */
      .sort((a, b) => a.n - b.n || b.y - a.y)
      .filter((m, i, arr) => i === 0 || arr[i - 1].n !== m.n);
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

      const x0 = esquerda ? xs[0] - MARGEM : xs[xs.length - 1] - MARGEM;

      /* O ENUNCIADO INTEIRO como saiu no caderno, do marcador até a
         primeira alternativa: é a rede de segurança. Sempre existe, é a
         imagem original da prova, e serve tanto quando não há vão
         isolável quanto quando o recorte do vão sai em branco.        */
      /* Preferência: parar na primeira alternativa, que deixa o recorte
         limpo. Mas se o enunciado for curto, o desenho está DEPOIS das
         alternativas ou na continuação — então o recorte vai até o
         marcador da questão seguinte, pegando o bloco inteiro. É feio ter
         a alternativa repetida na imagem, e é melhor que não ter figura. */
      const primeiraAlt = it
        .filter(t => /^\(?A\)/.test(t.s.trim()) && t.y < alvo.y && t.y > fim
          && (t.x < meio + larguraCol * 0.55) === esquerda)
        .sort((a, b) => b.y - a.y)[0];
      const ateAlt = primeiraAlt ? primeiraAlt.y + 4 : null;
      /* parar 14 pontos acima do próximo marcador: 4 deixava vazar a
         primeira linha da questão seguinte para dentro do recorte */
      const baseBloco = (ateAlt !== null && alvo.y - ateAlt >= 60) ? ateAlt : fim + 14;
      const temBloco = alvo.y - baseBloco >= 60;

      const comum = {
        prova: p.id, pdfRel: p.pdf, pagina: np, n: alvo.n,
        x0, x1: x0 + larguraCol + MARGEM * 2, alturaPag: vp.height,
        ...(temBloco ? { blocoTopo: alvo.y + 12, blocoBase: baseBloco } : {}),
      };

      if (melhor) tarefas.push({ ...comum, yTopo: melhor.topo - 6, yBase: melhor.base + 6, tipo: 'figura' });
      else if (temBloco) tarefas.push({ ...comum, yTopo: comum.blocoTopo, yBase: comum.blocoBase, tipo: 'bloco' });
      else semTarefa.push(`${p.id} Q${alvo.n}`);
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

    /* Tenta o recorte planejado; se vier em branco (o vão não era figura),
       tenta o enunciado inteiro antes de desistir. Desistir deixava a
       questão sem imagem nenhuma, que é justamente a reclamação.      */
    const tentativas = [{ topo: t.yTopo, base: t.yBase, tipo: t.tipo }];
    if (t.tipo === 'figura' && t.blocoTopo) tentativas.push({ topo: t.blocoTopo, base: t.blocoBase, tipo: 'bloco' });

    let gravou = false;
    for (const tent of tentativas) {
      const x0 = px(t.x0), x1 = Math.min(W, px(t.x1));
      const y0 = py(tent.topo), y1 = Math.min(H, py(tent.base));
      const w = x1 - x0, h = y1 - y0;
      if (w < 40 || h < 40) continue;
      const cv = createCanvas(w, h);
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, x0, y0, w, h, 0, 0, w, h);
      /* Recorte em branco na tela é pior que figura nenhuma: o aluno fica
         procurando um desenho que não existe. Mede-se a tinta de verdade. */
      const pix = ctx.getImageData(0, 0, w, h).data;
      let escuros = 0;
      for (let i = 0; i < pix.length; i += 4) {
        if (pix[i] < 200 && pix[i + 1] < 200 && pix[i + 2] < 200) escuros++;
      }
      if (escuros / (w * h) < 0.004) continue;

      const nome = `${t.prova}-q${t.n}.png`;
      fs.writeFileSync(path.join(DESTINO, nome), cv.toBuffer('image/png'));
      ligadas.push({ prova: t.prova, n: t.n, arquivo: nome, w, h, tipo: tent.tipo });
      feitos++; gravou = true;
      break;
    }
    if (!gravou) { brancos.push(`${t.prova} Q${t.n}`); continue; }
    process.stdout.write(feitos % 10 === 0 ? String(feitos) : '.');
  }
}

ws.close(); chrome.kill(); srv.close();
/* o Chrome ainda pode estar segurando o perfil por um instante; se não der
   para apagar, não é motivo para perder o trabalho todo */
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* fica para o TEMP */ }

/* Rodar com `node extrair-figuras.mjs <prova>` só processa AQUELA prova —
   mas escrever só o resultado desta rodada apagaria do índice as figuras
   de todas as outras provas já extraídas antes. Por isso funde com o que
   já existe: as entradas desta rodada substituem as da(s) mesma(s) prova(s)
   processada(s) agora; as de qualquer outra prova ficam como estavam.    */
const arqIndice = path.join(RAIZ, 'src/dados/figuras-provas.json');
const provasProcessadas = new Set(tarefas.map(t => t.prova));
const antigas = fs.existsSync(arqIndice) ? JSON.parse(fs.readFileSync(arqIndice, 'utf8')) : [];
const mantidas = antigas.filter(l => !provasProcessadas.has(l.prova));
ligadas.push(...mantidas);
ligadas.sort((a, b) => a.prova.localeCompare(b.prova) || a.n - b.n);
fs.writeFileSync(arqIndice, JSON.stringify(ligadas, null, 1) + '\n', 'utf8');
const porProva = {};
ligadas.forEach(l => (porProva[l.prova] = (porProva[l.prova] || 0) + 1));
console.log(`\n\n✓ ${ligadas.length} figuras em figuras/`);
console.log(JSON.stringify(porProva, null, 1));
if (brancos.length) console.log(`\n${brancos.length} recortes descartados por virem em branco:\n  ${brancos.join(' · ')}`);
if (semTarefa.length) console.log(`\n${semTarefa.length} questões sem recorte planejado (marcador ou alternativa não localizados):\n  ${semTarefa.join(' · ')}`);
