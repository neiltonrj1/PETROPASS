/* ============================================================
   Gera o kit visual do PETROPASS em design/, para abrir no
   Claude Design (claude.ai/design) e ajustar a estética.

       npm run design

   Cada arquivo é uma página autocontida que usa o CSS DE VERDADE
   do app (src/shell/estilo.css), sem as fontes embutidas em
   base64 — que são 170 KB e não mudam nada no ajuste visual.
   Assim o que você vê no kit é exatamente o que o app mostra.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DEST = path.join(RAIZ, 'design');
fs.mkdirSync(DEST, { recursive: true });

const cssCompleto = fs.readFileSync(path.join(RAIZ, 'src', 'shell', 'estilo.css'), 'utf8').replace(/^﻿/, '');
/* tira só as @font-face; os fallbacks (system-ui) já estão declarados */
const css = cssCompleto.replace(/@font-face\{[\s\S]*?\}\s*/g, '');

const trilhas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'dados', 'trilhas.json'), 'utf8'));

/* Monta uma página de preview. `tema` = 'claro' | 'escuro' | 'ambos' */
function pagina({ arquivo, grupo, titulo, subtitulo, largura = 900, altura = 600, corpo, tema = 'claro' }) {
  const um = t => `<div class="amostra" data-tema="${t}">
  <div class="amostra-rot">${t === 'escuro' ? 'tema escuro' : 'tema claro'}</div>
  <div class="amostra-tela">${corpo}</div>
</div>`;
  const html = `<!-- @dsCard group="${grupo}" name="${titulo}" subtitle="${subtitulo}" width="${largura}" height="${altura}" -->
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · PETROPASS</title>
<style>
${css}

/* ---- só do kit: molduras para comparar claro e escuro lado a lado ---- */
html,body{background:#DAD8D2;}
.kit{padding:22px;display:grid;gap:18px;}
.kit>h1{font-family:var(--dsp);font-size:1.15rem;font-weight:800;letter-spacing:-.02em;color:#14161A;margin:0;}
.kit>p.leg{font-size:.8rem;color:#5B6068;margin:-10px 0 4px;max-width:60ch;line-height:1.5;}
.amostra{border-radius:16px;overflow:hidden;border:1px solid #C9C6BE;}
.amostra-rot{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;
  padding:6px 12px;background:#EFEEE9;color:#767C84;border-bottom:1px solid #C9C6BE;}
.amostra[data-tema=escuro] .amostra-rot{background:#15181C;color:#767C84;border-color:#262B31;}
.amostra-tela{background:var(--bg);color:var(--ink);padding:20px;}
.linha{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
.nota{font-family:var(--mono);font-size:10.5px;color:var(--muted);margin:0 0 8px;}
</style>
</head>
<body>
<div class="kit">
  <h1>${titulo}</h1>
  <p class="leg">${subtitulo}</p>
  ${tema === 'ambos' ? um('claro') + um('escuro') : um(tema)}
</div>
</body>
</html>
`;
  fs.writeFileSync(path.join(DEST, arquivo), html, 'utf8');
  return { arquivo, titulo, grupo, subtitulo, largura, altura };
}

/* --------------------------------------------------------------- */
const feitos = [];

/* 1. Cores ------------------------------------------------------- */
const TOKENS = [
  ['--bg', 'fundo da tela'], ['--card', 'fundo dos cartões'], ['--chip', 'fundo de etiquetas e blocos'],
  ['--line', 'linhas e bordas'], ['--ink', 'texto principal'], ['--ink2', 'texto secundário'],
  ['--muted', 'texto de apoio'], ['--verde', 'cor primária (botões)'], ['--amarelo', 'acento lima'],
  ['--ok', 'acerto'], ['--err', 'erro'], ['--barra', 'barra superior'],
];
feitos.push(pagina({
  arquivo: 'fundacao-cores.html', grupo: 'Fundação', titulo: 'Cores',
  subtitulo: 'As variáveis que comandam tudo. Mexer numa delas muda o app inteiro — elas ficam no :root de src/shell/estilo.css.',
  largura: 900, altura: 640, tema: 'ambos',
  corpo: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px">
    ${TOKENS.map(([v, d]) => `<div>
      <div style="height:52px;border-radius:10px;border:1px solid var(--line);background:var(${v})"></div>
      <div style="font-family:var(--mono);font-size:10.5px;color:var(--ink);margin-top:6px">${v}</div>
      <div style="font-size:10.5px;color:var(--muted)">${d}</div>
    </div>`).join('')}
  </div>
  <p class="nota" style="margin-top:14px">Cada trilha tem ainda a sua cor de destaque, definida em src/dados/trilhas.json:</p>
  <div class="linha">${trilhas.map(t => `<div style="display:flex;align-items:center;gap:7px;font-size:.78rem;color:var(--ink2)">
    <span style="width:22px;height:22px;border-radius:7px;background:${t.cor};border:1px solid var(--line)"></span>${t.icone} ${t.curto}</div>`).join('')}</div>`,
}));

/* 2. Tipografia -------------------------------------------------- */
feitos.push(pagina({
  arquivo: 'fundacao-tipografia.html', grupo: 'Fundação', titulo: 'Tipografia',
  subtitulo: 'Archivo nos títulos, Instrument Sans no texto, JetBrains Mono nos números e etiquetas. O tamanho-base é ajustável pelo usuário em Ajustes (13 a 22 px).',
  largura: 900, altura: 560,
  corpo: `<div class="card">
    <h2>Título de cartão — h2</h2>
    <h3>Subtítulo — h3</h3>
    <p style="font-size:.88rem;line-height:1.6;color:var(--ink)">Texto corrido de lição. É o tamanho em que o
      aluno lê por uma hora seguida, então a altura de linha é generosa e o contraste, alto.</p>
    <p class="hint">Texto de apoio (.hint) — explica sem competir com o conteúdo.</p>
    <p style="font-family:var(--mono);font-size:.8rem;color:var(--ink2)">Mono 0123456789 · usado em números, etiquetas e no cronômetro</p>
    <span class="chip">Módulo 1</span> <span class="chip contorno">6 de prova</span>
    <span class="origem" style="margin-left:8px">Cesgranrio 2018, Q26</span>
  </div>`,
}));

/* 3. Botões ------------------------------------------------------ */
feitos.push(pagina({
  arquivo: 'componentes-botoes.html', grupo: 'Componentes', titulo: 'Botões',
  subtitulo: 'Primário para a ação principal da tela, secundário para as demais, destrutivo só em Ajustes.',
  largura: 900, altura: 480, tema: 'ambos',
  corpo: `<div class="card">
    <p class="nota">um por linha</p>
    <button class="btn btn-p" style="width:100%">▶ Continuar: Módulo 3 — Curvas TTT e martensita</button>
    <div class="row" style="margin-top:9px">
      <button class="btn btn-s">☀ Manhã feita</button>
      <button class="btn btn-s">🌙 Noite feita</button>
    </div>
    <div class="row" style="margin-top:9px">
      <button class="btn btn-p">Salvar data</button>
      <button class="btn btn-s">Limpar</button>
    </div>
    <button class="btn btn-d" style="width:100%;margin-top:9px">Recomeçar tudo do zero</button>
    <p style="margin-top:12px"><button class="link">Criar uma conta</button> · <button class="link">Esqueci a senha</button></p>
  </div>`,
}));

/* 4. Cartões e listas -------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-cartoes.html', grupo: 'Componentes', titulo: 'Cartões, indicadores e listas',
  subtitulo: 'O cartão é a unidade de tudo no app. Os indicadores (tiles) abrem a tela inicial; a lista é como se navega pelas apostilas.',
  largura: 900, altura: 720, tema: 'ambos',
  corpo: `<div class="card">
    <h2>Olá, Neilton · Semana 1 · Fase F1</h2>
    <div class="tiles">
      <div class="tile"><div class="n">7</div><div class="l">dias seguidos</div></div>
      <div class="tile"><div class="n">44%</div><div class="l">do plano</div></div>
      <div class="tile"><div class="n">83/110</div><div class="l">questões feitas</div></div>
      <div class="tile"><div class="n">76%</div><div class="l">de acerto</div></div>
    </div>
    <div class="pbar"><div class="pfill" style="width:44%"></div></div>
  </div>
  <div class="card">
    <h2>Circuitos, Máquinas e Instalações</h2>
    <p class="hint" style="margin:-6px 0 10px">Bloco 1 · a base que sustenta o resto da prova</p>
    <div class="list">
      <button><span class="chip">Módulo 1</span><span class="chip contorno">6 de prova</span><span class="dot" style="background:var(--amarelo)"></span>
        <div style="margin-top:5px">Circuitos em corrente alternada: fasores, impedância, potência e fator de potência</div></button>
      <button><span class="chip">Módulo 2</span><span class="chip contorno">4 de prova</span>
        <div style="margin-top:5px">Transformadores: ligações, defasagem, autotransformador e três enrolamentos</div>
        <div class="sub">12 respondidas · 75% de acerto</div>
        <div class="pbar"><div class="pfill" style="width:60%"></div></div></button>
    </div>
  </div>`,
}));

/* 5. Escolha da prova -------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-trilhas.html', grupo: 'Componentes', titulo: 'Escolha da prova',
  subtitulo: 'A primeira tela de quem entra. É o componente mais novo do app e o que mais define a identidade da versão 4.',
  largura: 900, altura: 660, tema: 'ambos',
  corpo: `<div class="card">
    <h2>Qual prova você vai fazer?</h2>
    <p class="hint" style="margin-top:0">O app se ajusta inteiro à sua escolha: as apostilas, o treino, o cronograma
      de 16 semanas e o gráfico do que mais cai passam a ser os da prova escolhida.</p>
    <div class="trilhas">${trilhas.map((t, i) => `<button class="trilha-card${i === 1 ? ' on' : ''}" style="--tc:${t.cor}">
      <span class="ic">${t.icone}</span>
      <span class="tx">
        <span class="nm">${t.curto}</span>
        <span class="dc">${t.sub}</span>
        <span class="mt">${10 + i} módulos · ${40 + i * 20} questões de prova · ${2 + (i % 3)} provas anteriores</span>
      </span></button>`).join('')}</div>
  </div>`,
}));

/* 6. Avisos ------------------------------------------------------ */
feitos.push(pagina({
  arquivo: 'componentes-avisos.html', grupo: 'Componentes', titulo: 'Avisos',
  subtitulo: 'Três níveis: confirmação, atenção e erro. Usados no feedback das questões, nas figuras e na contagem regressiva.',
  largura: 900, altura: 480, tema: 'ambos',
  corpo: `<div class="card">
    <div class="aviso a-ok"><b>Você está exatamente no ritmo do plano.</b> Siga assim.</div>
    <div class="aviso a-warn"><b>Você está 2 semanas atrás do ritmo.</b> Para chegar na prova com o plano fechado,
      precisa cobrir cerca de <b>1,4 semanas do plano por semana real</b>.</div>
    <div class="aviso a-err"><b>Reta final.</b> Nada de conteúdo novo: só revisão do caderno de erros,
      flashcards e simulados cronometrados.</div>
  </div>`,
}));

/* 7. Quiz -------------------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-quiz.html', grupo: 'Componentes', titulo: 'Questão comentada',
  subtitulo: 'O coração do treino: alternativa marcada, correta, apagadas, e o bloco de resolução com os pontos de atenção.',
  largura: 900, altura: 900, tema: 'ambos',
  corpo: `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button class="btn btn-s" style="padding:7px 10px">←</button>
      <div style="flex:1;font-size:.74rem;color:var(--ink2)">Circuitos, Máquinas e Instalações · 3/26</div>
      <div style="font-size:.74rem;font-weight:700">✔ 2 · ✘ 0</div>
    </div>
    <div class="pbar" style="margin-bottom:13px"><div class="pfill" style="width:11%"></div></div>
    <span class="origem">Cesgranrio 2011, Q42 (Elétrica)</span>
    <div class="enun">Em um motor de indução, a função da resistência de aquecimento é</div>
    <button class="alt apagada"><span class="letra">A</span><span>proteger o enrolamento do rotor contra sobrecarga.</span></button>
    <button class="alt errada"><span class="letra">B</span><span>proteger o enrolamento do estator do motor para evitar sobrecarga do equipamento.</span></button>
    <button class="alt apagada"><span class="letra">C</span><span>aumentar o torque de partida do motor, de modo a atender cargas com grande inércia.</span></button>
    <button class="alt apagada"><span class="letra">D</span><span>reduzir a corrente de partida do motor acima de 5 CV.</span></button>
    <button class="alt correta"><span class="letra">E</span><span>impedir a condensação de água no motor, quando ele se encontrar instalado em locais úmidos.</span></button>
    <div class="fb fb-err">
      <h4 style="color:var(--err)">✘ Você marcou B — está errada</h4>
      <div>Quem protege contra sobrecarga é o relé térmico (função 49), que atua desligando, não aquecendo.</div>
      <div class="sec"><h4 style="color:var(--ok)">✔ A correta é a letra E</h4>
        <div>A resistência de aquecimento é energizada com o motor PARADO. Ela mantém o interior alguns graus
          acima da temperatura ambiente, para o ar não chegar ao ponto de orvalho.</div></div>
    </div>
    <div class="pontos"><h4>⚠ PONTOS DE ATENÇÃO</h4><ul>
      <li>A resistência liga com o motor desligado e desliga quando ele parte.</li>
      <li>O inimigo combatido é a condensação sobre o isolamento, não o frio.</li>
    </ul></div>
  </div>`,
}));

/* 8. Questão de prova -------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-questao-prova.html', grupo: 'Componentes', titulo: 'Questão de prova anterior',
  subtitulo: 'Versão enxuta, sem comentário: aparece dentro da lição, na aba "De prova", com o gabarito oculto até o toque.',
  largura: 900, altura: 560, tema: 'ambos',
  corpo: `<p class="hint">Questões que já caíram sobre este assunto, com o gabarito oficial da banca.</p>
  <div class="qprova">
    <span class="origem">Eng. Jr — Elétrica · 2018 · Q33</span>
    <div class="enun">Um equipamento possui como valores nominais de potência e tensão, respectivamente, 20 MVA e
      500 kV. Os valores de base adotados no setor onde esse equipamento se encontra são 2,5 MVA e 250 kV.
      Sabendo-se que a reatância desse equipamento, para seus valores nominais, é de 0,3 pu, o novo valor será de</div>
    <div class="altp"><span class="letra">A</span><span>0,15</span></div>
    <div class="altp"><span class="letra">B</span><span>0,20</span></div>
    <div class="altp"><span class="letra">C</span><span>0,25</span></div>
    <div class="altp"><span class="letra">D</span><span>0,30</span></div>
    <div class="altp"><span class="letra">E</span><span>0,35</span></div>
    <button class="btn btn-s" style="margin-top:8px">Ver gabarito</button>
    <div class="resp"><b>Gabarito oficial: letra A</b><br><span style="font-size:.8rem">0,15</span></div>
  </div>`,
}));

/* 9. Gráfico de incidência --------------------------------------- */
const BARRAS = [
  ['Arranjo físico, capacidade, balanceamento', 17.6], ['Estratégia de operações, competitividade', 14.9],
  ['Ergonomia, organização do trabalho', 13.5], ['Planejamento e controle da produção', 12.2],
  ['Pesquisa operacional, estatística', 9.5], ['Custos, custeio, ponto de equilíbrio', 6.8],
];
feitos.push(pagina({
  arquivo: 'componentes-incidencia.html', grupo: 'Componentes', titulo: 'Gráfico "o que mais cai"',
  subtitulo: 'Contagem real das questões das provas anteriores da trilha, classificadas por assunto. Cada barra abre o módulo.',
  largura: 900, altura: 460, tema: 'ambos',
  corpo: `<div class="card"><h2>O que mais cai na prova (Produção)</h2>
    ${BARRAS.map(([t, v]) => `<div class="bar-row"><div class="t">${t}</div>
      <div class="bar-tr"><div class="bar-fl" style="width:${(v / 17.6 * 100).toFixed(0)}%"></div></div>
      <div>${String(v).replace('.', ',')}%</div></div>`).join('')}
    <p class="hint">Contagem feita sobre 74 questões reais das provas Cesgranrio 2011 e 2018.</p></div>`,
}));

/* 10. Leitor ----------------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-leitor.html', grupo: 'Componentes', titulo: 'Leitor de lição',
  subtitulo: 'Cabeçalho, abas e a página de conteúdo — onde o aluno passa a maior parte do tempo, e onde a caneta escreve por cima.',
  largura: 900, altura: 760, tema: 'ambos',
  corpo: `<div id="leitorHead">
    <button class="btn btn-s" style="padding:8px 11px">←</button>
    <div class="tt">Módulo 1 — Circuitos em corrente alternada: fasores, impedância e potência</div>
  </div>
  <div class="abas">
    <button class="on">Lição</button><button>Figuras 1</button><button>De prova 6</button><button>Gabarito</button>
  </div>
  <div id="pagewrap"><div id="page">
    <p><strong>2. As três potências.</strong> A potência complexa <strong>S = P + jQ</strong> reúne as três grandezas:</p>
    <div class="tw"><table>
      <thead><tr><th>Grandeza</th><th>Símbolo</th><th>Unidade</th></tr></thead>
      <tbody>
        <tr><td><strong>Ativa</strong></td><td>P = V·I·cos φ</td><td>W</td></tr>
        <tr><td><strong>Reativa</strong></td><td>Q = V·I·sen φ</td><td>var</td></tr>
        <tr><td><strong>Aparente</strong></td><td>S = V·I</td><td>VA</td></tr>
      </tbody></table></div>
    <p><strong>Pegadinha frequente:</strong> potência aparente é soma vetorial, não aritmética — 3 kW com 4 kvar
      dão 5 kVA, não 7.</p>
  </div></div>`,
}));

/* 11. Barra lateral ---------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-lateral.html', grupo: 'Componentes', titulo: 'Barra lateral (desktop)',
  subtitulo: 'A navegação do computador e do tablet deitado. No celular ela vira a barra de abas do topo.',
  largura: 420, altura: 720, tema: 'ambos',
  corpo: `<div style="width:238px;background:var(--card);border:1px solid var(--line);border-radius:14px;
      padding:20px 13px 13px;display:flex;flex-direction:column;gap:0;min-height:600px">
    <div class="sbrand"><span>PETRO</span><i></i><span class="l">PASS</span><button>◐</button></div>
    <button class="strilha"><span class="ic">⚡</span><span class="tx">
      <span class="nm">Elétrica</span><span class="tr">trocar de prova</span></span></button>
    <nav class="snav">
      <button class="on"><em>01</em><span>Início</span><b>76%</b></button>
      <button><em>02</em><span>Estudar</span><b>19</b></button>
      <button><em>03</em><span>Treinar</span><b>29</b></button>
      <button><em>04</em><span>Provas</span><b>4</b></button>
      <button><em>05</em><span>Plano</span><b>44%</b></button>
      <button><em>06</em><span>Notas</span><b>7</b></button>
      <button><em>07</em><span>Ajustes</span><b></b></button>
    </nav>
    <div class="sgap"></div>
    <div class="sstreak">
      <div><span class="n">7</span><span class="u">dias seguidos</span></div>
      <div class="g"><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i class="f"></i><i></i><i></i></div>
      <div class="h">Semana 6 de 16 · 44% do plano</div>
    </div>
    <button class="sperfil"><span class="av">NE</span><span class="tx">
      <span class="nm">neilton</span><span class="st">✓ salvo</span></span></button>
  </div>`,
}));

/* 12. Figuras ---------------------------------------------------- */
feitos.push(pagina({
  arquivo: 'componentes-figuras.html', grupo: 'Componentes', titulo: 'Figura interativa',
  subtitulo: 'Desenho em SVG feito na hora, com controles deslizantes e a leitura do resultado embaixo. Funciona offline.',
  largura: 900, altura: 640, tema: 'ambos',
  corpo: `<div class="figbox">
    <h3>Triângulo de potências e correção do fator de potência</h3>
    <div class="fd">Mexa no fator de potência e veja o banco de capacitores que a instalação precisa.</div>
    <div class="corpo">
      <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg">
        <line x1="60" y1="250" x2="430" y2="250" stroke="var(--line)"/>
        <line x1="60" y1="250" x2="60" y2="20" stroke="var(--line)"/>
        <polygon points="60,250 360,250 360,140" fill="#e5393520"/>
        <line x1="60" y1="250" x2="360" y2="250" stroke="#118A52" stroke-width="3"/>
        <line x1="360" y1="250" x2="360" y2="140" stroke="#e53935" stroke-width="3"/>
        <line x1="60" y1="250" x2="360" y2="140" stroke="#1e88e5" stroke-width="3"/>
        <text x="190" y="266" font-size="11" fill="#118A52">P = 100 kW</text>
        <text x="366" y="196" font-size="11" fill="#e53935">Q = 102 kvar</text>
        <text x="160" y="186" font-size="11" fill="#1e88e5">S = 143 kVA</text>
      </svg></div>
      <div class="ctrls">
        <label class="fsl"><span>Potência ativa P: <b>100 kW</b></span><input type="range" min="10" max="200" value="100"></label>
        <label class="fsl"><span>Fator de potência da carga: <b>70%</b></span><input type="range" min="50" max="100" value="70"></label>
        <label class="fsl"><span>Corrigir para: <b>92%</b></span><input type="range" min="80" max="100" value="92"></label>
      </div>
      <div class="fdados">
        <div class="aviso a-ok"><b>Banco de capacitores necessário:</b> 59,4 kvar.</div>
      </div>
    </div>
  </div>`,
}));

console.log(`✓ ${feitos.length} páginas geradas em design/\n`);
feitos.forEach(f => console.log(`  ${f.grupo.padEnd(12)} ${f.titulo.padEnd(34)} ${f.arquivo}`));
console.log('\nPara enviar ao Claude Design, peça ao Claude Code — ou abra os arquivos direto no navegador.');
