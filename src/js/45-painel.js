/* ===================================================================
   PAINEL DE ESTUDO  (v5)

   O que o protótipo do Claude Design chamou de "Hoje": meta diária
   com cronômetro, revisões vencendo, desempenho ao longo das semanas,
   cobertura por bloco contra o peso na prova e onde você mais erra.

   Tudo por trilha — cada prova tem o seu tempo, as suas revisões e o
   seu histórico. Nada aqui depende de servidor: mora no mesmo objeto
   S que já sincroniza com o Supabase.
   =================================================================== */

/* ---------------- datas ---------------- */
function hojeISO(){ const d=new Date(); d.setHours(0,0,0,0);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function diasEntre(a,b){ return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000); }
function somaDias(iso,n){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
/* Semana ISO, usada como chave do histórico de desempenho. */
function semanaISO(dt){
  const d = new Date(dt || new Date()); d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const jan1 = new Date(d.getFullYear(),0,1);
  const n = Math.ceil(((d - jan1)/86400000 + 1)/7);
  return d.getFullYear()+'-W'+String(n).padStart(2,'0');
}

/* ---------------- tempo de estudo ---------------- */
/* Conta os minutos com o app aberto e visível. Para quando a pessoa
   troca de aba ou larga o aparelho — um minuto só entra se houve
   algum sinal de vida nos últimos três minutos.                    */
let ultimoSinal = Date.now(), relogio = null;
function marcaVida(){ ultimoSinal = Date.now(); }
['pointerdown','keydown','wheel','touchstart'].forEach(ev =>
  window.addEventListener(ev, marcaVida, {passive:true}));

function iniciaRelogio(){
  clearInterval(relogio);
  relogio = setInterval(()=>{
    if(!USER || !S.trilha) return;
    if(document.hidden) return;
    if(Date.now() - ultimoSinal > 3*60*1000) return;      // ocioso
    const k = S.trilha+':'+hojeISO();
    S.tempo[k] = (S.tempo[k]||0) + 1;
    if(S.tempo[k] % 5 === 0) save();                       // grava a cada 5 min
    if(VIEW==='home' && !LEITOR && !QZ && !SIM) render();
  }, 60000);
}
function minutosHoje(){ return S.tempo[S.trilha+':'+hojeISO()] || 0; }
function metaDiaria(){ return (S.cfg && S.cfg.metaMin) || 60; }

/* ---------------- revisão espaçada ---------------- */
/* Intervalos em dias. Acertou, sobe de degrau; errou, volta ao início. */
const DEGRAUS = [1, 3, 7, 16, 35, 75];

/* resultado: 'limpa' (acertou sozinho) · 'apoio' (acertou com dica) ·
   'erro'. Acertar com dica NÃO estica o intervalo — se esticasse, o app
   marcaria como aprendido o que só foi resolvido com ajuda.          */
function agendaRevisao(mid, resultado){
  if(!mid) return;
  if(resultado === true) resultado = 'limpa';
  if(resultado === false) resultado = 'erro';
  const r = S.rev[mid] || {nivel:0};
  if(resultado === 'limpa') r.nivel = Math.min(DEGRAUS.length-1, r.nivel+1);
  else if(resultado === 'erro') r.nivel = 0;
  r.prox = somaDias(hojeISO(), DEGRAUS[r.nivel]);
  r.visto = hojeISO();
  S.rev[mid] = r;
}
/* Módulos desta trilha cuja revisão já venceu (ou vence hoje). */
function revisoesVencidas(){
  const hoje = hojeISO();
  return modsTrilha()
    .filter(m => S.rev[m.id] && diasEntre(S.rev[m.id].prox, hoje) >= 0)
    .map(m => ({mod:m, atraso: diasEntre(S.rev[m.id].prox, hoje), nivel:S.rev[m.id].nivel}))
    .sort((a,b) => b.atraso - a.atraso);
}

/* ---------------- desempenho por semana ---------------- */
function registraResposta(certo, comApoio){
  const k = S.trilha+':'+semanaISO();
  const h = S.hist[k] || {n:0, ok:0, apoio:0};
  h.n++;
  if(certo){ if(comApoio) h.apoio = (h.apoio||0)+1; else h.ok++; }
  S.hist[k] = h;
}
/* Últimas 12 semanas, para o gráfico de barrinhas. */
function serieDesempenho(){
  const out = [];
  const d = new Date();
  for(let i=11; i>=0; i--){
    const dt = new Date(d); dt.setDate(dt.getDate() - i*7);
    const h = S.hist[S.trilha+':'+semanaISO(dt)];
    out.push(h && h.n ? Math.round(h.ok/h.n*100) : null);
  }
  return out;
}

/* ---------------- cobertura por bloco ---------------- */
/* Quanto você já cobriu de cada volume, contra o peso dele na prova.
   "Coberto" = módulo com nota escrita, anotação a caneta ou questão
   respondida — os três sinais de que a pessoa passou por ali.      */
function moduloTocado(mid){
  if((S.notas[mid]||'').trim()) return true;
  if(['licao','questoes','figuras','prova'].some(a => (S.ink[mid+':'+a]||[]).length)) return true;
  /* responder questão conta; só abrir a lição, não — senão a barra de
     cobertura mediria arquivo aberto em vez de assunto estudado.    */
  const r = S.quiz['licao:'+mid];
  if(r && Object.keys(r).length) return true;
  return DATA.provas.some(p => (S.quiz[p.id]||{}) &&
    p.questoes.some(q => q.mod===mid && (S.quiz[p.id]||{})[q.n]!==undefined));
}
function cobertura(){
  const t = trilha();
  const pesoDoMod = {};
  (t.estats||[]).forEach(([, pct, mid]) => { if(mid) pesoDoMod[mid] = pct; });
  return volsTrilha().map(v => {
    const tocados = v.mods.filter(m => moduloTocado(m.id)).length;
    const peso = v.mods.reduce((a,m) => a + (pesoDoMod[m.id]||0), 0);
    return {vol:v, pct: v.mods.length ? Math.round(tocados/v.mods.length*100) : 0,
            peso: Math.round(peso), tocados, total:v.mods.length};
  }).filter(c => c.total);
}

/* ---------------- onde você mais erra ---------------- */
function ondeErra(){
  const conta = new Map();
  for(const e of errosDaTrilha()){
    let mid = null;
    const p = DATA.provas.find(p => p.id === e.vol);
    if(p && p.questoes[e.qi]) mid = p.questoes[e.qi].mod;
    if(!mid) mid = '__' + e.vol;                       // quiz comentado: agrupa por volume
    conta.set(mid, (conta.get(mid)||0) + 1);
  }
  const nome = {};
  DATA.conteudo.forEach(v => { nome['__'+v.id] = v.t; v.mods.forEach(m => nome[m.id] = m.t); });
  return [...conta.entries()]
    .map(([mid,n]) => ({mid, n, t: nome[mid] || 'Questões de assunto variado'}))
    .sort((a,b) => b.n - a.n).slice(0,5);
}

/* =================== PEÇAS DA TELA =================== */

function svgAnel(pct){
  const r = 56, c = 2*Math.PI*r, on = Math.max(0, Math.min(1, pct/100))*c;
  return `<svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--sf2)" stroke-width="13"></circle>
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--acid)" stroke-width="13"
      stroke-linecap="round" stroke-dasharray="${on.toFixed(1)} ${c.toFixed(1)}"
      transform="rotate(-90 66 66)"></circle></svg>`;
}

function cardMeta(){
  const min = minutosHoje(), meta = metaDiaria();
  const falta = Math.max(0, meta - min);
  return `<div class="pcard" style="align-items:center;justify-content:center">
    <div class="anel">${svgAnel(min/meta*100)}
      <div class="txt"><span class="n">${min}</span><span class="u">DE ${meta} MIN</span></div></div>
    <div style="font-weight:600;font-size:.83rem;margin-top:14px">Meta de hoje</div>
    <div class="legenda" style="text-align:center">${falta ? falta+' min para fechar' : 'meta batida 🎉'}</div>
    <button class="btn btn-s" style="margin-top:12px;width:100%" onclick="ajustaMeta()">Ajustar meta</button>
  </div>`;
}
function ajustaMeta(){
  const v = prompt('Quantos minutos por dia você quer estudar?', metaDiaria());
  const n = parseInt(v,10);
  if(!n || n<5 || n>600) return;
  S.cfg.metaMin = n; save(true); render();
}

function cardRevisao(){
  const revs = revisoesVencidas();
  const cor = a => a>7 ? 'var(--err)' : (a>2 ? '#E8A317' : 'var(--ok)');
  return `<div class="pcard">
    <div class="topo"><span class="rotulo">Revisão de hoje</span>
      <span style="font:700 .82rem/1 var(--mono)">${revs.length}</span></div>
    <div class="plista">
      ${revs.length ? revs.slice(0,4).map(r => `
        <button class="pitem" onclick="abrirModulo('${r.mod.id}')">
          <span class="bola" style="background:${cor(r.atraso)}"></span>
          <span class="t">${esc(r.mod.t)}</span>
          <span class="n">${r.atraso===0?'hoje':'+'+r.atraso+'d'}</span></button>`).join('')
        : `<p class="legenda" style="margin:0">Nada vencendo. Cada módulo que você estuda entra na fila
             e volta em 1, 3, 7, 16, 35 e 75 dias — é a repetição espaçada.</p>`}
    </div>
    ${revs.length ? `<button class="btn btn-s" style="margin-top:12px" onclick="abrirModulo('${revs[0].mod.id}')">Revisar agora</button>` : ''}
  </div>`;
}

function cardDesempenho(){
  const st = stats();
  const serie = serieDesempenho();
  const comDado = serie.filter(v => v!==null);
  const atual = comDado.length ? comDado[comDado.length-1] : st.pctQuiz;
  const antes = comDado.length>1 ? comDado[comDado.length-2] : null;
  const delta = antes===null ? null : atual-antes;
  const max = Math.max(100, ...comDado);
  return `<div class="pcard">
    <div class="topo"><span class="rotulo">Desempenho</span></div>
    <div style="display:flex;align-items:baseline;gap:4px">
      <span class="grande">${atual}</span><span class="unid">%</span>
      ${delta===null?'':`<span class="delta ${delta>=0?'sobe':'desce'}">${delta>=0?'▲':'▼'} ${Math.abs(delta)} pts</span>`}
    </div>
    <div class="legenda">acerto em ${st.resp} ${st.resp===1?'questão respondida':'questões respondidas'}</div>
    <div class="spark">${serie.map(v => `<i class="${v===null?'':'on'}" style="height:${v===null?4:Math.max(6,v/max*100)}%"></i>`).join('')}</div>
    <div class="spark-eixo"><span>12 SEMANAS ATRÁS</span><span>AGORA</span></div>
  </div>`;
}

function cardCobertura(){
  const cob = cobertura();
  if(!cob.length) return '';
  return `<div class="pcard largo">
    <div class="topo"><span class="rotulo">Cobertura por bloco · peso na prova</span></div>
    <div class="cob">
      ${cob.map(c => `<div class="cob-l" onclick="abrirModulo('${c.vol.mods[0].id}')">
        <span class="t">${esc(c.vol.t)}</span>
        <span class="v">${c.tocados}/${c.total}</span>
        <span class="cob-tr">
          <span class="cob-fl" style="width:${c.pct}%"></span>
          ${c.peso ? `<span class="cob-peso" style="left:${Math.min(99,c.peso)}%" title="peso na prova: ${c.peso}%"></span>` : ''}
        </span></div>`).join('')}
    </div>
    <p class="legenda">A barra é o quanto você já cobriu; o risco vertical marca o peso daquele bloco
      nas provas anteriores. Bloco pesado com barra curta é onde está o maior ganho.</p>
  </div>`;
}

function cardErros(){
  const lista = ondeErra();
  if(!lista.length) return '';
  const max = lista[0].n;
  return `<div class="pcard">
    <div class="topo"><span class="rotulo">Onde você mais erra</span>
      <span style="font:700 .82rem/1 var(--mono)">${errosDaTrilha().length}</span></div>
    <div class="plista">
      ${lista.map(e => `<button class="pitem" onclick="${e.mid.startsWith('__')?`go('treinar')`:`abrirModulo('${e.mid}')`}">
        <span class="bola" style="background:var(--err);opacity:${(0.35+0.65*e.n/max).toFixed(2)}"></span>
        <span class="t">${esc(e.t)}</span><span class="n">${e.n}×</span></button>`).join('')}
    </div>
    <button class="btn btn-s" style="margin-top:12px" onclick="refazerErradas()">Refazer as erradas</button>
  </div>`;
}

/* Capa imersiva do topo da tela inicial. */
function capaHoje(){
  const c = contagem(), t = trilha();
  const min = minutosHoje(), meta = metaDiaria();
  const falta = Math.max(0, meta - min);
  const st = stats();
  const revs = revisoesVencidas().length;

  const dia = new Date().toLocaleDateString('pt-BR', {weekday:'short', day:'numeric', month:'short'})
    .replace('.','').toUpperCase();
  const olho = c && c.dias>=0 ? `${dia} · ${c.dias} ${c.dias===1?'DIA':'DIAS'} PARA A PROVA` : dia;

  let titulo, acao, aoClicar;
  if(falta===0){ titulo = 'Meta do dia batida. O resto é lucro.'; acao='Continuar mesmo assim'; }
  else if(min===0){ titulo = `Hoje são ${meta} minutos. Bora começar.`; acao='Começar a estudar'; }
  else { titulo = `Faltam ${falta} minutos para fechar o dia.`; acao='Voltar ao estudo'; }

  const ult = S.ult && findMod(S.ult.vol, S.ult.mod);
  aoClicar = ult ? `abrir('${S.ult.vol}','${S.ult.mod}','${S.ult.aba||'licao'}')` : `go('estudar')`;

  return `<div class="capa">
    <span class="spine"><i style="height:${Math.min(100, Math.round(min/meta*100))}%"></i></span>
    <span class="marca">${esc(t.curto.slice(0,4).toUpperCase())}</span>
    <div class="conteudo">
      <div style="flex:1"></div>
      <div class="olho frio">${esc(olho)}</div>
      <h2>${esc(titulo)}</h2>
      <div class="acoes">
        <button class="pill" onclick="${aoClicar}">${acao}</button>
        <span class="nota">${st.streak} ${st.streak===1?'DIA SEGUIDO':'DIAS SEGUIDOS'}${revs?' · '+revs+' A REVISAR':''}</span>
      </div>
    </div>
  </div>`;
}

/* Capa do volume, no topo da tela Estudar. */
function capaEstudar(){
  const t = trilha();
  const vols = volsTrilha();
  const cob = cobertura();
  /* o volume "atual" é o primeiro que ainda não está completo */
  const alvo = cob.find(c => c.pct < 100) || cob[0];
  if(!alvo) return '';
  const v = alvo.vol;
  const prox = v.mods.find(m => !moduloTocado(m.id)) || v.mods[0];
  const nMods = modsTrilha().length;
  return `<div class="capa">
    <span class="spine"><i style="height:${alvo.pct}%"></i></span>
    <span class="marca">${esc((v.id||'').toUpperCase())}</span>
    <div class="conteudo">
      <div style="flex:1"></div>
      <div class="olho">${esc(v.sub||t.curto)} · ${alvo.tocados} DE ${alvo.total} MÓDULOS</div>
      <h2>${esc(v.t)}</h2>
      <p>${alvo.peso? alvo.peso+'% da prova. ':''}${alvo.tocados? 'Você já passou por '+alvo.tocados+' '+(alvo.tocados===1?'módulo':'módulos')+' — o próximo é '+esc(prox.t.split(/[:(]/)[0].trim().toLowerCase())+'.' : 'Comece por '+esc(prox.t.split(/[:(]/)[0].trim().toLowerCase())+'.'}</p>
      <div class="acoes">
        <button class="pill" onclick="abrirModulo('${prox.id}')">${alvo.tocados?'Continuar':'Começar'} ${esc(prox.n.toLowerCase())}</button>
        <button class="pill vazia" onclick="rolaParaLista()">Ver os ${nMods} módulos</button>
      </div>
    </div>
  </div>`;
}
function rolaParaLista(){
  const el = document.getElementById('listaMods');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

/* Mapa da sessão: uma casinha por questão da fila. */
function mapaSessao(fila, respostas, banco, atual, aoIr){
  if(!fila || fila.length < 2) return '';
  let ok=0, nao=0;
  const casas = fila.map((qi,pos) => {
    const r = respostas[qi];
    const q = banco[qi];
    let cls = '';
    if(r!==undefined){ if(q && r===q.correta){ cls='ok'; ok++; } else { cls='nao'; nao++; } }
    if(pos===atual) cls += ' aqui';
    return `<b class="${cls}" onclick="${aoIr}(${pos})" title="questão ${pos+1}">${pos+1}</b>`;
  }).join('');
  return `<div class="pcard" style="margin-top:13px">
    <div class="topo"><span class="rotulo">Mapa da sessão</span>
      <span style="font:600 .74rem/1 var(--mono);color:var(--ink3)">${fila.length} questões</span></div>
    <div class="mapa">${casas}</div>
    <div class="mapa-leg"><span style="color:var(--ok)">acertou · ${ok}</span>
      <span style="color:var(--err)">errou · ${nao}</span>
      <span>a responder · ${fila.length-ok-nao}</span></div>
  </div>`;
}
function vaiParaQuestao(pos){ if(QZ){ QZ.i=pos; window.scrollTo(0,0); render(); } }
function vaiParaSimulado(pos){ if(SIM){ SIM.i=pos; window.scrollTo(0,0); render(); } }
