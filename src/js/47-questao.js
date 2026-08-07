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
  const p = partesDaExplicacao(q.explica);

  let h = `<article class="qz" id="q_${id.replace(/[^\w]/g,'_')}">
    <header class="qz-cab">
      ${q.origem ? `<span class="origem">${esc(q.origem)}</span>` : ''}
      <span class="qz-pos">Q${q.n}${total?` · ${pos+1} de ${total}`:''}</span>
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
    h += `<div class="qz-dicas">
      ${dicas.slice(0, nivel).map((d,i) => `<div class="qz-dica">
        <span class="qz-dnum">${i+1}</span><div><b>${esc(d.t)}</b>${d.c}</div></div>`).join('')}
      ${nivel < dicas.length && !respondida ? `<button class="qz-fbt" onclick="pedeDica('${id}',${dicas.length})">Ainda travado — mais uma dica</button>` : ''}
    </div>`;
  }

  const riscadas = S.risca[id] || [];
  h += `<div class="qz-alts">`;
  for(const L of LETRAS){
    if(!(L in q.alts)) continue;
    let cls = 'alt';
    if(respondida) cls += (L===q.correta) ? ' correta' : (L===resp ? ' errada' : ' apagada');
    else if(riscadas.includes(L)) cls += ' riscada';
    h += `<div class="alt-linha">
      <button class="${cls}" ${respondida?'':`onclick="respondeQuestao('${fonte}',${q.n},'${L}')"`}>
        <span class="letra">${L}</span><span>${esc(q.alts[L])}</span></button>
      ${respondida?'':`<button class="alt-risca" title="descartar esta alternativa"
        onclick="riscaAlt('${id}','${L}')">${riscadas.includes(L)?'↺':'✕'}</button>`}
    </div>`;
  }
  h += `</div>`;

  if(respondida){
    h += `<div class="qz-resp">
      <div class="qz-bloco ${acertou?'bom':'ruim'}">
        <h4>${acertou ? '✔ Acertou — gabarito: letra '+q.correta : '✘ Você marcou '+resp+'. O gabarito é a letra '+q.correta}</h4>
        <div>${p.certa || `<b>${q.correta})</b> ${esc(q.alts[q.correta]||'')}`}</div>
      </div>`;
    if(p.erradas) h += `<div class="qz-bloco atencao"><h4>⚠ Onde a banca derruba</h4><div>${p.erradas}</div></div>`;
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
      <button class="btn btn-s" onclick="refazQuestao('${fonte}',${q.n})">↺ Refazer esta</button>
      ${q.mod ? `<button class="btn btn-s" onclick="abrirModulo('${q.mod}')">📖 Rever a lição</button>` : ''}
    </div></div>`;
  }
  return h + `</article>`;
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
function alternaRascunho(id){
  S._rasc = (S._rasc===id) ? null : id;
  render();
  const el = document.getElementById('rasc_'+id.replace(/[^\w]/g,'_'));
  const ta = el && el.querySelector('textarea');
  if(ta && S._rasc===id) ta.focus();
}
function salvaRascunho(id, v){ S.rascunho[id] = v; save(); }

/* Acha a questão pela chave da fonte — serve para lição e para prova. */
function achaQuestao(fonte, n){
  if(fonte.startsWith('licao:')){
    const mid = fonte.slice(6);
    for(const v of DATA.conteudo){
      const mod = v.mods.find(m => m.id === mid);
      if(mod) return {q:(mod.qs||[]).find(q => q.n === n), mod};
    }
    return null;
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
  const R = S.quiz[fonte] || {};
  const feitas = qs.filter(q => R[q.n] !== undefined).length;
  const certas = qs.filter(q => R[q.n] === q.correta).length;
  return `<div class="qz-topo">
      <div><b>${qs.length} questões</b> de provas anteriores sobre este módulo</div>
      <div class="qz-placar">${feitas ? `${certas} de ${feitas} · ${Math.round(certas/feitas*100)}%` : 'nenhuma respondida'}</div>
    </div>
    ${feitas ? `<div class="pbar" style="margin-bottom:14px"><div class="pfill" style="width:${feitas/qs.length*100}%"></div></div>` : ''}
    ${qs.map((q,i) => questaoHTML(fonte, q, mod, i, qs.length)).join('')}`;
}
