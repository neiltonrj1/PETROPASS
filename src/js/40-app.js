"use strict";
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
/* trilha = a prova escolhida (inspecao, producao, eletrica, projetos).
   curWeek e chk passam a ser por trilha, porque cada prova tem o seu
   cronograma; o que já estava salvo é migrado em migraEstado().        */
const DEF = {v:6, ink:{}, quiz:{}, chk:{}, wkdone:{}, curWeek:0, notas:{}, erros:[],
             trilha:null, tempo:{}, rev:{}, hist:{}, dicas:{}, dicasFechadas:{}, rascunho:{}, risca:{},
             tentativas:{}, rodada:{},
             cfg:{tema:'claro', fs:16, dataProva:'', metaMin:60}, ult:null};

let sb=null, USER=null, S=JSON.parse(JSON.stringify(DEF)), CFG=null, OFFLINE=false, SUJO=false;
let VIEW='home', LEITOR=null, QZ=null, SIM=null, REV=null;
const main = document.getElementById('main');

/* ---------------- utilidades ---------------- */
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function toast(msg,ms){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'), ms||2400); }
function lsGet(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function lsSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
function chaveLocal(){ return 'petroApp_v2_' + (USER? USER.id : 'anon'); }

/* ---------------- trilha (a prova escolhida) ---------------- */
function trilha(){
  return DATA.trilhas.find(t=>t.id===S.trilha) || DATA.trilhas[0];
}
/* Volumes desta trilha, na ordem em que a trilha os declara. */
function volsTrilha(){
  return trilha().vols.map(id=>DATA.conteudo.find(v=>v.id===id)).filter(Boolean);
}
function modsTrilha(){
  const out=[]; volsTrilha().forEach(v=>v.mods.forEach(m=>out.push(m))); return out;
}
function semanas(){ return trilha().semanas; }
function provasTrilha(){ return DATA.provas.filter(p=>p.trilha===S.trilha); }
/* As chaves de cronograma passaram a ser por trilha: w<sem>d<dia>m|n vira
   <trilha>:w… — assim trocar de prova não zera o que já foi marcado. */
function kBloco(w,d,turno){ return S.trilha+':w'+w+'d'+d+turno; }
function kSemana(i){ return S.trilha+':'+i; }

/* Estado salvo antes da versão 4 só conhecia a trilha de Inspeção;
   a versão 5 acrescentou tempo de estudo, revisão espaçada e histórico. */
function migraEstado(){
  if(S.v<4){
    const chk={}, wkdone={};
    for(const k in S.chk) chk['inspecao:'+k]=S.chk[k];
    for(const k in S.wkdone) wkdone['inspecao:'+k]=S.wkdone[k];
    S.chk=chk; S.wkdone=wkdone;
    S.curWeek = {inspecao: S.curWeek||0};
    if(Object.keys(S.notas||{}).length || Object.keys(S.quiz||{}).length) S.trilha='inspecao';
  }
  /* Até a v5 as respostas de prova eram guardadas pelo ÍNDICE da questão
     no array. Agora a chave é o número da questão na prova, o mesmo das
     questões da lição — assim uma peça só corrige as duas.            */
  if(S.v<6){
    for(const p of DATA.provas){
      const r = S.quiz[p.id];
      if(r){
        const novo = {};
        for(const k in r){ const q = p.questoes[+k]; if(q) novo[q.n] = r[k]; }
        S.quiz[p.id] = novo;
      }
      S.erros.forEach(e => { if(e.vol===p.id){ const q = p.questoes[+e.qi]; if(q) e.qi = q.n; } });
    }
  }
  /* As abas "gabarito" e "calculos" deixaram de existir. A tinta era
     guardada em "<módulo>:<aba>", então o que foi rabiscado nelas
     ficaria órfão — trazemos para a aba de questões, que é onde aquele
     conteúdo passou a morar.                                        */
  if(S.v<6){
    for(const k of Object.keys(S.ink||{})){
      const m = k.match(/^(.+):(gabarito|calculos)$/);
      if(!m) continue;
      const destino = m[1]+':questoes';
      S.ink[destino] = (S.ink[destino]||[]).concat(S.ink[k]);
      delete S.ink[k];
    }
  }
  /* campos que podem faltar em qualquer backup mais antigo */
  if(!S.risca         || typeof S.risca        !=='object') S.risca={};
  if(!S.dicasFechadas || typeof S.dicasFechadas!=='object') S.dicasFechadas={};
  if(!S.tentativas    || typeof S.tentativas   !=='object') S.tentativas={};
  if(!S.rodada        || typeof S.rodada       !=='object') S.rodada={};
  if(!S.tempo    || typeof S.tempo   !=='object') S.tempo={};
  if(!S.rev      || typeof S.rev     !=='object') S.rev={};
  if(!S.hist     || typeof S.hist    !=='object') S.hist={};
  if(!S.dicas    || typeof S.dicas   !=='object') S.dicas={};
  if(!S.rascunho || typeof S.rascunho!=='object') S.rascunho={};
  if(!S.cfg) S.cfg={};
  if(!S.cfg.metaMin) S.cfg.metaMin=60;
  if(!S.trilha) S.trilha=null;
  S.v=6;
}
function semanaAtual(){
  if(typeof S.curWeek==='number') S.curWeek={};             // formato antigo
  return S.curWeek[S.trilha]||0;
}
function setSemanaAtual(i){
  if(typeof S.curWeek==='number') S.curWeek={};
  S.curWeek[S.trilha]=i;
}

function telaTrilha(primeira){
  document.body.classList.remove('deslogado');
  LEITOR=null; QZ=null; SIM=null;
  const cartoes = DATA.trilhas.map(t=>{
    const mods = t.vols.reduce((a,vid)=>{ const v=DATA.conteudo.find(v=>v.id===vid); return a+(v?v.mods.length:0); },0);
    const qs = DATA.provas.filter(p=>p.trilha===t.id).reduce((a,p)=>a+p.questoes.length,0);
    const provas = DATA.provas.filter(p=>p.trilha===t.id).length;
    return `<button class="trilha-card${S.trilha===t.id?' on':''}" onclick="escolheTrilha('${t.id}')" style="--tc:${t.cor}">
      <span class="ic">${t.icone}</span>
      <span class="tx">
        <span class="nm">${esc(t.curto)}</span>
        <span class="dc">${esc(t.sub)}</span>
        <span class="mt">${mods} módulos · ${qs} questões de prova · ${provas} provas anteriores</span>
      </span></button>`;
  }).join('');
  main.innerHTML = `<div class="card">
      <h2>${primeira? 'Qual prova você vai fazer?' : 'Trocar de prova'}</h2>
      <p class="hint" style="margin-top:0">O app se ajusta inteiro à sua escolha: as apostilas, o treino, o
        cronograma de 16 semanas e o gráfico do que mais cai passam a ser os da prova escolhida.
        ${primeira? 'Dá para trocar depois em ⚙ Ajustes, sem perder nada.' : 'Suas anotações, notas e respostas de cada prova ficam guardadas separadamente.'}</p>
      <div class="trilhas">${cartoes}</div>
    </div>`;
}
function escolheTrilha(id){
  const mudou = S.trilha!==id;
  S.trilha = id;
  if(mudou){ LEITOR=null; QZ=null; SIM=null; S.ult=null; }
  save(true);
  VIEW='home';
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='home'));
  window.scrollTo(0,0); render();
  toast(trilha().icone+' '+trilha().curto+' — material carregado');
}

/* ---------------- configuração (URL + chave) ---------------- */
function cfgValida(c){
  if(!c || typeof c.url!=='string' || typeof c.key!=='string') return false;
  const u = c.url.trim().replace(/\/+$/,'');
  return /^https:\/\/.+\.supabase\.co$/.test(u) && c.key.trim().length >= 40;
}
function carregaCfg(){
  /* 1º: config.js versionado no repositório — assim o app nunca pede a chave.
     2º: o que o próprio aparelho salvou, se algum dia o config.js não carregar. */
  const ext = window.PETROPASS_CFG;
  if(cfgValida(ext)) return {url: ext.url.trim().replace(/\/+$/,''), key: ext.key.trim()};
  return lsGet('petroCfg', null);
}
function telaConfig(){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>P</span><i></i></div><h2>Configuração inicial</h2>
      <p>Só nesta primeira vez, e só no seu aparelho</p></div>
    <div class="card">
      <div class="aviso a-warn">Cole aqui os dois valores do seu projeto no Supabase — estão em
        <b>Project Settings → API</b>. Depois me mande esses valores que eu gero a versão final já configurada
        para os outros alunos.</div>
      <label class="f">Project URL</label>
      <input type="text" id="cUrl" placeholder="https://xxxxxxxx.supabase.co" autocapitalize="off" spellcheck="false">
      <label class="f">Chave pública (anon public)</label>
      <input type="text" id="cKey" placeholder="eyJhbGciOi..." autocapitalize="off" spellcheck="false">
      <div id="cErr"></div>
      <button class="btn btn-p" style="width:100%" id="cOk">Salvar e continuar</button>
      <p class="hint">A chave <b>anon public</b> é feita para ficar no app. Nunca use aqui a chave
        <b>service_role</b> — essa é secreta.</p>
    </div>
    <div class="card">
      <h2>Não era para aparecer esta tela?</h2>
      <p class="hint" style="margin-top:0">Se o app já vinha configurado, o aparelho está usando uma
        versão antiga guardada no cache. O botão abaixo apaga esse cache e recarrega do zero.
        As suas anotações e respostas <b>não</b> são apagadas.</p>
      <button class="btn btn-s" style="width:100%" id="cLimpa">Atualizar o app (limpar cache)</button>
    </div></div>`;
  document.getElementById('cLimpa').addEventListener('click', async ()=>{
    const b = document.getElementById('cLimpa');
    b.disabled = true; b.textContent = 'Limpando…';
    try{
      if('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if(window.caches){
        const ks = await caches.keys();
        await Promise.all(ks.map(k=>caches.delete(k)));
      }
    }catch(e){}
    location.replace(location.pathname + '?atualizado=' + Date.now());
  });
  document.getElementById('cOk').addEventListener('click', ()=>{
    const url = document.getElementById('cUrl').value.trim().replace(/\/+$/,'');
    const key = document.getElementById('cKey').value.trim();
    const err = document.getElementById('cErr');
    if(!/^https:\/\/.+\.supabase\.co$/.test(url)) return err.innerHTML = '<div class="aviso a-err">O Project URL deve ser parecido com https://abcdefgh.supabase.co</div>';
    if(key.length < 40) return err.innerHTML = '<div class="aviso a-err">A chave parece incompleta. Copie a linha inteira do campo "anon public".</div>';
    lsSet('petroCfg', {url, key}); CFG={url,key}; boot();
  });
}

/* ---------------- autenticação ---------------- */
function telaLogin(msg, tipo){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>P</span><i></i></div><h2>PETROPASS</h2>
      <p>Inspeção · Produção · Elétrica · Projetos</p></div>
    <div class="card">
      ${msg? `<div class="aviso a-${tipo||'err'}">${msg}</div>`:''}
      <label class="f">E-mail</label>
      <input type="email" id="lEmail" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(lsGet('petroUltEmail',''))}">
      <label class="f">Senha</label>
      <input type="password" id="lSenha" autocomplete="current-password">
      <div id="lErr"></div>
      <button class="btn btn-p" style="width:100%" id="lOk">Entrar</button>
      <div style="text-align:center;margin-top:10px">
        <button class="link" id="lNovo">Criar uma conta</button> ·
        <button class="link" id="lSenhaEsq">Esqueci a senha</button>
      </div>
    </div></div>`;
  const go = ()=>entrar(document.getElementById('lEmail').value.trim(), document.getElementById('lSenha').value);
  document.getElementById('lOk').addEventListener('click', go);
  document.getElementById('lSenha').addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
  document.getElementById('lNovo').addEventListener('click', telaCadastro);
  document.getElementById('lSenhaEsq').addEventListener('click', telaRecuperar);
}
function telaCadastro(){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>P</span><i></i></div><h2>Criar conta</h2>
      <p>Depois de confirmar o e-mail, seu acesso passa por liberação</p></div>
    <div class="card">
      <label class="f">Seu nome</label>
      <input type="text" id="rNome" autocomplete="name">
      <label class="f">E-mail</label>
      <input type="email" id="rEmail" autocomplete="email" autocapitalize="off" spellcheck="false">
      <label class="f">Senha (mínimo 8 caracteres)</label>
      <input type="password" id="rSenha" autocomplete="new-password">
      <label class="f">Repita a senha</label>
      <input type="password" id="rSenha2" autocomplete="new-password">
      <div id="rErr"></div>
      <button class="btn btn-p" style="width:100%" id="rOk">Criar conta</button>
      <div style="text-align:center;margin-top:10px">
        <button class="link" id="rVoltar">Já tenho conta</button>
      </div>
    </div></div>`;
  document.getElementById('rOk').addEventListener('click', cadastrar);
  document.getElementById('rVoltar').addEventListener('click', ()=>telaLogin());
}
function telaRecuperar(){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>P</span><i></i></div><h2>Recuperar senha</h2>
      <p>Enviamos um link para você criar uma senha nova</p></div>
    <div class="card">
      <label class="f">E-mail da conta</label>
      <input type="email" id="pEmail" autocapitalize="off" spellcheck="false">
      <div id="pErr"></div>
      <button class="btn btn-p" style="width:100%" id="pOk">Enviar link</button>
      <div style="text-align:center;margin-top:10px"><button class="link" id="pVoltar">Voltar</button></div>
    </div></div>`;
  document.getElementById('pVoltar').addEventListener('click', ()=>telaLogin());
  document.getElementById('pOk').addEventListener('click', async ()=>{
    const email = document.getElementById('pEmail').value.trim();
    if(!email) return;
    const b = document.getElementById('pOk'); b.disabled=true; b.textContent='Enviando...';
    const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.href.split('#')[0]});
    b.disabled=false; b.textContent='Enviar link';
    document.getElementById('pErr').innerHTML = error
      ? `<div class="aviso a-err">${esc(traduz(error.message))}</div>`
      : `<div class="aviso a-ok">Se existe conta com esse e-mail, o link acabou de ser enviado. Confira também o spam.</div>`;
  });
}
function telaConfirmeEmail(email){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>✉</span></div><h2>Confirme seu e-mail</h2></div>
    <div class="card">
      <div class="aviso a-ok">Enviamos uma mensagem para <b>${esc(email)}</b>. Abra o e-mail e clique no link
        para confirmar o endereço. Se não chegar em alguns minutos, confira o spam.</div>
      <p class="hint" style="margin-top:0">Depois de confirmar, o acesso ainda passa por liberação manual —
        você vai ver um aviso na tela até ser liberado.</p>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-s" id="cReenviar">Reenviar e-mail</button>
        <button class="btn btn-p" id="cJa">Já confirmei, entrar</button>
      </div>
    </div></div>`;
  document.getElementById('cJa').addEventListener('click', ()=>telaLogin());
  document.getElementById('cReenviar').addEventListener('click', async (ev)=>{
    ev.target.disabled=true;
    const {error} = await sb.auth.resend({type:'signup', email:email});
    toast(error? traduz(error.message) : 'E-mail reenviado ✔', 4000);
    setTimeout(()=>{ ev.target.disabled=false; }, 5000);
  });
}
function telaPendente(){
  document.body.classList.add('deslogado');
  main.innerHTML = `<div class="center">
    <div class="logo"><div class="m"><span>⏳</span></div><h2>Aguardando liberação</h2></div>
    <div class="card">
      <div class="aviso a-warn">Sua conta (<b>${esc(USER.email)}</b>) foi criada e o e-mail está confirmado.
        Falta apenas o administrador liberar o acesso. Assim que isso acontecer, é só tocar em "Verificar de novo".</div>
      <div class="row">
        <button class="btn btn-p" id="pVer">Verificar de novo</button>
        <button class="btn btn-s" id="pSair">Sair</button>
      </div>
    </div></div>`;
  document.getElementById('pVer').addEventListener('click', async ()=>{
    const p = await buscaPerfil(USER.id);
    if(p && p.aprovado){ USER.aprovado=true; guardaSessaoLocal(); await iniciaApp(); }
    else toast('Ainda não liberado. Fale com o administrador.', 3500);
  });
  document.getElementById('pSair').addEventListener('click', sair);
}
function traduz(m){
  m = String(m||'');
  if(/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if(/Email not confirmed/i.test(m)) return 'Você ainda não confirmou o e-mail. Verifique sua caixa de entrada.';
  if(/User already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.';
  if(/Password should be at least/i.test(m)) return 'A senha é curta demais — use pelo menos 8 caracteres.';
  if(/rate limit|too many requests|429/i.test(m)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if(/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
  if(/Unable to validate email/i.test(m)) return 'E-mail inválido.';
  return m;
}
async function cadastrar(){
  const nome = document.getElementById('rNome').value.trim();
  const email = document.getElementById('rEmail').value.trim();
  const s1 = document.getElementById('rSenha').value, s2 = document.getElementById('rSenha2').value;
  const err = document.getElementById('rErr');
  err.innerHTML='';
  if(nome.length<2) return err.innerHTML='<div class="aviso a-err">Escreva seu nome.</div>';
  if(!/^\S+@\S+\.\S+$/.test(email)) return err.innerHTML='<div class="aviso a-err">E-mail inválido.</div>';
  if(s1.length<8) return err.innerHTML='<div class="aviso a-err">A senha precisa ter pelo menos 8 caracteres.</div>';
  if(s1!==s2) return err.innerHTML='<div class="aviso a-err">As duas senhas não são iguais.</div>';
  const b = document.getElementById('rOk'); b.disabled=true; b.textContent='Criando...';
  const {data, error} = await sb.auth.signUp({email, password:s1,
    options:{ data:{nome:nome}, emailRedirectTo: location.href.split('#')[0] }});
  b.disabled=false; b.textContent='Criar conta';
  if(error) return err.innerHTML = `<div class="aviso a-err">${esc(traduz(error.message))}</div>`;
  lsSet('petroUltEmail', email);
  if(data && data.session){ await aposLogin(data.session.user); }
  else telaConfirmeEmail(email);
}
async function entrar(email, senha){
  const err = document.getElementById('lErr'); if(err) err.innerHTML='';
  if(!email || !senha) return err.innerHTML='<div class="aviso a-err">Preencha e-mail e senha.</div>';
  const b = document.getElementById('lOk'); b.disabled=true; b.textContent='Entrando...';
  const {data, error} = await sb.auth.signInWithPassword({email, password:senha});
  b.disabled=false; b.textContent='Entrar';
  if(error){
    if(/Email not confirmed/i.test(error.message)) return telaConfirmeEmail(email);
    return err.innerHTML = `<div class="aviso a-err">${esc(traduz(error.message))}</div>`;
  }
  lsSet('petroUltEmail', email);
  await aposLogin(data.user);
}
async function buscaPerfil(id){
  try{
    const {data, error} = await sb.from('perfis').select('nome,email,aprovado').eq('id', id).maybeSingle();
    if(error) return null;
    return data;
  }catch(e){ return null; }
}
async function aposLogin(u){
  USER = {id:u.id, email:u.email, nome:(u.user_metadata&&u.user_metadata.nome)||'', aprovado:false};
  const p = await buscaPerfil(u.id);
  if(p){ USER.aprovado = !!p.aprovado; if(p.nome) USER.nome = p.nome; }
  else { // sem perfil: banco ainda não configurado
    return telaLogin('Sua conta entrou, mas o banco de dados ainda não está configurado (tabela "perfis" não encontrada). Rode o script de configuração no Supabase.', 'err');
  }
  guardaSessaoLocal();
  if(!USER.aprovado) return telaPendente();
  await iniciaApp();
}
function guardaSessaoLocal(){
  lsSet('petroSessao', {id:USER.id, email:USER.email, nome:USER.nome, aprovado:USER.aprovado});
}
async function sair(){
  if(SUJO && !OFFLINE){ await nuvemSalva(true); }
  try{ await sb.auth.signOut(); }catch(e){}
  localStorage.removeItem('petroSessao');
  USER=null; LEITOR=null; QZ=null; S=JSON.parse(JSON.stringify(DEF));
  telaLogin('Você saiu da sua conta.', 'ok');
}

/* ---------------- dados: local + nuvem ---------------- */
let saveT=null, syncT=null;
function save(agora){
  /* carimbo de versão: é o que permite decidir, no próximo boot, quem
     está mais novo — o aparelho ou a nuvem — em vez de chutar.      */
  S.seq = (S.seq||0) + 1;
  S.atualizadoEm = new Date().toISOString();
  lsSet(chaveLocal(), S);
  SUJO = true; marcaSync();
  clearTimeout(syncT);
  if(agora) nuvemSalva();
  else syncT = setTimeout(()=>nuvemSalva(), 2500);
}
function marcaSync(){
  const txt = OFFLINE ? '⚠ offline' : (SUJO ? '↻ salvando' : '✓ salvo');
  const el = document.getElementById('sync'); if(el) el.textContent = txt;
  const sp = document.querySelector('#sPerfil .st'); if(sp) sp.textContent = txt;
}
async function nuvemCarrega(){
  try{
    const {data, error} = await sb.from('dados_estudo').select('dados').eq('user_id', USER.id).maybeSingle();
    if(error) throw error;
    if(data && data.dados && Object.keys(data.dados).length){
      return Object.assign(JSON.parse(JSON.stringify(DEF)), data.dados);
    }
    return null;
  }catch(e){ OFFLINE=true; return null; }
}
async function nuvemSalva(force){
  if(!USER || !sb) return;
  try{
    const {error} = await sb.from('dados_estudo')
      .upsert({user_id:USER.id, dados:S, atualizado_em:new Date().toISOString()}, {onConflict:'user_id'});
    if(error) throw error;
    OFFLINE=false; SUJO=false; marcaSync();
  }catch(e){
    OFFLINE=true; marcaSync();
    if(!force) clearTimeout(syncT), syncT=setTimeout(()=>nuvemSalva(), 20000);
  }
}
window.addEventListener('online', ()=>{ if(USER && SUJO) nuvemSalva(); });
window.addEventListener('offline', ()=>{ OFFLINE=true; marcaSync(); });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && SUJO) nuvemSalva(true); });

/* Junta o que está no aparelho com o que está na nuvem.

   Antes daqui, quando havia versão na nuvem ela simplesmente substituía
   a local — e quem estudasse duas horas offline perdia tudo se a última
   subida tivesse falhado. Agora ninguém é descartado: manda o mais novo,
   e o que só existe do outro lado é incorporado chave a chave. Como tudo
   o que o app guarda é dicionário (anotações, notas, respostas, revisões),
   a fusão não tem conflito na prática.                                  */
function juntaEstados(local, nuvem){
  const base = JSON.parse(JSON.stringify(DEF));
  if(!local && !nuvem) return base;
  if(!nuvem) return Object.assign(base, local);
  if(!local) return Object.assign(base, nuvem);

  const seqL = local.seq||0, seqN = nuvem.seq||0;
  const novo = seqL > seqN ? local : nuvem;
  const velho = seqL > seqN ? nuvem : local;
  const S2 = Object.assign(base, JSON.parse(JSON.stringify(novo)));

  /* dicionários: o que existe só no lado antigo é preservado */
  for(const campo of ['ink','notas','quiz','chk','wkdone','rev','tempo','hist','dicas','rascunho','risca']){
    const a = velho[campo], b = S2[campo];
    if(!a || typeof a !== 'object' || !b) continue;
    for(const k in a){
      if(b[k] === undefined){ b[k] = a[k]; continue; }
      /* respostas de um mesmo caderno: une as questões que faltam */
      if(campo==='quiz' && b[k] && typeof b[k]==='object' && typeof a[k]==='object'){
        for(const q in a[k]) if(b[k][q] === undefined) b[k][q] = a[k][q];
      }
    }
  }
  /* caderno de erros: união por (acervo, questão) */
  const vistos = new Set((S2.erros||[]).map(e => e.vol+'#'+e.qi));
  for(const e of (velho.erros||[])) if(!vistos.has(e.vol+'#'+e.qi)) S2.erros.push(e);

  if(seqL !== seqN) setTimeout(()=>toast('Progresso do aparelho e da nuvem foram juntados ✔', 3800), 900);
  return S2;
}

/* ---------------- início do app ---------------- */
async function iniciaApp(){
  document.body.classList.remove('deslogado');
  const local = lsGet(chaveLocal(), null);
  const nuvem = await nuvemCarrega();
  S = juntaEstados(local, nuvem);
  if(local && nuvem){ lsSet(chaveLocal(), S); }
  migraEstado();
  aplicaCfg(); SUJO=false; marcaSync(); iniciaRelogio();
  VIEW='home'; LEITOR=null; QZ=null; SIM=null;
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='home'));
  if(!S.trilha) return telaTrilha(true);      // primeira vez: escolhe a prova
  render();
}
async function boot(){
  document.getElementById('verLbl').textContent = 'v'+DATA.versao;
  aplicaCfg();
  CFG = carregaCfg();
  if(!CFG || !CFG.url) return telaConfig();
  if(typeof supabase === 'undefined'){
    return telaLogin('Não consegui carregar o componente de login. Recarregue a página.', 'err');
  }
  sb = supabase.createClient(CFG.url, CFG.key, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  let sess=null;
  try{ const r = await sb.auth.getSession(); sess = r.data.session; }catch(e){}
  if(!sess){
    const cache = lsGet('petroSessao', null);
    if(cache && cache.aprovado && !navigator.onLine){
      USER = cache; OFFLINE=true; await iniciaApp();
      toast('Modo offline — entrando com a última sessão salva', 4000);
      return;
    }
    return telaLogin();
  }
  if(!navigator.onLine){
    const cache = lsGet('petroSessao', null);
    if(cache && cache.aprovado){ USER=cache; OFFLINE=true; await iniciaApp();
      toast('Modo offline — sincroniza quando a internet voltar', 4000); return; }
  }
  await aposLogin(sess.user);
}

/* ---------------- navegação ---------------- */
document.querySelectorAll('#nav button,.snav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));
function go(v){
  if(v==='estudar' && VIEW==='estudar' && LEITOR) LEITOR=null;
  VIEW = v; if(v!=='estudar') LEITOR=null;
  if(v!=='treinar') QZ=null;
  if(v!=='provas') SIM=null;
  if(v!=='treinar') REV=null;
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v===v));
  window.scrollTo(0,0); render();
}
function render(){
  if(!USER) return;
  if(!S.trilha) return telaTrilha(true);
  ({home:vHome, estudar:vEstudar, treinar:vTreinar, provas:vProvas, plano:vPlano, notas:vNotas, config:vConfig})[VIEW]();
  const tb = document.getElementById('tools');
  if(tb) tb.classList.toggle('hide', !(VIEW==='estudar' && LEITOR && LEITOR.aba!=='figuras'));
  pintaMarca(); medeTopo(); pintaSide(); marcaSync();
}
/* Mostra qual prova está selecionada — no topo (celular) e na lateral (desktop). */
function pintaMarca(){
  const t = trilha();
  document.documentElement.style.setProperty('--trilha', t.cor);
  const el = document.getElementById('trilhaLbl');
  if(el){ el.innerHTML = t.icone+' '+esc(t.curto); el.title = t.nome; }
  const side = document.getElementById('sTrilha');
  if(side){
    side.innerHTML = `<span class="ic">${t.icone}</span>
      <span class="tx"><span class="nm">${esc(t.curto)}</span><span class="tr">trocar de prova</span></span>`;
    side.title = t.nome;
  }
}
function medeTopo(){
  const t = document.getElementById('top');
  if(t) document.documentElement.style.setProperty('--topH', t.offsetHeight+'px');
}

/* ---------------- barra lateral (desktop) ---------------- */
function pintaSide(){
  if(!USER) return;
  const st = stats();
  const setTxt = (id,v)=>{ const e=document.getElementById(id); if(e) e.textContent = v; };
  const mods = modsTrilha().length;
  let comentadas=0; volsTrilha().forEach(v=>{ comentadas += (DATA.quizzes[v.id]||[]).length; });
  setTxt('sbHome', st.resp ? st.pctQuiz+'%' : '');
  setTxt('sbEst',  mods || '');
  setTxt('sbTre',  comentadas || '');
  setTxt('sbPro',  provasTrilha().length || '');
  setTxt('sbPla',  st.pctPlano+'%');
  setTxt('sbNot',  errosDaTrilha().length || '');

  const box = document.getElementById('sStreak');
  if(box){
    const w = semanaAtual();
    let g='';
    for(let d=0; d<7; d++){
      const ok = S.chk[kBloco(w,d,'m')] && S.chk[kBloco(w,d,'n')];
      g += '<i class="'+(ok?'f':'')+'"></i>';
    }
    box.innerHTML = '<div><span class="n">'+st.streak+'</span><span class="u">'+
      (st.streak===1?'dia seguido':'dias seguidos')+'</span></div>'+
      '<div class="g">'+g+'</div>'+
      '<div class="h">Semana '+(w+1)+' de '+semanas().length+' · '+st.pctPlano+'% do plano</div>';
  }

  const p = document.getElementById('sPerfil');
  if(p){
    const em = (USER && USER.email) || '';
    const nome = em.split('@')[0] || 'Aluno';
    const ini = (nome.replace(/[^0-9A-Za-zÀ-ÿ]/g,'').slice(0,2) || 'AL').toUpperCase();
    p.innerHTML = '<span class="av">'+esc(ini)+'</span><span class="tx">'+
      '<span class="nm">'+esc(nome)+'</span><span class="st"></span></span>';
  }
}

/* ---------------- métricas (sempre da trilha escolhida) ---------------- */
function stats(){
  const pre = S.trilha+':';
  const blocos = Object.keys(S.chk).filter(k=>k.startsWith(pre) && S.chk[k]).length;
  const feitas = Object.keys(S.wkdone).filter(k=>k.startsWith(pre) && S.wkdone[k]).length;
  const TOT = semanas().length;
  const meus = new Set(volsTrilha().map(v=>v.id));
  const meusMods = new Set(modsTrilha().map(m=>'licao:'+m.id));
  let resp=0, certas=0;
  for(const vid in S.quiz){
    if(!meus.has(vid) && !meusMods.has(vid) && !provasTrilha().some(p=>p.id===vid)) continue;
    for(const chave in S.quiz[vid]){
      const q = questaoDe(vid, chave);
      if(!q) continue;
      resp++; if(S.quiz[vid][chave]===q.correta) certas++;
    }
  }
  /* Sequência de dias fechados, contada de HOJE para trás. Antes a
     varredura começava no sábado da semana escolhida no seletor, então
     marcar os blocos de um sábado numa terça já contava dias futuros. */
  const w0 = semanaAtual();
  let streak=0;
  outer: for(let w=w0; w>=0; w--){
    const primeiro = (w===w0) ? new Date().getDay() : 6;
    for(let d=primeiro; d>=0; d--){
      if(S.chk[kBloco(w,d,'m')] && S.chk[kBloco(w,d,'n')]) streak++;
      else if(streak>0) break outer;
    }
  }
  return {blocos, semanas:feitas, resp, certas, streak, pctPlano:Math.round(feitas/TOT*100),
          pctQuiz: resp? Math.round(certas/resp*100):0};
}
/* O banco de uma chave pode ser um quiz comentado ou uma prova inteira. */
function bancoDe(id){
  if(DATA.quizzes[id]) return DATA.quizzes[id];
  const p = DATA.provas.find(p=>p.id===id);
  return p? p.questoes : [];
}
/* Uma resposta guardada aponta para a questão de três jeitos diferentes:
   nos quizzes comentados a chave é o índice; nas provas e nas questões
   da lição é o número da questão. Esta função esconde isso.          */
function questaoDe(fonte, chave){
  if(DATA.quizzes[fonte]) return DATA.quizzes[fonte][chave];
  const ctx = achaQuestao(fonte, +chave);
  return ctx && ctx.q;
}
function hojeZero(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function dataProva(){
  const v = S.cfg && S.cfg.dataProva; if(!v) return null;
  const p = v.split('-').map(Number); if(p.length!==3) return null;
  const d = new Date(p[0], p[1]-1, p[2]); d.setHours(0,0,0,0);
  return isNaN(d.getTime())? null : d;
}
function contagem(){
  const d = dataProva(); if(!d) return null;
  const dias = Math.round((d - hojeZero())/86400000);
  const semanasFaltando = Math.max(0, Math.ceil(dias/7));
  const atual = semanaAtual() + 1;
  const TOT = semanas().length;
  let semanaIdeal = semanasFaltando >= TOT ? 1 : Math.min(TOT, Math.max(1, TOT - semanasFaltando + 1));
  const atraso = semanaIdeal - atual;                // >0 = atrasado
  const semanasPlanoRestantes = TOT - semanaAtual();
  const ritmo = semanasFaltando>0 ? (semanasPlanoRestantes/semanasFaltando) : 0;
  const extenso = d.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  return {dias, semanas:semanasFaltando, blocos: Math.max(0,dias)*2, semanaAtual:atual, semanaIdeal, atraso, ritmo, extenso, total:TOT};
}
/* Questões disponíveis para treinar nesta trilha: comentadas + de prova. */
function totalQ(){
  let n=0;
  volsTrilha().forEach(v=>{ n += (DATA.quizzes[v.id]||[]).length; });
  provasTrilha().forEach(p=>{ n += p.questoes.length; });
  return n;
}
function findVol(vid){ return DATA.conteudo.find(v=>v.id===vid); }
function findMod(vid,mid){ const v=findVol(vid); return v? v.mods.find(m=>m.id===mid):null; }

/* ---------------- INÍCIO ---------------- */
function vHome(){
  const st = stats(); const w = semanaAtual(); const sem = semanas()[w]; const hoje = new Date().getDay();
  const km=kBloco(w,hoje,'m'), kn=kBloco(w,hoje,'n');
  let cont='';
  if(S.ult){ const m = findMod(S.ult.vol, S.ult.mod);
    if(m) cont = `<button class="btn btn-p" style="width:100%;margin-bottom:9px" onclick="abrir('${S.ult.vol}','${S.ult.mod}','${S.ult.aba||'licao'}')">▶ Continuar: ${esc(m.n)} — ${esc(m.t.slice(0,42))}</button>`; }
  main.innerHTML = capaHoje() + `
  <div class="painel">
    ${cardMeta()}
    ${cardRevisao()}
    ${cardDesempenho()}
    ${cardErros()}
    ${cardCobertura()}
  </div>
  ${cardProva()}
  <div class="card">
    <h2>Hoje — ${DIAS[hoje]} · Semana ${sem[0]} · Fase ${sem[1]}</h2>
    <p style="font-size:.82rem;color:var(--ink2);margin-bottom:4px"><b>Manhã:</b> ${esc(sem[2])}</p>
    <p style="font-size:.82rem;color:var(--ink2);margin-bottom:11px"><b>Noite:</b> ${esc(sem[3])}</p>
    ${cont}
    <div class="row">
      <button class="btn ${S.chk[km]?'btn-p':'btn-s'}" onclick="marcaBloco('${km}')">${S.chk[km]?'✔ ':'☀ '}Manhã feita</button>
      <button class="btn ${S.chk[kn]?'btn-p':'btn-s'}" onclick="marcaBloco('${kn}')">${S.chk[kn]?'✔ ':'🌙 '}Noite feita</button>
    </div>
    <div class="row" style="margin-top:9px">
      <button class="btn btn-s" onclick="abrirModulo('${sem[4]}')">📖 Lição da semana</button>
      <button class="btn btn-s" onclick="go('treinar')">✍ Treinar questões</button>
    </div>
    <div class="tiles" style="margin-top:13px">
      <div class="tile"><div class="n">${st.pctPlano}%</div><div class="l">do plano</div></div>
      <div class="tile"><div class="n">${st.resp}/${totalQ()}</div><div class="l">questões feitas</div></div>
    </div>
  </div>
  ${cardIncidencia()}`;
}
/* Gráfico do que mais cai, contado nas provas anteriores da trilha. */
function cardIncidencia(){
  const t = trilha();
  if(!t.estats || !t.estats.length) return '';
  const anos = provasTrilha().map(p=>p.ano).sort();
  return `<div class="card"><h2>O que mais cai na prova (${esc(t.curto)})</h2>
    ${barras(t.estats.slice(0,10))}
    <p class="hint">Contagem feita sobre ${t.baseEstats} questões reais das provas
      ${anos.length? 'Cesgranrio '+[...new Set(anos)].join(', ') : 'anteriores'}, classificadas por assunto.
      Toque numa barra para abrir o módulo.</p></div>`;
}
function cardProva(){
  const c = contagem();
  if(!c) return `<div class="card" style="text-align:center">
      <p style="font-size:.84rem;color:var(--ink2);margin-bottom:10px">Defina a data da prova e o app passa a contar os dias e a conferir se você está no ritmo.</p>
      <button class="btn btn-p" onclick="go('config')">📅 Definir a data da prova</button></div>`;
  if(c.dias < 0) return `<div class="card" style="text-align:center">
      <div style="font-size:1.1rem;font-weight:800;color:var(--verde)">Prova realizada 💪</div>
      <p class="hint">Foi em ${esc(c.extenso)}. Boa sorte no resultado! Se vier outro concurso, é só trocar a data em ⚙.</p></div>`;
  let alerta='', cor='var(--ink)';
  if(c.dias === 0){ alerta = '<div class="aviso a-ok" style="margin:11px 0 0">É HOJE. Chegue cedo, leve documento e caneta preta. Você treinou para isso.</div>'; }
  else if(c.dias <= 14){ cor='var(--err)';
    alerta = '<div class="aviso a-err" style="margin:11px 0 0"><b>Reta final.</b> Nada de conteúdo novo: só revisão do caderno de erros, flashcards e simulados cronometrados.</div>'; }
  else if(c.atraso >= 2){
    alerta = `<div class="aviso a-warn" style="margin:11px 0 0"><b>Você está ${c.atraso} semanas atrás do ritmo.</b>
      Para chegar na prova com o plano fechado, precisa cobrir cerca de <b>${c.ritmo.toFixed(1)} semanas do plano por semana real</b> —
      na prática, some uma sessão extra no fim de semana ou corte os módulos de menor peso.</div>`; }
  else if(c.atraso === 1){
    alerta = '<div class="aviso a-warn" style="margin:11px 0 0">Você está uma semana atrás do ritmo — dá para recuperar com uma sessão extra no fim de semana.</div>'; }
  else if(c.atraso <= -1){
    alerta = `<div class="aviso a-ok" style="margin:11px 0 0">Você está ${Math.abs(c.atraso)} semana(s) adiantado. Aproveite a folga para fazer mais questões dos assuntos de maior peso.</div>`; }
  else { alerta = '<div class="aviso a-ok" style="margin:11px 0 0">Você está exatamente no ritmo do plano. Siga assim.</div>'; }
  return `<div class="card">
    <div style="text-align:center">
      <div style="font-size:3.1rem;font-weight:800;color:${cor};line-height:1">${c.dias}</div>
      <div style="font-size:.8rem;color:var(--ink2);margin-top:2px">${c.dias===1?'dia para a prova':'dias para a prova'}</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:4px">${esc(c.extenso)}</div>
    </div>
    <div class="tiles" style="margin-top:13px">
      <div class="tile"><div class="n">${c.semanas}</div><div class="l">semanas restantes</div></div>
      <div class="tile"><div class="n">${c.blocos}</div><div class="l">blocos de 1h ainda por vir</div></div>
      <div class="tile"><div class="n">${c.semanaAtual}/${c.total}</div><div class="l">sua semana no plano</div></div>
      <div class="tile"><div class="n">${c.semanaIdeal}</div><div class="l">semana ideal hoje</div></div>
    </div>
    ${alerta}
  </div>`;
}
function barras(arr){
  const max = Math.max(...arr.map(a=>a[1]));
  return arr.map(a=>{
    const clique = a[2] ? ` onclick="abrirModulo('${a[2]}')" style="cursor:pointer"` : '';
    return `<div class="bar-row"${clique}><div class="t">${esc(a[0])}</div>
    <div class="bar-tr"><div class="bar-fl" style="width:${(a[1]/max*100).toFixed(0)}%"></div></div>
    <div>${String(a[1]).replace('.',',')}%</div></div>`;
  }).join('');
}
function marcaBloco(k){ S.chk[k]=!S.chk[k]; save(); render(); }

/* ---------------- ESTUDAR ---------------- */
function vEstudar(){
  if(LEITOR) return renderLeitor();
  const busca = (S._busca||'').toLowerCase();
  let html = (busca ? '' : capaEstudar()) +
    `<div class="card" id="listaMods"><h2>Apostilas · ${esc(trilha().curto)}</h2>
    <p class="hint" style="margin:-6px 0 10px">${esc(trilha().sub)}</p>
    <input type="text" id="busca" placeholder="🔍 buscar assunto (ex.: escorregamento, crase, VPL)" value="${esc(S._busca||'')}" style="margin-bottom:0"></div>`;
  let achou = 0;
  volsTrilha().forEach(v=>{
    const mods = v.mods.filter(m=> !busca || (m.t+' '+(m.txt||'')).toLowerCase().includes(busca));
    if(!mods.length) return;
    achou += mods.length;
    html += `<div class="card"><h2>${esc(v.t)}</h2><p class="hint" style="margin:-6px 0 10px">${esc(v.sub)}</p><div class="list">`;
    mods.forEach(m=>{
      const temInk = ['licao','questoes','gabarito'].some(a=>(S.ink[m.id+':'+a]||[]).length);
      const temNota = (S.notas[m.id]||'').trim().length;
      const nProva = questoesDoModulo(m.id).length;
      html += `<button onclick="abrir('${v.id}','${m.id}','licao')"><span class="chip">${esc(m.n)}</span>${nProva?`<span class="chip contorno">${nProva} de prova</span>`:''}${temInk?'<span class="dot" style="background:var(--amarelo)"></span>':''}${temNota?'<span class="dot" style="background:var(--verde2)"></span>':''}
        <div style="margin-top:5px">${esc(m.t)}</div></button>`;
    });
    html += `</div></div>`;
  });
  if(!achou) html += `<div class="card"><p class="hint" style="margin:0">Nada encontrado para “${esc(S._busca||'')}” nas apostilas de ${esc(trilha().curto)}.</p></div>`;
  main.innerHTML = html;
  const b = document.getElementById('busca');
  b.addEventListener('input', ()=>{ S._busca=b.value; const p=b.selectionStart; vEstudar();
    const nb=document.getElementById('busca'); nb.focus(); nb.setSelectionRange(p,p); });
}
/* Questões reais de prova classificadas neste módulo. */
function questoesDoModulo(mid){
  const out=[];
  provasTrilha().forEach(p=>p.questoes.forEach((q,i)=>{ if(q.mod===mid) out.push({...q, prova:p, qi:i}); }));
  return out;
}
/* Abre um módulo sabendo só o id dele — descobre o volume sozinho. */
function abrirModulo(mid, aba){
  for(const v of DATA.conteudo){
    if(v.mods.some(m=>m.id===mid)) return abrir(v.id, mid, aba||'licao');
  }
  toast('Módulo não encontrado nesta prova');
}
function abrir(vid,mid,aba){
  LEITOR = {vol:vid, mod:mid, aba:aba||'licao'};
  S.ult = {vol:vid, mod:mid, aba:LEITOR.aba};
  /* Abrir a lição coloca o módulo na fila de revisão, mas NÃO faz o
     intervalo crescer: quem move o degrau é acertar questão. Antes,
     reabrir seis vezes levava o módulo para 75 dias sem o aluno ter
     acertado nada — e a barra de cobertura media abrir arquivo.     */
  if(!S.rev[mid]) agendaRevisao(mid, false);
  else S.rev[mid].visto = hojeISO();
  save();
  if(VIEW!=='estudar'){ VIEW='estudar'; document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='estudar')); }
  window.scrollTo(0,0); render();
}
function renderLeitor(){
  const m = findMod(LEITOR.vol, LEITOR.mod);
  if(!m){ LEITOR=null; return vEstudar(); }
  const figs = FIGURAS.filter(f=>f.mod===m.id);
  const daProva = questoesDoModulo(m.id);
  const nQs = (m.qs||[]).length;
  /* Gabarito e cálculos deixaram de ser abas: agora aparecem dentro da
     própria questão, junto do enunciado que eles resolvem.           */
  const abas = [['licao','Lição']];
  if(figs.length) abas.push(['figuras','Figuras '+figs.length]);
  if(nQs || m.questoes) abas.push(['questoes','Questões'+(nQs?' '+nQs:'')]);
  if(daProva.length) abas.push(['prova','De prova '+daProva.length]);
  if(!abas.some(a=>a[0]===LEITOR.aba)) LEITOR.aba = 'licao';
  main.innerHTML = `
  <div id="leitorHead">
    <button class="btn btn-s" style="padding:8px 11px" onclick="fecharLeitor()">←</button>
    <div class="tt">${esc(m.n)} — ${esc(m.t)}</div>
  </div>
  <div class="abas">${abas.map(a=>`<button class="${LEITOR.aba===a[0]?'on':''}" onclick="trocaAba('${a[0]}')">${a[1]}</button>`).join('')}</div>
  <div id="pagewrap"><div id="page">${conteudoAba(m)}</div><canvas id="ink"></canvas></div>
  <div class="card" style="margin-top:13px"><h2>Minhas notas deste módulo</h2>
    <textarea id="nota" placeholder="Resumo com suas palavras, dúvidas, o que errou...">${esc(S.notas[m.id]||'')}</textarea></div>`;
  document.querySelectorAll('#page table').forEach(t=>{
    if(t.parentElement && t.parentElement.classList.contains('tw')) return;
    const w=document.createElement('div'); w.className='tw';
    t.parentNode.insertBefore(w,t); w.appendChild(t);
  });
  document.getElementById('nota').addEventListener('input', e=>{ S.notas[m.id]=e.target.value; save(); });
  if(LEITOR.aba==='figuras'){ montaFiguras(m); }
  montaTools(); setupInk();
  if(LEITOR.aba==='figuras'){ const c=document.getElementById('ink'); if(c) c.style.display='none'; }
  setTimeout(()=>{ if(cv && LEITOR){ sizeCanvas(); redraw(); } }, 400);
}
function conteudoAba(m){
  if(LEITOR.aba==='figuras') return '<div id="figs"></div>';
  if(LEITOR.aba==='questoes') return questoesDoModuloHTML(m);
  if(LEITOR.aba==='prova'){
    const qs = questoesDoModulo(m.id);
    return `<div class="qz-topo">
        <div><b>${qs.length} questões</b> que já caíram sobre este assunto</div>
        <div class="qz-placar">gabarito oficial da banca</div>
      </div>` +
      qs.map((q,i) => questaoHTML(q.prova.id, q, m, i, qs.length)).join('');
  }
  /* a lição abre com o mapa do assunto, quando ele existe */
  /* o mapa fecha o módulo: vem depois da lição, como revisão */
  if(LEITOR.aba==='licao') return chamadaDoMapa(m) + (m.licao || '<p>—</p>') + mapaHTML(m);
  return m[LEITOR.aba] || '<p>—</p>';
}
function montaFiguras(m){
  const alvo = document.getElementById('figs'); if(!alvo) return;
  FIGURAS.filter(f=>f.mod===m.id).forEach(f=>{
    const d = document.createElement('div'); d.className='figbox';
    d.innerHTML = `<h3>${esc(f.t)}</h3><div class="fd">${esc(f.d)}</div><div class="corpo"></div>`;
    alvo.appendChild(d);
    try{ f.f(d.querySelector('.corpo')); }catch(e){ d.querySelector('.corpo').innerHTML='<p class="hint">Não foi possível desenhar esta figura.</p>'; }
  });
}
function fecharLeitor(){ LEITOR=null; render(); }
function mostraResp(i){ const e=document.getElementById('resp'+i); if(e) e.classList.toggle('hide'); }
function trocaAba(a){ LEITOR.aba=a; S.ult={vol:LEITOR.vol,mod:LEITOR.mod,aba:a}; save(); window.scrollTo(0,0); render(); }

/* ---------------- tinta: caneta automática ---------------- */
let TOOL = {modo:'caneta', dedo:false, cor:'#C8342B', corMarca:'#C9F24A', larg:2.4};
function corAtual(){ return TOOL.modo==='marca' ? TOOL.corMarca : TOOL.cor; }
let cv, ctx, drawing=false, cur=null, undoOps=[], penPerto=false;
function inkKey(){ return LEITOR.mod+':'+LEITOR.aba; }
function strokes(){ return S.ink[inkKey()] || (S.ink[inkKey()]=[]); }

function montaTools(){
  let el = document.getElementById('tools');
  if(!el){ el = document.createElement('div'); el.id='tools'; document.body.appendChild(el); }
  const cores = ['#C8342B','#2F6FED','#14161A','#C9F24A'];
  el.innerHTML =
    `<button class="${TOOL.modo==='caneta'?'on':''}" data-m="caneta" title="Caneta">✏️</button>
     <button class="${TOOL.modo==='marca'?'on':''}" data-m="marca" title="Marca-texto">🖍️</button>
     <button class="${TOOL.modo==='borracha'?'on':''}" data-m="borracha" title="Borracha">🧽</button>
     <button class="lbl ${TOOL.modo==='ler'?'on':''}" data-m="ler" title="Bloqueia a escrita">🔒 Ler</button>
     <div class="sep"></div>` +
    cores.map(c=>`<button class="cor ${corAtual()===c?'on':''}" data-c="${c}" style="background:${c}"></button>`).join('') +
    `<div class="sep"></div>
     <button class="lbl ${TOOL.dedo?'on':''}" data-a="dedo" title="Deixar o dedo desenhar">✋ Dedo</button>
     <button data-a="undo" title="Desfazer">↶</button>
     <button data-a="limpar" title="Apagar tudo desta página">🗑</button>`;
  el.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>{ TOOL.modo=b.dataset.m; montaTools(); ajustaTouch(); }));
  el.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click',()=>{
    if(TOOL.modo==='marca') TOOL.corMarca=b.dataset.c;
    else { TOOL.cor=b.dataset.c; if(TOOL.modo==='ler'||TOOL.modo==='borracha') TOOL.modo='caneta'; }
    montaTools(); ajustaTouch(); }));
  el.querySelector('[data-a="dedo"]').addEventListener('click',()=>{
    TOOL.dedo=!TOOL.dedo;
    if(TOOL.dedo && TOOL.modo==='ler') TOOL.modo='caneta';
    toast(TOOL.dedo? 'Dedo desenha — role a página pelas bordas' : 'Dedo volta a rolar a página');
    montaTools(); ajustaTouch(); });
  el.querySelector('[data-a="undo"]').addEventListener('click', undo);
  el.querySelector('[data-a="limpar"]').addEventListener('click', ()=>{
    if(!strokes().length) return toast('Nada para apagar aqui');
    if(confirm('Apagar TODAS as anotações desta página?')){ undoOps.push({t:'lote', s:strokes().slice()});
      S.ink[inkKey()]=[]; save(true); redraw(); toast('Anotações apagadas'); }
  });
  el.classList.toggle('hide', !LEITOR || LEITOR.aba==='figuras');
}
function ajustaTouch(){
  if(!cv) return;
  const bloquear = TOOL.modo!=='ler' && (TOOL.dedo || penPerto);
  cv.style.touchAction = bloquear ? 'none' : 'auto';
}
function podeDesenhar(e){
  if(TOOL.modo==='ler') return false;
  /* Sobre um controle, o toque é para acionar — nunca para riscar.
     Sem isto, a caneta escreveria por cima da alternativa em vez de
     marcá-la, e no computador o mouse não conseguiria clicar em nada. */
  const alvo = e.target;
  if(alvo && alvo.closest && alvo.closest('button,a,input,textarea,select,label,.qz-ferramentas,.qz-rascunho')) return false;
  return e.pointerType==='pen' || e.pointerType==='mouse' || TOOL.dedo;
}
function setupInk(){
  cv = document.getElementById('ink'); if(!cv) return;
  ctx = cv.getContext('2d');
  sizeCanvas(); redraw();
  setTimeout(()=>{ sizeCanvas(); redraw(); }, 150);
  /* O canvas cobre a página inteira. Enquanto a página era só texto isso
     não incomodava; agora que há alternativas, dicas e rascunho dentro
     dela, o canvas engolia todo clique. A tinta passa a ser capturada no
     contêiner: quando é para desenhar, pDown() chama preventDefault() e o
     clique não acontece; quando não é, o evento segue para o botão.   */
  cv.style.pointerEvents = 'none';
  const alvo = document.getElementById('pagewrap') || cv;
  alvo.addEventListener('pointerdown', pDown);
  alvo.addEventListener('pointermove', pMove);
  alvo.addEventListener('pointerup', pUp);
  alvo.addEventListener('pointercancel', pUp);
  alvo.addEventListener('pointerleave', pUp);
  cv = document.getElementById('ink');
  // a caneta é reconhecida sozinha: ao aproximar, o dedo para de rolar sob ela
  alvo.addEventListener('pointerover', e=>{ if(e.pointerType==='pen'){ penPerto=true; ajustaTouch(); mostraPenHint(); } });
  alvo.addEventListener('pointerout',  e=>{ if(e.pointerType==='pen'){ penPerto=false; ajustaTouch(); } });
  ajustaTouch();
}
let phT=null;
function mostraPenHint(){
  if(lsGet('petroPenHint',0)>2) return;
  const h=document.getElementById('penHint'); h.classList.add('show');
  clearTimeout(phT); phT=setTimeout(()=>{ h.classList.remove('show'); lsSet('petroPenHint', lsGet('petroPenHint',0)+1); }, 2200);
}
function sizeCanvas(){
  const page = document.getElementById('page'); if(!page||!cv) return;
  const w = page.clientWidth, h = page.scrollHeight;
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  cv.style.width = w+'px'; cv.style.height = h+'px';
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function redraw(){
  if(!ctx) return;
  const page = document.getElementById('page');
  const W = page.clientWidth, H = page.scrollHeight;
  ctx.clearRect(0,0,cv.width,cv.height);
  strokes().forEach(s=>drawStroke(s, W/s.W, H/s.H));
}
function drawStroke(s,sx,sy){
  const p=s.p; if(p.length<2) return;
  ctx.save(); ctx.strokeStyle=s.c; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.globalAlpha = s.hl? .32 : 1; ctx.lineWidth = s.w * ((sx+sy)/2 || 1);
  ctx.beginPath(); ctx.moveTo(p[0]*sx, p[1]*sy);
  for(let i=2;i<p.length;i+=2) ctx.lineTo(p[i]*sx, p[i+1]*sy);
  ctx.stroke(); ctx.restore();
}
function pos(e){ const r=cv.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; }
function pDown(e){
  if(!podeDesenhar(e)) return;
  e.preventDefault();
  try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  if(TOOL.modo==='borracha'){ drawing=true; apaga(e); return; }
  const page=document.getElementById('page');
  const [x,y]=pos(e); const hl = TOOL.modo==='marca';
  let w = hl? 15 : TOOL.larg;
  if(e.pointerType==='pen' && e.pressure) w = hl? 15 : Math.max(1.2, TOOL.larg*(0.5+e.pressure));
  cur = {c:corAtual(), w:w, hl:hl, W:page.clientWidth, H:page.scrollHeight, p:[Math.round(x),Math.round(y)]};
  drawing = true;
}
function pMove(e){
  if(!drawing) return; e.preventDefault();
  if(TOOL.modo==='borracha') return apaga(e);
  const [x,y]=pos(e); const p=cur.p;
  const dx=x-p[p.length-2], dy=y-p[p.length-1];
  if(dx*dx+dy*dy < 4) return;
  p.push(Math.round(x), Math.round(y));
  ctx.save(); ctx.strokeStyle=cur.c; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.globalAlpha = cur.hl? .32:1; ctx.lineWidth=cur.w;
  ctx.beginPath(); ctx.moveTo(p[p.length-4], p[p.length-3]); ctx.lineTo(x,y); ctx.stroke(); ctx.restore();
}
function pUp(){
  if(!drawing) return; drawing=false;
  if(cur && cur.p.length>=2){ strokes().push(cur); undoOps.push({t:'add'}); save(); if(cur.hl) redraw(); }
  cur=null;
}
function apaga(e){
  const [x,y]=pos(e); const page=document.getElementById('page');
  const W=page.clientWidth, H=page.scrollHeight; const arr=strokes(); let mudou=false;
  for(let i=arr.length-1;i>=0;i--){
    const s=arr[i], sx=W/s.W, sy=H/s.H;
    for(let j=0;j<s.p.length;j+=2){
      const dx=s.p[j]*sx-x, dy=s.p[j+1]*sy-y;
      if(dx*dx+dy*dy < 190){ undoOps.push({t:'del', i:i, s:s}); arr.splice(i,1); mudou=true; break; }
    }
  }
  if(mudou){ save(); redraw(); }
}
function undo(){
  const op=undoOps.pop(); if(!op) return toast('Nada para desfazer');
  const arr=strokes();
  if(op.t==='add') arr.pop();
  else if(op.t==='del') arr.splice(op.i,0,op.s);
  else if(op.t==='lote') S.ink[inkKey()]=op.s;
  save(true); redraw();
}
let rsT=null;
window.addEventListener('resize', ()=>{ if(!LEITOR) return; clearTimeout(rsT);
  rsT=setTimeout(()=>{ sizeCanvas(); redraw(); }, 180); });

/* ---------------- TREINAR ---------------- */
function vTreinar(){
  if(REV) return renderRevisao();
  if(QZ) return renderQuiz();
  const comentados = volsTrilha().filter(v=>(DATA.quizzes[v.id]||[]).length);
  let html = `<div class="card"><h2>Treino comentado · ${esc(trilha().curto)}</h2>
    <p class="hint" style="margin-top:0">Questões reais da Cesgranrio com resolução completa. Errou? O app mostra o
    erro da alternativa que você marcou, explica a correta e lista os pontos de atenção.</p></div><div class="list">`;
  if(!comentados.length){
    html += `</div><div class="card"><p class="hint" style="margin:0">Esta prova ainda não tem questões comentadas.
      Vá em <b>Provas</b> para treinar com as ${provasTrilha().reduce((a,p)=>a+p.questoes.length,0)} questões
      reais já extraídas dos cadernos anteriores, com o gabarito oficial.</p></div>`;
  }
  comentados.forEach(v=>{
    const qs = DATA.quizzes[v.id]||[]; const r = S.quiz[v.id]||{};
    const feitas = Object.keys(r).length;
    const certas = Object.keys(r).filter(i=>qs[i] && r[i]===qs[i].correta).length;
    const pct = feitas? Math.round(certas/feitas*100):0;
    html += `<button onclick="iniciaQuiz('${v.id}')"><span class="chip">${qs.length} questões</span>
      <div style="margin-top:6px;font-weight:600">${esc(v.t)}</div>
      <div class="sub">${feitas? feitas+' respondidas · '+pct+'% de acerto' : 'ainda não iniciado'}</div>
      <div class="pbar"><div class="pfill" style="width:${qs.length? feitas/qs.length*100:0}%"></div></div></button>`;
  });
  if(comentados.length) html += `</div>`;
  const errosT = errosDaTrilha();
  if(errosT.length) html += `<div class="card"><h2>Revisão dirigida</h2>
    <button class="btn btn-p" style="width:100%" onclick="refazerErradas()">🔁 Refazer minhas ${errosT.length} questões erradas</button></div>`;
  main.innerHTML = html;
}
function errosDaTrilha(){
  const meus = new Set([...volsTrilha().map(v=>v.id), ...provasTrilha().map(p=>p.id)]);
  return S.erros.filter(e=>meus.has(e.vol));
}

/* ---------------- PROVAS ANTERIORES ---------------- */
function vProvas(){
  if(SIM) return renderSimulado();
  const provas = provasTrilha();
  let html = `<div class="card"><h2>Provas anteriores · ${esc(trilha().curto)}</h2>
    <p class="hint" style="margin-top:0">Cadernos reais da Cesgranrio, com o gabarito oficial conferido questão a
    questão. Ficaram de fora as que dependem de uma figura impressa no caderno — sem o desenho elas ensinariam
    errado.</p></div>`;
  if(!provas.length){
    html += `<div class="card"><p class="hint" style="margin:0">Ainda não há prova anterior cadastrada para esta trilha.</p></div>`;
    main.innerHTML = html; return;
  }
  html += `<div class="list">`;
  provas.slice().sort((a,b)=>b.ano-a.ano).forEach(p=>{
    const r = S.quiz[p.id]||{};
    const feitas = Object.keys(r).length;
    const certas = Object.keys(r).filter(i=>p.questoes[i] && r[i]===p.questoes[i].correta).length;
    const pct = feitas? Math.round(certas/feitas*100):0;
    html += `<button onclick="iniciaSimulado('${p.id}')"><span class="chip">${p.ano}</span>
      <span class="chip contorno">${p.questoes.length} questões</span>
      <div style="margin-top:6px;font-weight:600">${esc(p.nome)}</div>
      <div class="sub">${esc(p.processo)}${feitas? ' · '+feitas+' respondidas · '+pct+'% de acerto':''}</div>
      <div class="pbar"><div class="pfill" style="width:${feitas/p.questoes.length*100}%"></div></div></button>`;
  });
  html += `</div>`;
  main.innerHTML = html;
}
function iniciaSimulado(pid){
  const p = DATA.provas.find(p=>p.id===pid); if(!p) return;
  SIM = {id:pid, i:0}; QZ=null;
  S.quiz[pid] = S.quiz[pid]||{};
  VIEW='provas';
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='provas'));
  window.scrollTo(0,0); render();
}
function renderSimulado(){
  const p = DATA.provas.find(p=>p.id===SIM.id);
  const R = S.quiz[p.id] = S.quiz[p.id]||{};
  const total = p.questoes.length;
  const feitas = p.questoes.filter(q=>R[q.n]!==undefined).length;
  const certas = p.questoes.filter(q=>R[q.n]===q.correta).length;
  if(SIM.i>=total){
    const pct = feitas? Math.round(certas/feitas*100):0;
    main.innerHTML = `<div class="card" style="text-align:center">
      <div style="font-size:2.6rem;font-weight:800;color:var(--verde)">${pct}%</div>
      <p style="color:var(--ink2);font-size:.86rem;margin:8px 0 15px">${certas} de ${feitas} respondidas · ${esc(p.nome)} ${p.ano}</p>
      <div class="row"><button class="btn btn-p" onclick="SIM.i=0;render()">Rever da primeira</button>
      <button class="btn btn-s" onclick="SIM=null;render()">Voltar</button></div></div>`;
    return;
  }
  const q = p.questoes[SIM.i], resp = R[q.n];
  const mod = (q.mod && findModPorId(q.mod)) || {id:'', t:p.nome};
  let html = `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button class="btn btn-s" style="padding:7px 10px" onclick="SIM=null;render()">←</button>
      <div style="flex:1;font-size:.74rem;color:var(--ink2)">${esc(p.nome)} ${p.ano} · ${SIM.i+1}/${total}</div>
      <div style="font-size:.74rem;font-weight:700">✔ ${certas} · ✘ ${feitas-certas}</div>
    </div>
    <div class="pbar" style="margin-bottom:13px"><div class="pfill" style="width:${feitas/total*100}%"></div></div>
    ${questaoHTML(p.id, q, mod, SIM.i, total)}`;
  if(resp!==undefined){
    html += `<div class="row" style="margin-top:12px">
      <button class="btn btn-s" onclick="SIM.i=Math.max(0,SIM.i-1);window.scrollTo(0,0);render()">← Anterior</button>
      <button class="btn btn-p" onclick="SIM.i++;window.scrollTo(0,0);render()">${SIM.i===total-1?'Ver resultado':'Próxima →'}</button></div>`;
  }
  html += `</div>`;
  html += mapaSessao(p.questoes.map(x=>x.n), R, indexaPorN(p.questoes), SIM.i, 'vaiParaSimulado');
  main.innerHTML = html;
}
/* o mapa da sessão trabalha com um "banco" indexado pela chave da resposta */
function indexaPorN(qs){ const o={}; qs.forEach(q=>o[q.n]=q); return o; }
function findModPorId(mid){
  for(const v of DATA.conteudo){ const m = v.mods.find(m=>m.id===mid); if(m) return m; }
  return null;
}
/* mantido porque o simulado antigo e os testes chamam por este nome */
function respondeSim(L){
  const p = DATA.provas.find(p=>p.id===SIM.id);
  respondeQuestao(p.id, p.questoes[SIM.i].n, L);
}
function iniciaQuiz(vid, fila){
  const qs = DATA.quizzes[vid]||[];
  QZ = {vol:vid, i:0, fila: fila || qs.map((_,i)=>i)};
  S.quiz[vid] = S.quiz[vid]||{};
  VIEW='treinar'; SIM=null;
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='treinar'));
  window.scrollTo(0,0); render();
}
/* Antes, isto pegava só os erros do acervo do PRIMEIRO item da lista:
   quem errasse em duas provas diferentes refazia metade e o botão
   prometia o total. Agora a revisão junta tudo, de todos os acervos. */
function refazerErradas(){
  const meus = errosDaTrilha();
  if(!meus.length) return;
  REV = meus.map(e => ({vol:e.vol, qi:e.qi}));
  REV.forEach(r => { if(S.quiz[r.vol]) delete S.quiz[r.vol][r.qi]; });
  save();
  VIEW='treinar'; QZ=null; SIM=null;
  document.querySelectorAll('#nav button,.snav button').forEach(b=>b.classList.toggle('on', b.dataset.v==='treinar'));
  window.scrollTo(0,0); render();
}
function renderRevisao(){
  const itens = REV.map(r => {
    const ctx = achaQuestao(r.vol, r.qi);
    return ctx && ctx.q ? {fonte:r.vol, q:ctx.q, mod:ctx.mod} : null;
  }).filter(Boolean);
  const feitas = itens.filter(x => (S.quiz[x.fonte]||{})[x.q.n] !== undefined).length;
  main.innerHTML = `<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <button class="btn btn-s" style="padding:7px 10px" onclick="REV=null;render()">←</button>
        <h2 style="flex:1;margin:0">Revisão dirigida</h2>
      </div>
      <p class="hint" style="margin-top:0">${itens.length} ${itens.length===1?'questão que você errou':'questões que você errou'},
        de todos os cadernos desta prova. ${feitas?`Já refez ${feitas}.`:''}</p>
      ${feitas ? `<div class="pbar"><div class="pfill" style="width:${feitas/itens.length*100}%"></div></div>` : ''}
    </div>
    ${itens.length
      ? itens.map((x,i) => questaoHTML(x.fonte, x.q, x.mod || {id:'',t:''}, i, itens.length)).join('')
      : `<div class="card"><p class="hint" style="margin:0">Nenhuma questão para refazer.</p></div>`}`;
}
function renderQuiz(){
  const qs = DATA.quizzes[QZ.vol]; const vol = findVol(QZ.vol);
  S.quiz[QZ.vol] = S.quiz[QZ.vol]||{};
  const R = S.quiz[QZ.vol];
  const feitas = QZ.fila.filter(i=>R[i]!==undefined).length;
  const certas = QZ.fila.filter(i=>R[i]===qs[i].correta).length;
  if(QZ.i >= QZ.fila.length) return renderFimQuiz(certas);
  const qi = QZ.fila[QZ.i], q = qs[qi], resp = R[qi];
  let html = `<div class="card">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <button class="btn btn-s" style="padding:7px 10px" onclick="QZ=null;render()">←</button>
      <div style="flex:1;font-size:.74rem;color:var(--ink2)">${esc(vol.t)} · ${QZ.i+1}/${QZ.fila.length}</div>
      <div style="font-size:.74rem;font-weight:700">✔ ${certas} · ✘ ${feitas-certas}</div>
    </div>
    <div class="pbar" style="margin-bottom:13px"><div class="pfill" style="width:${feitas/QZ.fila.length*100}%"></div></div>
    <span class="origem">${esc(q.origem)}</span>
    <div class="enun">${esc(q.q)}</div>`;
  ['A','B','C','D','E'].forEach(L=>{
    if(!(L in q.alts)) return;
    let cls='alt';
    if(resp!==undefined) cls += (L===q.correta)?' correta':(L===resp?' errada':' apagada');
    html += `<button class="${cls}" ${resp===undefined?`onclick="responde(${qi},'${L}')"`:''}>
      <span class="letra">${L}</span><span>${esc(q.alts[L])}</span></button>`;
  });
  if(resp!==undefined){
    const ok = resp===q.correta;
    html += `<div class="fb ${ok?'fb-ok':'fb-err'}">`;
    if(ok) html += `<h4 style="color:var(--ok)">✔ Acertou! Gabarito: letra ${q.correta}</h4><div>${esc(q.explica)}</div>`;
    else html += `<h4 style="color:var(--err)">✘ Você marcou ${resp} — está errada</h4><div>${esc(q.erradas[resp]||'')}</div>
      <div class="sec"><h4 style="color:var(--ok)">✔ A correta é a letra ${q.correta}</h4><div>${esc(q.explica)}</div></div>`;
    html += `</div><div class="pontos"><h4>⚠ PONTOS DE ATENÇÃO</h4><ul>${(q.pontos||[]).map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="row" style="margin-top:12px">
      <button class="btn btn-s" onclick="QZ.i=Math.max(0,QZ.i-1);render()">← Anterior</button>
      <button class="btn btn-p" onclick="QZ.i++;window.scrollTo(0,0);render()">${QZ.i===QZ.fila.length-1?'Ver resultado':'Próxima →'}</button></div>`;
  }
  html += `</div>`;
  html += mapaSessao(QZ.fila, R, qs, QZ.i, 'vaiParaQuestao');
  main.innerHTML = html;
}
function responde(qi,L){
  const q = DATA.quizzes[QZ.vol][qi];
  S.quiz[QZ.vol][qi] = L;
  registraResposta(L===q.correta);
  if(L!==q.correta){
    if(!S.erros.some(e=>e.vol===QZ.vol && e.qi===qi))
      S.erros.push({vol:QZ.vol, qi:qi, origem:q.origem, marcou:L, correta:q.correta,
        ponto:(q.pontos||[''])[0], motivo:'', d:new Date().toISOString().slice(0,10)});
  } else S.erros = S.erros.filter(e=>!(e.vol===QZ.vol && e.qi===qi));
  save(); render();
  setTimeout(()=>{ const fb=document.querySelector('.fb'); fb&&fb.scrollIntoView({behavior:'smooth',block:'center'}); },70);
}
function renderFimQuiz(certas){
  const n=QZ.fila.length, pct=Math.round(certas/n*100);
  const msg = pct>=85? 'Nível de aprovação! Pode subir para as questões médias.'
            : pct>=70? 'Quase lá — refaça as erradas e releia os pontos de atenção.'
            : 'Volte à Lição do módulo antes de refazer.';
  main.innerHTML = `<div class="card" style="text-align:center">
    <div style="font-size:2.6rem;font-weight:800;color:var(--verde)">${pct}%</div>
    <p style="color:var(--ink2);font-size:.86rem;margin:8px 0 15px">${certas} de ${n} · ${esc(msg)}</p>
    <div class="row"><button class="btn btn-p" onclick="refazerErradas()">Refazer as erradas</button>
    <button class="btn btn-s" onclick="QZ=null;render()">Voltar</button></div></div>`;
}

/* ---------------- PLANO ---------------- */
function vPlano(){
  const st=stats(); const hoje=new Date().getDay(); const w=semanaAtual(); const SEM=semanas();
  let html = `<div class="card"><h2>Semana atual · ${esc(trilha().curto)}</h2>
    <select id="selW">${SEM.map((s,i)=>`<option value="${i}" ${i===w?'selected':''}>Semana ${s[0]} — Fase ${s[1]}</option>`).join('')}</select>
    <h3>Blocos de 60 min</h3><div class="dias">`;
  DIAS.forEach((d,di)=>{
    const km=kBloco(w,di,'m'), kn=kBloco(w,di,'n');
    html += `<div class="dia ${di===hoje?'hoje':''}"><h4>${d}</h4>
      <button class="blk ${S.chk[km]?'done':''}" onclick="marcaBloco('${km}')">☀</button>
      <button class="blk ${S.chk[kn]?'done':''}" onclick="marcaBloco('${kn}')">🌙</button></div>`;
  });
  const cc = contagem();
  html += `</div><p class="hint">${st.blocos} blocos concluídos · ${st.streak} dias seguidos${
    cc && cc.dias>=0 ? ` · faltam ${cc.dias} dias para a prova (semana ideal hoje: ${cc.semanaIdeal})` : ''}</p></div>
  <div class="card"><h2>Plano de ${SEM.length} semanas</h2><table>
    <thead><tr><th></th><th>Sem</th><th>Manhã</th><th>Noite</th></tr></thead><tbody>`;
  SEM.forEach((s,i)=>{
    html += `<tr class="${i===w?'on':''}">
      <td><span style="cursor:pointer;font-size:1rem" onclick="toggleWk(${i})">${S.wkdone[kSemana(i)]?'✅':'⬜'}</span></td>
      <td><b>${s[0]}</b></td>
      <td><span style="cursor:pointer" onclick="abrirModulo('${s[4]}')">${esc(s[2])}</span></td>
      <td>${esc(s[3])}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  main.innerHTML = html;
  document.getElementById('selW').addEventListener('change', e=>{ setSemanaAtual(+e.target.value); save(); render(); });
}
function toggleWk(i){ const k=kSemana(i); S.wkdone[k]=!S.wkdone[k]; save(); render(); }

/* ---------------- NOTAS ---------------- */
function vNotas(){
  const meusErros = errosDaTrilha();
  let html = `<div class="card"><h2>Caderno de erros · ${esc(trilha().curto)}</h2>`;
  if(!meusErros.length) html += `<p class="hint" style="margin-top:0">Sem erros registrados nesta prova. As questões que você errar no Treino e nas Provas aparecem aqui automaticamente.</p>`;
  else {
    html += `<p class="hint" style="margin-top:0">${meusErros.length} questões erradas. Escreva por que errou — é o que mais fixa.</p>`;
    meusErros.forEach((e)=>{
      const i = S.erros.indexOf(e);
      html += `<div style="border:1px solid var(--line);border-radius:11px;padding:11px;margin-bottom:9px">
        <div style="display:flex;gap:8px;align-items:center">
          <span class="origem" style="margin:0">${esc(e.origem)}</span>
          <span style="font-size:.72rem;color:var(--ink2)">marcou ${e.marcou} · correta ${e.correta}</span>
          <span style="flex:1"></span>
          <button class="btn btn-s" style="padding:5px 9px;font-size:.72rem" onclick="delErro(${i})">✕</button>
        </div>
        <div style="font-size:.76rem;color:var(--ink2);margin:7px 0">⚠ ${esc(e.ponto)}</div>
        <input type="text" placeholder="Por que errei?" value="${esc(e.motivo)}" oninput="setMotivo(${i}, this.value)" style="margin-bottom:0">
      </div>`;
    });
  }
  html += `</div><div class="card"><h2>Notas por módulo</h2>`;
  const comNota=[];
  volsTrilha().forEach(v=>v.mods.forEach(m=>{ if((S.notas[m.id]||'').trim()) comNota.push([v,m]); }));
  if(!comNota.length) html += `<p class="hint" style="margin-top:0">Você ainda não escreveu notas. Abra um módulo em Estudar e use o campo no fim da página.</p>`;
  else html += `<div class="list">`+comNota.map(([v,m])=>`<button onclick="abrir('${v.id}','${m.id}','licao')">
      <span class="chip">${esc(m.n)}</span><div style="margin-top:5px">${esc(m.t)}</div>
      <div class="sub">${esc((S.notas[m.id]||'').slice(0,110))}…</div></button>`).join('')+`</div>`;
  html += `</div>`;
  main.innerHTML = html;
}
function delErro(i){ S.erros.splice(i,1); save(); render(); }
function setMotivo(i,v){ S.erros[i].motivo=v; save(); }

/* ---------------- CONFIG ---------------- */
function vConfig(){
  const nInk = Object.values(S.ink).reduce((a,b)=>a+b.length,0);
  const nQuiz = Object.values(S.quiz).reduce((a,o)=>a+Object.keys(o).length,0);
  const nNotas = Object.keys(S.notas).filter(k=>(S.notas[k]||'').trim()).length;
  const nBlocos = Object.values(S.chk).filter(Boolean).length;
  const t = trilha();
  main.innerHTML = `
  <div class="card"><h2>Prova escolhida</h2>
    <p style="font-size:.86rem;color:var(--ink2);margin:0 0 4px"><b>${t.icone} ${esc(t.nome)}</b></p>
    <p class="hint" style="margin-top:0">${esc(t.sub)}</p>
    <button class="btn btn-s" style="width:100%;margin-top:9px" onclick="telaTrilha(false)">🔀 Trocar de prova</button>
    <p class="hint">Cada prova guarda o seu próprio cronograma, respostas e notas — trocar não apaga nada.</p>
  </div>
  <div class="card"><h2>Minha conta</h2>
    <p style="font-size:.84rem;color:var(--ink2)"><b>${esc(USER.nome||'—')}</b><br>${esc(USER.email)}</p>
    <p class="hint" style="margin-top:6px">${OFFLINE? '⚠ Modo offline: suas alterações estão salvas no aparelho e sobem quando a internet voltar.' : '✓ Seu progresso está sincronizado na nuvem — dá para continuar em outro aparelho.'}</p>
    <div class="row" style="margin-top:11px">
      <button class="btn btn-s" onclick="nuvemSalva(true).then(()=>toast('Sincronizado ✔'))">↻ Sincronizar agora</button>
      <button class="btn btn-s" onclick="sair()">Sair da conta</button>
    </div>
  </div>
  <div class="card"><h2>Data da prova</h2>
    <p class="hint" style="margin-top:0">Com a data preenchida, o Início mostra a contagem regressiva e avisa se você
      está atrasado em relação ao plano. Quando o edital sair, é só atualizar aqui.</p>
    <input type="date" id="dp" value="${esc((S.cfg&&S.cfg.dataProva)||'')}" style="margin-top:9px">
    <div class="row">
      <button class="btn btn-p" onclick="salvaData()">Salvar data</button>
      <button class="btn btn-s" onclick="limpaData()">Limpar</button>
    </div>
  </div>
  <div class="card"><h2>Leitura</h2>
    <h3>Tamanho da letra: <span id="fsv">${S.cfg.fs}px</span></h3>
    <input type="range" min="13" max="22" value="${S.cfg.fs}" id="fs" style="width:100%">
    <div class="row" style="margin-top:10px">
      <button class="btn btn-s" onclick="setTema('claro')">☀ Claro</button>
      <button class="btn btn-s" onclick="setTema('escuro')">🌙 Escuro</button>
    </div>
    <p class="hint">A caneta é reconhecida sozinha: aproximou a S Pen, ela escreve; o dedo continua rolando a
      página. O botão ✋ Dedo libera o dedo a desenhar, e o 🔒 Ler trava a escrita.</p>
  </div>
  <div class="card"><h2>Recomeçar os estudos</h2>
    <p class="hint" style="margin-top:0">Cada item apaga só o que está descrito, e vale apenas para a sua conta.
      Exporte um backup antes se quiser guardar o histórico.</p>
    <div class="row" style="margin-top:11px">
      <button class="btn btn-s" onclick="reiniciar('quiz')">Zerar questões (${nQuiz})</button>
      <button class="btn btn-s" onclick="reiniciar('ink')">Apagar anotações (${nInk} traços)</button>
    </div>
    <div class="row" style="margin-top:9px">
      <button class="btn btn-s" onclick="reiniciar('plano')">Zerar cronograma (${nBlocos} blocos)</button>
      <button class="btn btn-s" onclick="reiniciar('notas')">Apagar notas (${nNotas})</button>
    </div>
    <div class="row" style="margin-top:9px">
      <button class="btn btn-d" style="width:100%" onclick="reiniciar('tudo')">Recomeçar tudo do zero</button>
    </div>
  </div>
  <div class="card"><h2>Backup</h2>
    <div class="row">
      <button class="btn btn-p" onclick="exportar()">⬇ Exportar</button>
      <button class="btn btn-s" onclick="document.getElementById('imp').click()">⬆ Restaurar</button>
    </div>
    <input type="file" id="imp" accept="application/json" class="hide">
    <p class="hint">Além da nuvem, dá para guardar um arquivo .json com tudo — anotações, respostas, notas e progresso.</p>
  </div>`;
  const fs=document.getElementById('fs');
  fs.addEventListener('input', ()=>{ S.cfg.fs=+fs.value; document.getElementById('fsv').textContent=fs.value+'px';
    document.documentElement.style.setProperty('--fs', fs.value+'px'); save(); });
  document.getElementById('imp').addEventListener('change', importar);
}
function salvaData(){
  const v = document.getElementById('dp').value;
  if(!v) return toast('Escolha uma data primeiro');
  S.cfg.dataProva = v; save(true);
  const c = contagem();
  toast(c && c.dias>=0 ? `Faltam ${c.dias} dias para a prova` : 'Data salva');
  go('home');
}
function limpaData(){ S.cfg.dataProva=''; save(true); render(); toast('Data removida'); }
function reiniciar(tipo){
  const txt = {quiz:'Isso apaga todas as respostas dos quizzes e o caderno de erros. Continuar?',
               ink:'Isso apaga TODAS as suas anotações a caneta, de todos os módulos. Continuar?',
               plano:'Isso desmarca todos os blocos e semanas do cronograma. Continuar?',
               notas:'Isso apaga todas as suas notas escritas nos módulos. Continuar?',
               tudo:'Isso apaga TUDO da sua conta: anotações, respostas, notas e cronograma. Continuar?'}[tipo];
  if(!confirm(txt)) return;
  if(tipo==='quiz' || tipo==='tudo'){ S.quiz={}; S.erros=[]; }
  if(tipo==='ink'  || tipo==='tudo'){ S.ink={}; undoOps=[]; }
  if(tipo==='plano'|| tipo==='tudo'){
    const pre = S.trilha+':';
    for(const k in S.chk) if(k.startsWith(pre)) delete S.chk[k];
    for(const k in S.wkdone) if(k.startsWith(pre)) delete S.wkdone[k];
    setSemanaAtual(0);
  }
  if(tipo==='notas'|| tipo==='tudo'){ S.notas={}; }
  if(tipo==='tudo'){ S.ult=null; }
  save(true); QZ=null; LEITOR=null; SIM=null; render();
  toast(tipo==='tudo'? 'Tudo zerado — bons estudos de novo!' : 'Pronto, pode recomeçar essa parte');
}
function setTema(t){ S.cfg.tema=t; document.documentElement.setAttribute('data-tema',t); save(); toast('Tema '+t); }
function aplicaCfg(){
  document.documentElement.setAttribute('data-tema', (S.cfg&&S.cfg.tema)||'claro');
  document.documentElement.style.setProperty('--fs', ((S.cfg&&S.cfg.fs)||16)+'px');
}
function exportar(){
  const blob = new Blob([JSON.stringify(S)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='backup-estudo-petrobras-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); toast('Backup exportado ✔');
}
function importar(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result);
      if(!d||typeof d!=='object') throw 0;
      S = Object.assign(JSON.parse(JSON.stringify(DEF)), d);
      migraEstado(); save(true); aplicaCfg();
      if(!S.trilha) telaTrilha(true); else render();
      toast('Backup restaurado ✔');
    }catch(err){ toast('Arquivo inválido'); } };
  r.readAsText(f);
}

/* ---------------- init ---------------- */
function alternaTema(){
  if(USER) setTema(S.cfg.tema==='escuro'?'claro':'escuro');
  else { const t = document.documentElement.getAttribute('data-tema')==='escuro'?'claro':'escuro';
         document.documentElement.setAttribute('data-tema', t); }
}
document.getElementById('btnTema').addEventListener('click', alternaTema);
document.getElementById('sTema').addEventListener('click', alternaTema);
document.getElementById('sPerfil').addEventListener('click', ()=>{ if(USER) go('config'); });
['trilhaLbl','sTrilha'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('click', ()=>{ if(USER && S.trilha) telaTrilha(false); });
});
window.addEventListener('beforeunload', ()=>{ if(USER){ lsSet(chaveLocal(), S); } });
boot();
try{ if(location.protocol.startsWith('http') && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js'); }catch(e){}
