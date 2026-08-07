/* ===================================================================
   QUESTÃO INTERATIVA

   Uma peça só, usada na aba de questões da lição e nos simulados das
   provas anteriores. Tudo o que antes estava espalhado em três abas
   — enunciado, gabarito e resolução passo a passo — acontece aqui,
   junto da questão que a resolução resolve.

   Ordem em que as coisas aparecem:
     enunciado → rascunho (opcional) → dicas (sob demanda) →
     alternativas → correção → por que a certa é certa →
     por que as outras erram → resolução passo a passo → o que memorizar
   =================================================================== */

const LETRAS = ['A','B','C','D','E'];

/* Cada questão tem uma chave estável, que serve para guardar resposta,
   rascunho e nível de dica já revelado.                              */
function qid(fonte, q){ return fonte + ':' + q.n; }

/* --------- resolução passo a passo vinda do catálogo de cálculos --------- */
/* O catálogo identifica a questão pela origem ("Cesgranrio 2014, Q28"). */
function calculoDaQuestao(modId, origem){
  if(!origem) return null;
  const chave = (origem.match(/(\d{4})[^0-9]*Q\s*(\d{1,3})/i)||[]).slice(1,3).join('/');
  if(!chave) return null;
  return CALCULOS.find(c => {
    if(c.mod !== modId) return false;
    const k = (String(c.orig||'').match(/(\d{4})[^0-9]*Q\s*(\d{1,3})/i)||[]).slice(1,3).join('/');
    return k && k === chave;
  }) || null;
}

/* --------- separa a explicação em "a certa" e "as erradas" --------- */
/* O material escreve primeiro a justificativa e depois analisa as
   alternativas erradas, sempre começando por "(A)", "(B)"…          */
function partesDaExplicacao(txt){
  if(!txt) return {certa:'', erradas:''};
  const m = txt.match(/([.;:]\s*|<\/p>\s*)(\(?[A-E]\)?[),]?\s*(?:e\s*\(?[A-E]\)?\s*)?(?:erra|falha|inverte|troca|confunde|descreve|vale|mantém|não|é o|são|desc|aplica|apenas))/i);
  if(!m || m.index < 40) return {certa:txt, erradas:''};
  const corte = m.index + m[1].length;
  return {certa: txt.slice(0, corte).trim(), erradas: txt.slice(corte).trim()};
}

/* --------- dicas progressivas --------- */
/* Escondem a resposta: a letra é sempre mascarada. Quando a questão
   tem resolução passo a passo, cada passo vira uma dica — é o caso em
   que a dica realmente "completa o raciocínio".                      */
function mascara(t){
  return String(t||'')
    .replace(/\bletra\s+[A-E]\b/gi, 'letra ▮')
    .replace(/\balternativa\s+[A-E]\b/gi, 'alternativa ▮')
    .replace(/\bresposta\s+(é\s+)?[A-E]\b/gi, 'resposta ▮');
}
function primeirasFrases(txt, n){
  const limpo = String(txt||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const frases = limpo.split(/(?<=[.!?])\s+/);
  return frases.slice(0, n).join(' ');
}
function dicasDe(q, mod){
  const calc = calculoDaQuestao(mod.id, q.origem);
  if(calc && calc.passos && calc.passos.length){
    const d = [{t:'Como atacar', c:`<p>${esc(calc.en||'')}</p>` +
      (calc.dados&&calc.dados.length ? `<p><b>Do enunciado você tira:</b></p><ul>${calc.dados.map(x=>`<li>${x}</li>`).join('')}</ul>` : '')}];
    calc.passos.forEach((p,i) => d.push({
      t: 'Passo ' + (i+1),
      c: `<p>${p.t}</p>` + (p.f ? `<div class="mline">${p.f}</div>` : '')
    }));
    return d;
  }
  /* Sem resolução escrita, a dica só vale se sair da explicação real da
     questão. Dica genérica ("releia o enunciado") queima o mecanismo:
     o aluno abre duas vezes, vê que é vazio e nunca mais abre.       */
  const p = partesDaExplicacao(q.explica);
  const dicas = [];
  const inicio = primeirasFrases(p.certa, 1);
  if(inicio && inicio.length > 40) dicas.push({t:'Por onde começar', c:`<p>${esc(mascara(inicio))}</p>`});
  const resto = primeirasFrases(p.certa, 3);
  if(resto && resto.length > inicio.length + 40) dicas.push({t:'Quase lá', c:`<p>${esc(mascara(resto))}</p>`});
  return dicas;
}

/* =================== a peça =================== */
/* fonte  — prefixo da chave de estado ('licao:v1m2' ou o id da prova)
   q      — a questão
   mod    — o módulo (para o título das dicas e o catálogo de cálculos)
   pos    — posição na lista, para o rótulo "Q3 de 11"                 */
function questaoHTML(fonte, q, mod, pos, total){
  const id = qid(fonte, q);
  const R = S.quiz[fonte] = S.quiz[fonte] || {};
  const resp = R[q.n];
  const respondida = resp !== undefined;
  const acertou = resp === q.correta;
  const dicas = dicasDe(q, mod);
  const nivel = S.dicas[id] || 0;
  const calc = calculoDaQuestao(mod.id, q.origem);
  const rascunho = S.rascunho[id] || '';
  /* As questões comentadas trazem o motivo de CADA distrator separado em
     `erradas`. As outras só têm um texto corrido, de onde a divisão é
     inferida por regex. Onde existe o dado real, ele ganha do palpite. */
  const temErradas = q.erradas && typeof q.erradas === 'object';
  const p = temErradas ? {certa: esc(q.explica), erradas: ''} : partesDaExplicacao(q.explica);

  const errosAntes = errosDaQuestao(fonte, q, respondida);
  /* No caderno comentado o `n` é só a posição no arquivo (0,1,2…), não o
     número da questão na prova — esse já vem escrito na origem. Mostrar
     "Q5" ao lado de "Cesgranrio 2018, Q30" só confundia.             */
  const ehCaderno = !!(DATA.quizzes && DATA.quizzes[fonte]);
  const rotulo = [ehCaderno ? '' : 'Q'+q.n, total ? `${pos+1} de ${total}` : ''].filter(Boolean).join(' · ');
  let h = `<article class="qz" id="q_${id.replace(/[^\w]/g,'_')}">
    <header class="qz-cab">
      ${q.origem ? `<span class="origem">${esc(q.origem)}</span>` : ''}
      <span class="qz-pos">${rotulo}</span>
      ${errosAntes ? `<span class="qz-hist" title="quantas vezes você já errou esta questão">✘ ${errosAntes}× antes</span>` : ''}
      ${respondida ? `<span class="qz-sel ${acertou?'ok':'nao'}">${acertou?'✔ acertou':'✘ errou'}</span>` : ''}
    </header>
    <div class="enun">${esc(q.q)}</div>`;

  /* rascunho e dicas só antes de responder — depois viram ruído */
  if(!respondida){
    const liberada = podePedirDica(id, nivel);
    h += `<div class="qz-ferramentas">
      <button class="qz-fbt" onclick="alternaRascunho('${id}')">✏️ ${rascunho? 'Meu rascunho' : 'Rascunhar aqui'}</button>
      ${dicas.length ? (nivel>=dicas.length
        ? `<button class="qz-fbt" disabled>💡 Dicas esgotadas</button>`
        : `<button class="qz-fbt" ${liberada?`onclick="pedeDica('${id}',${dicas.length})"`:'disabled'}>💡 ${
            nivel===0 ? 'Travei — pedir dica' : `Próxima dica (${nivel} de ${dicas.length})`}</button>`) : ''}
      ${dicas.length && nivel>0 && nivel<dicas.length && !liberada
        ? `<span class="qz-trava">descarte uma alternativa ou comece o rascunho para liberar a próxima</span>` : ''}
    </div>
    <div class="qz-rascunho ${rascunho||S._rasc===id?'':'hide'}" id="rasc_${id.replace(/[^\w]/g,'_')}">
      <textarea placeholder="Escreva aqui o seu raciocínio, os dados que tirou do enunciado, a conta…"
        oninput="salvaRascunho('${id}', this.value)">${esc(rascunho)}</textarea>
      <p class="hint">Fica salvo com a questão. Escrever antes de olhar as alternativas é o que mais separa quem aprende de quem só reconhece.</p>
    </div>`;
  }

  if(nivel > 0){
    const fechadas = !!S.dicasFechadas[id];
    h += `<div class="qz-dicas${fechadas?' recolhida':''}">
      <button class="qz-dfecha" onclick="fechaDicas('${id}')">
        ${fechadas ? `▸ ${nivel} ${nivel===1?'dica aberta':'dicas abertas'} — mostrar de novo` : '▾ esconder as dicas'}
      </button>
      ${fechadas ? '' : `
        ${dicas.slice(0, nivel).map((d,i) => `<div class="qz-dica">
          <span class="qz-dnum">${i+1}</span><div><b>${esc(d.t)}</b>${d.c}</div></div>`).join('')}
        ${nivel < dicas.length && !respondida ? `<button class="qz-fbt" onclick="pedeDica('${id}',${dicas.length})">Ainda travado — mais uma dica</button>` : ''}`}
    </div>`;
  }

  /* Questão que perdeu tabela ou lista de afirmativas na conversão do
     caderno não pode valer erro: marcar no escuro e levar um "✘" ensina
     ao aluno que ele não sabe um assunto que ele talvez saiba.        */
  if(q.aviso) h += avisoIncompleta(q, mod);
  const travada = q.aviso === 'alternativas-iguais' || q.aviso === 'itens-ausentes' || q.aviso === 'marcador-de-figura';

  const riscadas = S.risca[id] || [];
  h += `<div class="qz-alts${travada?' qz-travada':''}">`;
  for(const L of LETRAS){
    if(!(L in q.alts)) continue;
    let cls = 'alt';
    if(respondida) cls += (L===q.correta) ? ' correta' : (L===resp ? ' errada' : ' apagada');
    else if(travada) cls += ' apagada';
    else if(riscadas.includes(L)) cls += ' riscada';
    h += `<div class="alt-linha">
      <button class="${cls}" ${(respondida||travada)?'disabled':`onclick="respondeQuestao('${fonte}',${q.n},'${L}')"`}>
        <span class="letra">${L}</span><span>${esc(q.alts[L])}</span></button>
      ${(respondida||travada)?'':`<button class="alt-risca" title="descartar esta alternativa"
        onclick="riscaAlt('${id}','${L}')">${riscadas.includes(L)?'↺':'✕'}</button>`}
    </div>`;
  }
  h += `</div>`;
  if(travada) h += `<div class="qz-bloco"><h4>✔ O gabarito oficial é a letra ${q.correta}</h4>
    <div>${p.certa || esc(q.alts[q.correta]||'')}</div></div>`;

  if(respondida){
    h += `<div class="qz-resp">
      <div class="qz-bloco ${acertou?'bom':'ruim'}">
        <h4>${acertou ? '✔ Acertou — gabarito: letra '+q.correta : '✘ Você marcou '+resp+'. O gabarito é a letra '+q.correta}</h4>
        <div>${p.certa || `<b>${q.correta})</b> ${esc(q.alts[q.correta]||'')}`}</div>
        ${historicoHTML(fonte, q)}
      </div>`;
    if(temErradas){
      /* Primeiro a alternativa que ELE marcou: é a única que ele já se
         comprometeu a defender, e é onde a correção pega.             */
      const minha = !acertou && q.erradas[resp];
      if(minha) h += `<div class="qz-bloco atencao"><h4>⚠ Por que a letra ${resp} não serve</h4><div>${esc(minha)}</div></div>`;
      const outras = LETRAS.filter(L => L !== q.correta && L !== resp && q.erradas[L]);
      if(outras.length) h += `<div class="qz-bloco atencao"><h4>⚠ Onde a banca derruba nas outras</h4>
        <ul>${outras.map(L => `<li><b>${L})</b> ${esc(q.erradas[L])}</li>`).join('')}</ul></div>`;
    }
    else if(p.erradas) h += `<div class="qz-bloco atencao"><h4>⚠ Onde a banca derruba</h4><div>${p.erradas}</div></div>`;
    /* questão de prova ainda sem comentário escrito: manda para a lição certa */
    if(!q.explica){
      const alvo = q.mod || q.modExplica;
      h += `<div class="qz-bloco atencao">
        <h4>⚠ Esta questão ainda não tem comentário escrito</h4>
        <div>O gabarito acima é o oficial da banca, conferido questão a questão.
        ${alvo ? `O assunto é <b>${esc((findModPorId(alvo)||{t:''}).t)}</b> — vale reler a lição e refazer depois.`
               : 'Anote no seu rascunho por que você errou; isso vale mais que ler um comentário pronto.'}</div>
        ${alvo ? `<button class="btn btn-s" style="margin-top:9px" onclick="abrirModulo('${alvo}')">📖 Abrir a lição deste assunto</button>` : ''}
      </div>`;
    }
    if(q.pontos && q.pontos.length) h += `<div class="qz-bloco atencao"><h4>⚠ Para memorizar</h4>
      <ul>${q.pontos.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
    if(calc) h += blocoResolucao(calc);
    if(rascunho) h += `<div class="qz-bloco"><h4>✏️ O que você escreveu</h4><div class="qz-rasctxt">${esc(rascunho)}</div></div>`;
    h += `<div class="row" style="margin-top:11px">
      ${q.mod || (mod&&mod.id) ? `<button class="btn btn-s" onclick="abrirModulo('${q.mod||mod.id}')">📖 Rever a lição</button>` : ''}
    </div></div>`;
  }
  return h + `</article>`;
}

/* Aviso de questão que chegou incompleta do caderno. Ela continua na tela
   de propósito: sumir com ela esconderia do aluno que aquele assunto cai.
   O que muda é a honestidade — o app diz o que falta em vez de cobrar uma
   resposta que o texto exibido não permite dar.                        */
function avisoIncompleta(q, mod){
  const T = {
    'alternativas-iguais': ['Duas alternativas iguais nesta questão',
      'A conversão do caderno perdeu sinais (normalmente um menos) e duas opções ficaram idênticas. Como está, não há resposta única — por isso ela não conta erro.'],
    'itens-ausentes': ['As afirmativas desta questão não vieram no texto',
      'As alternativas são combinações de I, II, III… mas a lista das afirmativas se perdeu na conversão. Sem ela não há o que comparar, então a questão não conta erro.'],
    'marcador-de-figura': ['Esta questão depende de uma figura do caderno',
      'O enunciado se refere a um desenho que não foi transposto. Ela fica aqui para você saber que o assunto cai, mas não conta erro.'],
    'pede-desenho': ['Esta questão foi escrita para uma figura',
      'O enunciado cita um gráfico, diagrama ou tabela do caderno. Se for um diagrama clássico do assunto — Fe-C, TTT, Schaeffler — você deve saber lê-lo de cabeça, e a aba <b>Figuras</b> tem o desenho.'],
  }[q.aviso];
  if(!T) return '';
  const leve = q.aviso === 'pede-desenho';
  return `<div class="qz-bloco ${leve?'atencao':'falta'}">
    <h4>${leve?'⚠':'✂'} ${T[0]}</h4><div>${T[1]}</div>
    ${!leve && mod && mod.id ? `<button class="btn btn-s" style="margin-top:9px"
      onclick="abrirModulo('${mod.id}','figuras')">📐 Ver as figuras deste módulo</button>` : ''}
  </div>`;
}

/* Linha do tempo das tentativas — uma bolinha por rodada. */
function historicoHTML(fonte, q){
  const t = S.tentativas[qid(fonte,q)] || [];
  if(t.length < 2) return '';
  return `<div class="qz-linha">
    <span class="qz-lt">suas tentativas</span>
    ${t.map(x => `<span class="qz-bola ${x.ok?'ok':'nao'}" title="rodada ${x.r}: marcou ${x.m}">${x.r}</span>`).join('')}
  </div>`;
}

function blocoResolucao(c){
  return `<div class="qz-bloco calculo">
    <h4>🧮 Resolução passo a passo</h4>
    ${c.dados && c.dados.length ? `<div class="dd"><b>Dados:</b><ul>${c.dados.map(d=>`<li>${d}</li>`).join('')}</ul></div>` : ''}
    ${(c.passos||[]).map((p,i)=>`<div class="passo"><div class="num">${i+1}</div><div class="txt">${p.t}
      ${p.f?`<div class="mline">${p.f}</div>`:''}</div></div>`).join('')}
    ${c.resp ? `<div class="aviso a-ok"><b>Resposta:</b> ${esc(c.resp)}</div>` : ''}
    ${c.erro ? `<div class="aviso a-err"><b>Erro clássico:</b> ${c.erro}</div>` : ''}
  </div>`;
}

/* =================== ações =================== */
function riscaAlt(id, L){
  const lista = S.risca[id] || [];
  S.risca[id] = lista.includes(L) ? lista.filter(x=>x!==L) : lista.concat(L);
  save(); render();
}
/* Só libera a segunda dica em diante depois de algum compromisso do
   aluno — uma alternativa descartada ou um rascunho começado. Pedir
   ajuda deixa de ser um clique reflexo e vira passo de raciocínio. */
function podePedirDica(id, nivel){
  if(nivel === 0) return true;
  return (S.risca[id]||[]).length > 0 || (S.rascunho[id]||'').trim().length > 0;
}

function respondeQuestao(fonte, n, L){
  const ctx = achaQuestao(fonte, n); if(!ctx) return;
  const {q, mod} = ctx;
  const id = qid(fonte, q);
  const comApoio = (S.dicas[id]||0) > 0;
  S.quiz[fonte] = S.quiz[fonte] || {};
  S.quiz[fonte][n] = L;
  const certo = L === q.correta;
  registraTentativa(fonte, q, L);
  registraResposta(certo, comApoio);
  const alvo = q.mod || (mod && mod.id);
  /* acertar com dica não estica o intervalo de revisão */
  if(alvo) agendaRevisao(alvo, certo ? (comApoio ? 'apoio' : 'limpa') : 'erro');
  if(L !== q.correta){
    if(!S.erros.some(e => e.vol===fonte && e.qi===n))
      S.erros.push({vol:fonte, qi:n, origem:q.origem||('Q'+n), marcou:L, correta:q.correta,
        ponto:(mod?mod.t:''), motivo:'', d:new Date().toISOString().slice(0,10)});
  } else S.erros = S.erros.filter(e => !(e.vol===fonte && e.qi===n));
  save(); render();
  setTimeout(()=>{ const el=document.querySelector('.qz-resp'); el&&el.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 60);
}
function refazQuestao(fonte, n){
  if(S.quiz[fonte]) delete S.quiz[fonte][n];
  S.erros = S.erros.filter(e => !(e.vol===fonte && e.qi===n));
  save(); render();
}
function pedeDica(id, total){
  S.dicas[id] = Math.min(total, (S.dicas[id]||0) + 1);
  save(); render();
}
/* Fechar as dicas depois de abrir: às vezes a pessoa quer só dar uma
   olhada e voltar a tentar com a tela limpa. O nível fica guardado,
   então reabrir mostra tudo o que já tinha sido revelado.          */
function fechaDicas(id){
  S.dicasFechadas[id] = !S.dicasFechadas[id];
  save(); render();
}

/* ---------------- rodadas ----------------
   Cada passagem completa pelas questões de um módulo é uma rodada.
   O histórico de tentativas fica guardado por questão, então dá para
   ver em qual rodada você acertou e o que continua caindo.        */
function rodadaAtual(fonte){ return S.rodada[fonte] || 1; }
function registraTentativa(fonte, q, marcou){
  const id = qid(fonte, q);
  const lista = S.tentativas[id] || [];
  lista.push({ r: rodadaAtual(fonte), m: marcou, ok: marcou === q.correta, d: hojeISO() });
  S.tentativas[id] = lista;
}
/* `excluiAtual` tira a tentativa que acabou de ser feita — senão o selo
   "✘ 1× antes" aparecia na primeira vez que a pessoa errava, contando
   como passado o erro que ela tinha acabado de cometer.              */
function errosDaQuestao(fonte, q, excluiAtual){
  const t = S.tentativas[qid(fonte,q)] || [];
  return (excluiAtual ? t.slice(0, -1) : t).filter(x => !x.ok).length;
}
/* Questão travada por ter chegado incompleta não entra na conta: senão o
   módulo nunca fecharia e a rodada 2 jamais liberaria. */
function travadaPorFalta(q){
  return q.aviso === 'alternativas-iguais' || q.aviso === 'itens-ausentes' || q.aviso === 'marcador-de-figura';
}
/* Situação da lista inteira: quantas faltam, e o placar de cada rodada. */
function situacao(fonte, todas){
  const R = S.quiz[fonte] || {};
  const qs = (todas || []).filter(q => !travadaPorFalta(q));
  const feitas = qs.filter(q => R[q.n] !== undefined).length;
  const certas = qs.filter(q => R[q.n] === q.correta).length;
  const rodada = rodadaAtual(fonte);
  const placares = [];
  for(let r=1; r<rodada; r++){
    let n=0, ok=0;
    qs.forEach(q => (S.tentativas[qid(fonte,q)]||[]).forEach(t => { if(t.r===r){ n++; if(t.ok) ok++; } }));
    if(n) placares.push({r, n, ok, pct: Math.round(ok/n*100)});
  }
  return {feitas, certas, total:qs.length, completo: feitas===qs.length, rodada, placares};
}
/* Só libera quando todas as questões do módulo foram respondidas. */
function novaRodada(fonte){
  const qs = questoesDaFonte(fonte);
  const s = situacao(fonte, qs);
  if(!s.completo){ toast(`Faltam ${s.total - s.feitas} para fechar o módulo`); return; }
  S.rodada[fonte] = s.rodada + 1;
  qs.forEach(q => { delete S.quiz[fonte][q.n]; delete S.dicas[qid(fonte,q)]; delete S.risca[qid(fonte,q)]; });
  S.erros = S.erros.filter(e => e.vol !== fonte);
  save(true); window.scrollTo(0,0); render();
  toast('Rodada ' + S.rodada[fonte] + ' — as questões voltaram em branco');
}
function questoesDaFonte(fonte){
  if(fonte.startsWith('licao:')){
    const mid = fonte.slice(6);
    for(const v of DATA.conteudo){ const m = v.mods.find(m=>m.id===mid); if(m) return m.qs||[]; }
    return [];
  }
  if(DATA.quizzes[fonte]) return DATA.quizzes[fonte];
  const p = DATA.provas.find(p=>p.id===fonte);
  return p ? p.questoes : [];
}
function alternaRascunho(id){
  S._rasc = (S._rasc===id) ? null : id;
  render();
  const el = document.getElementById('rasc_'+id.replace(/[^\w]/g,'_'));
  const ta = el && el.querySelector('textarea');
  if(ta && S._rasc===id) ta.focus();
}
function salvaRascunho(id, v){ S.rascunho[id] = v; save(); }

/* Acha a questão pela chave da fonte — lição, caderno comentado ou prova. */
function achaQuestao(fonte, n){
  if(fonte.startsWith('licao:')){
    const mid = fonte.slice(6);
    for(const v of DATA.conteudo){
      const mod = v.mods.find(m => m.id === mid);
      if(mod) return {q:(mod.qs||[]).find(q => q.n === n), mod};
    }
    return null;
  }
  if(DATA.quizzes[fonte]){
    const q = DATA.quizzes[fonte][n];
    if(!q) return null;
    return {q, mod: (q.mod && findModPorId(q.mod)) || {id:'', t:(findVol(fonte)||{t:''}).t}};
  }
  const p = DATA.provas.find(p => p.id === fonte);
  if(!p) return null;
  const q = p.questoes.find(q => q.n === n);
  if(!q) return null;
  let mod = null;
  if(q.mod) for(const v of DATA.conteudo){ const m = v.mods.find(m=>m.id===q.mod); if(m){ mod=m; break; } }
  return {q, mod: mod || {id:'', t:'esta prova'}};
}

/* Lista de questões de um módulo, para a aba "Questões" da lição. */
function questoesDoModuloHTML(mod){
  const qs = mod.qs || [];
  if(!qs.length) return mod.questoes || '<p class="hint">Este módulo ainda não tem questões.</p>';
  const fonte = 'licao:' + mod.id;
  const s = situacao(fonte, qs);
  return painelDaRodada(fonte, s, mod) +
    qs.map((q,i) => questaoHTML(fonte, q, mod, i, qs.length)).join('') +
    rodapeDaRodada(fonte, s, mod);
}

/* Cabeçalho com a rodada, o placar e o histórico das anteriores. */
function painelDaRodada(fonte, s, mod){
  return `<div class="qz-topo">
      <div><b>${s.total} questões</b> deste módulo${s.rodada>1?` <span class="qz-rod">rodada ${s.rodada}</span>`:''}</div>
      <div class="qz-placar">${s.feitas ? `${s.certas} de ${s.feitas} · ${Math.round(s.certas/s.feitas*100)}%` : 'nenhuma respondida'}</div>
    </div>
    <div class="pbar" style="margin-bottom:${s.placares.length?'10':'14'}px"><div class="pfill" style="width:${s.feitas/s.total*100}%"></div></div>
    ${s.placares.length ? `<div class="qz-rodadas">
      ${s.placares.map(p => `<span class="qz-rbadge"><b>R${p.r}</b> ${p.pct}%</span>`).join('')}
      <span class="qz-rbadge atual"><b>R${s.rodada}</b> ${s.feitas?Math.round(s.certas/Math.max(1,s.feitas)*100)+'%':'—'}</span>
    </div>` : ''}`;
}

/* Rodapé: fecha o módulo, mostra onde estão os erros e libera a próxima rodada. */
function rodapeDaRodada(fonte, s, mod){
  if(!s.feitas) return '';
  const qs = questoesDaFonte(fonte);
  const piores = qs.map(q => ({q, e: errosDaQuestao(fonte, q)}))
    .filter(x => x.e > 0).sort((a,b) => b.e - a.e).slice(0,5);

  if(!s.completo){
    return `<div class="qz-fim">
      <div class="qz-fim-t">Faltam ${s.total - s.feitas} para fechar o módulo</div>
      <p class="hint" style="margin:4px 0 0">Só dá para começar a rodada 2 depois de responder todas —
        refazer só o que é fácil não mede nada.</p>
    </div>`;
  }
  return `<div class="qz-fim completo">
    <div class="qz-fim-t">✔ Módulo fechado — ${s.certas} de ${s.total} na rodada ${s.rodada}</div>
    ${piores.length ? `
      <div class="qz-fim-sub">Onde você mais tropeça neste módulo</div>
      <div class="qz-piores">${piores.map(x => `<button class="pitem" onclick="vaiPara('q_${qid(fonte,x.q).replace(/[^\\w]/g,'_')}')">
        <span class="bola" style="background:var(--err);opacity:${(0.4+0.6*x.e/piores[0].e).toFixed(2)}"></span>
        <span class="t">Q${x.q.n} · ${esc((x.q.q||'').slice(0,62))}…</span>
        <span class="n">${x.e}×</span></button>`).join('')}</div>` : `
      <p class="hint" style="margin:4px 0 0">Sem erros nesta rodada. Se foi limpo, o assunto está no ponto.</p>`}
    <button class="btn btn-p" style="width:100%;margin-top:12px" onclick="novaRodada('${fonte}')">
      ↺ Começar a rodada ${s.rodada + 1}</button>
    ${mod && mapaDoModulo(mod.id) ? `<button class="btn btn-s" style="width:100%;margin-top:8px"
      onclick="abrirModulo('${mod.id}','licao')">🧠 Fechar com o mapa do assunto</button>` : ''}
  </div>`;
}
function vaiPara(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}
