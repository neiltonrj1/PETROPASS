/* ===================================================================
   FIGURAS INTERATIVAS + CÁLCULOS RESOLVIDOS
   Tudo desenhado na hora, sem imagem externa e sem internet.
   =================================================================== */

/* ---------- helpers de álgebra (fração, expoente, raiz) ---------- */
function fr(a,b){ return `<span class="mfrac"><span class="mnum">${a}</span><span class="mden">${b}</span></span>`; }
function pw(a,b){ return `${a}<sup>${b}</sup>`; }
function msub(a,b){ return `${a}<sub>${b}</sub>`; }
function rz(a){ return `<span class="msqrt">${a}</span>`; }
function nv(x,d){ return Number(x).toFixed(d===undefined?1:d).replace('.',','); }
function un(u){ return `<span class="munit">${u}</span>`; }

/* =========================== 3D =========================== */
/* Motor mínimo: rotaciona pontos, ordena por profundidade e desenha
   esferas com gradiente. Sem biblioteca, funciona offline.        */
function Cristal(canvas, tipo){
  const ctx = canvas.getContext('2d');
  let rx = -0.45, ry = 0.7, arrasta = false, lx=0, ly=0, raio = 0.42, auto = true;
  let celula = true, destaque = false;

  const D = {
    ccc: {nome:'CCC — Cúbica de Corpo Centrado', atomos:2, coord:8, fea:0.68,
      ex:'Fe-α (ferrita), Cr, Mo, W, V', rmax:0.433,
      pontos:(()=>{ const p=[]; for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)p.push([x,y,z,0]);
        p.push([.5,.5,.5,1]); return p; })(), hex:false},
    cfc: {nome:'CFC — Cúbica de Faces Centradas', atomos:4, coord:12, fea:0.74,
      ex:'Fe-γ (austenita), Al, Cu, Ni, Ag, latão-α', rmax:0.354,
      pontos:(()=>{ const p=[]; for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)p.push([x,y,z,0]);
        [[.5,.5,0],[.5,.5,1],[.5,0,.5],[.5,1,.5],[0,.5,.5],[1,.5,.5]].forEach(q=>p.push([q[0],q[1],q[2],1]));
        return p; })(), hex:false},
    hc: {nome:'HC — Hexagonal Compacta', atomos:6, coord:12, fea:0.74,
      ex:'Zn, Mg, Ti-α, Cd, Co', rmax:0.5,
      pontos:(()=>{ const p=[], c=1.633, ri=1/Math.sqrt(3);
        for(let z=0;z<2;z++){
          for(let i=0;i<6;i++){ const a=i*Math.PI/3; p.push([Math.cos(a), Math.sin(a), z*c, 0]); }
          p.push([0,0,z*c,1]);
        }
        // três átomos no plano intermediário (posições B do empilhamento ABAB)
        for(let i=0;i<3;i++){ const a=(2*i+1)*Math.PI/3;
          p.push([Math.cos(a)*ri, Math.sin(a)*ri, c/2, 2]); }
        return p; })(), hex:true, c:1.633}
  }[tipo];

  // arestas
  function arestas(){
    if(!D.hex){
      const v=[]; for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)v.push([x,y,z]);
      const e=[];
      v.forEach((a,i)=>v.forEach((b,j)=>{ if(j<=i) return;
        const d=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
        if(d===1) e.push([a,b]); }));
      return e;
    }
    const e=[], c=D.c;
    for(let z=0;z<2;z++) for(let i=0;i<6;i++){
      const a=i*Math.PI/3, b=((i+1)%6)*Math.PI/3;
      e.push([[Math.cos(a),Math.sin(a),z*c],[Math.cos(b),Math.sin(b),z*c]]);
    }
    for(let i=0;i<6;i++){ const a=i*Math.PI/3;
      e.push([[Math.cos(a),Math.sin(a),0],[Math.cos(a),Math.sin(a),c]]); }
    return e;
  }
  const E = arestas();

  function centro(){
    if(!D.hex) return [.5,.5,.5];
    return [0,0,D.c/2];
  }
  function rot(p){
    const c0 = centro();
    let x=p[0]-c0[0], y=p[1]-c0[1], z=p[2]-c0[2];
    let y1 = y*Math.cos(rx) - z*Math.sin(rx), z1 = y*Math.sin(rx) + z*Math.cos(rx);
    let x2 = x*Math.cos(ry) + z1*Math.sin(ry), z2 = -x*Math.sin(ry) + z1*Math.cos(ry);
    return [x2, y1, z2];
  }
  function desenha(){
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    if(canvas.width !== Math.round(w*dpr)){ canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);
    const esc = Math.min(w,h) * (D.hex? 0.30 : 0.42);
    const cx = w/2, cy = h/2;
    const P = (p)=>{ const r=rot(p); return [cx + r[0]*esc, cy - r[1]*esc, r[2]]; };

    if(celula){
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--linha3d') || '#9bb0a5';
      ctx.lineWidth = 1.2; ctx.globalAlpha = .75;
      E.forEach(([a,b])=>{ const A=P(a), B=P(b);
        ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke(); });
      ctx.globalAlpha = 1;
    }
    const pts = D.pontos.map(p=>({p:P(p), t:p[3]}));
    pts.sort((a,b)=>a.p[2]-b.p[2]);
    const R = esc * raio * (D.hex? 1 : 1);
    pts.forEach(o=>{
      const [x,y,z] = o.p;
      const cores = [['#2f7d55','#0b4a2c'], ['#f0a500','#a86f00'], ['#1e88e5','#0d4f8c']][o.t] || ['#2f7d55','#0b4a2c'];
      const g = ctx.createRadialGradient(x-R*0.35, y-R*0.35, R*0.1, x, y, R);
      g.addColorStop(0, cores[0]); g.addColorStop(1, cores[1]);
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832);
      ctx.fillStyle = g; ctx.fill();
      if(destaque && o.t===1){ ctx.strokeStyle='#f5c518'; ctx.lineWidth=2.5; ctx.stroke(); }
      else { ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=.8; ctx.stroke(); }
    });
  }
  function loop(){ if(auto && !arrasta){ ry += 0.005; } desenha(); canvas._raf = requestAnimationFrame(loop); }

  canvas.addEventListener('pointerdown', e=>{ arrasta=true; lx=e.clientX; ly=e.clientY; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e=>{ if(!arrasta) return;
    ry += (e.clientX-lx)*0.01; rx += (e.clientY-ly)*0.01; lx=e.clientX; ly=e.clientY; e.preventDefault(); });
  canvas.addEventListener('pointerup', ()=>{ arrasta=false; });
  canvas.addEventListener('pointercancel', ()=>{ arrasta=false; });
  loop();
  return {
    setRaio(v){ raio = v; }, setCelula(v){ celula=v; }, setDestaque(v){ destaque=v; },
    setAuto(v){ auto=v; }, dados:D,
    parar(){ cancelAnimationFrame(canvas._raf); }
  };
}

function figCristal(box, tipo){
  box.innerHTML = `
    <canvas class="c3d"></canvas>
    <div class="ctrls">
      <label>Tamanho dos átomos <input type="range" min="8" max="50" value="30" class="r"></label>
      <div class="row" style="margin-top:6px">
        <button class="btn btn-s bc">Célula: ligada</button>
        <button class="btn btn-s ba">Girar: ligado</button>
      </div>
    </div>
    <div class="fdados"></div>`;
  const cv = box.querySelector('.c3d');
  const K = Cristal(cv, tipo);
  const D = K.dados;
  box.querySelector('.fdados').innerHTML = `
    <table><tr><th>Propriedade</th><th>Valor</th></tr>
    <tr><td>Átomos por célula</td><td><b>${D.atomos}</b></td></tr>
    <tr><td>Número de coordenação</td><td><b>${D.coord}</b></td></tr>
    <tr><td>Fator de empacotamento</td><td><b>${D.fea}</b></td></tr>
    <tr><td>Exemplos</td><td>${D.ex}</td></tr></table>`;
  const r = box.querySelector('.r');
  r.addEventListener('input', ()=>K.setRaio(+r.value/100));
  K.setRaio(0.30);
  const bc = box.querySelector('.bc'), ba = box.querySelector('.ba');
  let cel=true, aut=true;
  bc.addEventListener('click', ()=>{ cel=!cel; K.setCelula(cel); bc.textContent='Célula: '+(cel?'ligada':'desligada'); });
  ba.addEventListener('click', ()=>{ aut=!aut; K.setAuto(aut); ba.textContent='Girar: '+(aut?'ligado':'desligado'); });
  box._parar = ()=>K.parar();
}

/* ==================== DIAGRAMA Fe-C + ALAVANCA ==================== */
function figFeC(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      <label>Teor de carbono: <b class="vC">0,40</b>% C
        <input type="range" min="0" max="211" value="40" class="rC"></label>
      <label>Temperatura: <b class="vT">900</b> °C
        <input type="range" min="20" max="1200" value="900" class="rT"></label>
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const X = c => 40 + (c/2.2)*390;          // 0 a 2,2 %C
  const Y = t => 270 - (t/1250)*250;        // 0 a 1250 °C
  const A1 = 727, CE = 0.77, Cf = 0.022, Ccm = 6.7;
  // linha A3 (aproximada) e Acm
  let a3 = '', acm = '';
  for(let c=0; c<=CE; c+=0.02){ const t = 912 - (912-A1)*Math.pow(c/CE, 0.72);
    a3 += (c===0?'M':'L') + X(c).toFixed(1) + ' ' + Y(t).toFixed(1) + ' '; }
  for(let c=CE; c<=2.11; c+=0.02){ const t = A1 + (1148-A1)*Math.pow((c-CE)/(2.11-CE), 0.9);
    acm += (c===CE?'M':'L') + X(c).toFixed(1) + ' ' + Y(t).toFixed(1) + ' '; }
  svg.innerHTML = `
    <rect x="40" y="20" width="390" height="250" fill="var(--card)" stroke="var(--line)"/>
    <path d="${a3}" fill="none" stroke="#1e88e5" stroke-width="2"/>
    <path d="${acm}" fill="none" stroke="#8e24aa" stroke-width="2"/>
    <line x1="${X(0.022)}" y1="${Y(A1)}" x2="${X(2.11)}" y2="${Y(A1)}" stroke="#e53935" stroke-width="2"/>
    <line x1="${X(0.022)}" y1="${Y(A1)}" x2="${X(0.022)}" y2="${Y(0)}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <text x="${X(0.9)}" y="${Y(1000)}" font-size="12" fill="var(--ink2)">austenita γ</text>
    <text x="${X(0.05)}" y="${Y(500)}" font-size="11" fill="var(--ink2)">α</text>
    <text x="${X(0.5)}" y="${Y(400)}" font-size="11" fill="var(--ink2)">α + Fe₃C (perlita)</text>
    <text x="${X(1.5)}" y="${Y(400)}" font-size="11" fill="var(--ink2)">P + Fe₃C</text>
    <text x="${X(1.2)}" y="${Y(A1)-6}" font-size="10" fill="#e53935">A1 = 727 °C</text>
    <text x="${X(0.15)}" y="${Y(900)}" font-size="10" fill="#1e88e5">A3</text>
    <text x="${X(1.7)}" y="${Y(1050)}" font-size="10" fill="#8e24aa">Acm</text>
    <text x="14" y="150" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 150)">Temperatura (°C)</text>
    <text x="200" y="292" font-size="11" fill="var(--ink2)">% de carbono (massa)</text>
    <text x="26" y="${Y(0)+4}" font-size="9" fill="var(--muted)">0</text>
    <text x="20" y="${Y(600)}" font-size="9" fill="var(--muted)">600</text>
    <text x="14" y="${Y(1200)}" font-size="9" fill="var(--muted)">1200</text>
    <line class="lc" x1="0" y1="20" x2="0" y2="270" stroke="#0b5c34" stroke-width="1.6" stroke-dasharray="4 3"/>
    <line class="lt" x1="40" y1="0" x2="430" y2="0" stroke="#0b5c34" stroke-width="1.2" stroke-dasharray="2 3" opacity=".7"/>
    <circle class="pt" r="5" fill="#f5c518" stroke="#0b5c34" stroke-width="2"/>`;
  const rC = box.querySelector('.rC'), rT = box.querySelector('.rT');
  function atualiza(){
    const c = +rC.value/100, t = +rT.value;
    box.querySelector('.vC').textContent = c.toFixed(2).replace('.',',');
    box.querySelector('.vT').textContent = t;
    svg.querySelector('.lc').setAttribute('x1', X(c)); svg.querySelector('.lc').setAttribute('x2', X(c));
    svg.querySelector('.lt').setAttribute('y1', Y(t)); svg.querySelector('.lt').setAttribute('y2', Y(t));
    svg.querySelector('.pt').setAttribute('cx', X(c)); svg.querySelector('.pt').setAttribute('cy', Y(t));
    // fases e alavanca
    let txt='';
    const a3T = c<=CE ? 912 - (912-A1)*Math.pow(c/CE,0.72) : A1 + (1148-A1)*Math.pow((c-CE)/(2.11-CE),0.9);
    if(t >= 1148){ txt = `<div class="aviso a-warn">Acima de ~1148 °C nesta faixa já existe <b>líquido</b>.</div>`; }
    else if(t > a3T){ txt = `<div class="aviso a-ok"><b>100% austenita (γ)</b> — CFC, não magnética, dissolve bem o carbono.
        É desta região que se parte para qualquer tratamento térmico.</div>`; }
    else if(t > A1){
      const lado = c<=CE? 'ferrita α' : 'cementita Fe₃C';
      txt = `<div class="aviso a-warn">Região <b>bifásica</b>: austenita + ${lado}. É a faixa da têmpera intercrítica
        (aços dual-phase: ferrita + martensita).</div>`;
    } else {
      const perl = Math.min(1, Math.max(0, (c - Cf)/(CE - Cf)));
      const fFerr = Math.min(1, Math.max(0, (Ccm - c)/(Ccm - Cf)));
      const fCem  = 1 - fFerr;
      if(c <= CE){
        txt = `<div class="calc"><b>Regra da alavanca abaixo de 727 °C</b>
          <div class="mline">%perlita = ${fr(`C₀ − 0,022`, `0,77 − 0,022`)} = ${fr(`${c.toFixed(3).replace('.',',')} − 0,022`, `0,748`)} = <b>${nv(perl*100)}%</b></div>
          <div class="mline">%ferrita pró-eutetoide = 100 − ${nv(perl*100)} = <b>${nv(100-perl*100)}%</b></div>
          <div class="mline">Em fases: ferrita total = <b>${nv(fFerr*100)}%</b> · cementita = <b>${nv(fCem*100)}%</b></div>
          <p class="hint">Aço <b>${c<CE-0.001?'hipoeutetoide':'eutetoide'}</b>. A banca troca os braços da alavanca de propósito —
            a fração de uma fase usa o braço <b>oposto</b> a ela.</p></div>`;
      } else {
        const cemPro = Math.min(1, Math.max(0,(c - CE)/(Ccm - CE)));
        txt = `<div class="calc"><b>Aço hipereutetoide</b>
          <div class="mline">%cementita pró-eutetoide = ${fr(`C₀ − 0,77`, `6,7 − 0,77`)} = ${fr(`${c.toFixed(3).replace('.',',')} − 0,77`, `5,93`)} = <b>${nv(cemPro*100)}%</b></div>
          <div class="mline">%perlita = <b>${nv(100-cemPro*100)}%</b> · cementita total = <b>${nv(fCem*100)}%</b></div>
          <p class="hint">A cementita pró-eutetoide forma <b>rede nos contornos</b> — dura e frágil.</p></div>`;
      }
    }
    box.querySelector('.fdados').innerHTML = txt;
  }
  rC.addEventListener('input', atualiza); rT.addEventListener('input', atualiza); atualiza();
}

/* ========================= CURVA TTT ========================= */
function figTTT(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls"><div class="row">
      <button class="btn btn-s" data-p="0">Recozimento</button>
      <button class="btn btn-s" data-p="1">Normalização</button>
      <button class="btn btn-s" data-p="2">Têmpera</button>
      <button class="btn btn-s" data-p="3">Austêmpera</button>
    </div></div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const X = lt => 40 + (lt/4)*380;     // log10(t) de 0 a 4
  const Y = T => 265 - (T/900)*240;
  let ini='', fim='';
  for(let T=720; T>=250; T-=10){
    const d = Math.abs(T-550)/300;
    const lt0 = 0.35 + 2.6*d*d, lt1 = lt0 + 0.75;
    ini += (T===720?'M':'L') + X(lt0).toFixed(1)+' '+Y(T).toFixed(1)+' ';
    fim += (T===720?'M':'L') + X(lt1).toFixed(1)+' '+Y(T).toFixed(1)+' ';
  }
  svg.innerHTML = `
    <rect x="40" y="20" width="380" height="245" fill="var(--card)" stroke="var(--line)"/>
    <line x1="40" y1="${Y(727)}" x2="420" y2="${Y(727)}" stroke="#e53935" stroke-dasharray="4 3"/>
    <text x="330" y="${Y(727)-4}" font-size="10" fill="#e53935">A1 727 °C</text>
    <path d="${ini}" fill="none" stroke="#1e88e5" stroke-width="2"/>
    <path d="${fim}" fill="none" stroke="#8e24aa" stroke-width="2"/>
    <line x1="40" y1="${Y(220)}" x2="420" y2="${Y(220)}" stroke="#00897b" stroke-dasharray="6 3"/>
    <text x="46" y="${Y(220)-4}" font-size="10" fill="#00897b">Mi (início da martensita)</text>
    <text x="${X(2.4)}" y="${Y(620)}" font-size="11" fill="var(--ink2)">perlita</text>
    <text x="${X(2.4)}" y="${Y(380)}" font-size="11" fill="var(--ink2)">bainita</text>
    <text x="${X(0.5)}" y="${Y(150)}" font-size="11" fill="var(--ink2)">martensita</text>
    <text x="14" y="150" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 150)">Temperatura (°C)</text>
    <text x="180" y="290" font-size="11" fill="var(--ink2)">log do tempo →</text>
    <path class="cam" fill="none" stroke="#f5c518" stroke-width="3" stroke-linecap="round"/>`;
  const CAM = [
    {n:'Recozimento pleno', d:`M ${X(0.1)} ${Y(850)} C ${X(1.6)} ${Y(800)}, ${X(2.6)} ${Y(730)}, ${X(3.6)} ${Y(500)}`,
     r:'Resfriamento lento dentro do forno: cruza o nariz bem à direita e forma <b>perlita grossa</b>. Menor dureza, máxima ductilidade e usinabilidade.'},
    {n:'Normalização', d:`M ${X(0.1)} ${Y(850)} C ${X(1.0)} ${Y(760)}, ${X(1.6)} ${Y(700)}, ${X(2.2)} ${Y(400)}`,
     r:'Resfriamento ao ar: cruza o nariz mais à esquerda e forma <b>perlita fina</b>. Grão mais refinado e resistência maior que o recozido.'},
    {n:'Têmpera', d:`M ${X(0.1)} ${Y(850)} C ${X(0.25)} ${Y(700)}, ${X(0.32)} ${Y(400)}, ${X(0.45)} ${Y(90)}`,
     r:'Resfriamento brusco em água ou óleo: passa <b>à esquerda do nariz</b> sem tocar as curvas e cruza Mi — resultado <b>100% martensita</b>, dura e frágil. Exige revenido depois.'},
    {n:'Austêmpera', d:`M ${X(0.1)} ${Y(850)} C ${X(0.3)} ${Y(600)}, ${X(0.4)} ${Y(400)} L ${X(3.2)} ${Y(400)}`,
     r:'Mergulho rápido até ~400 °C e <b>permanência isotérmica</b> até transformar tudo: forma <b>bainita</b>. Boa tenacidade sem a distorção da têmpera.'}
  ];
  function mostra(i){
    svg.querySelector('.cam').setAttribute('d', CAM[i].d);
    box.querySelector('.fdados').innerHTML = `<div class="aviso a-ok"><b>${CAM[i].n}</b><br>${CAM[i].r}</div>`;
    box.querySelectorAll('[data-p]').forEach((b,j)=>b.classList.toggle('btn-p', j===i));
  }
  box.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click', ()=>mostra(+b.dataset.p)));
  mostra(2);
}

/* ======================= POURBAIX DO FERRO ======================= */
function figPourbaix(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      <label>pH: <b class="vp">7,0</b> <input type="range" min="0" max="140" value="70" class="rp"></label>
      <label>Potencial: <b class="ve">0,00</b> V <input type="range" min="-120" max="160" value="0" class="re"></label>
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const X = pH => 40 + (pH/14)*380;
  const Y = E => 150 - (E/1.2)*130;
  svg.innerHTML = `
    <rect x="40" y="20" width="380" height="245" fill="var(--card)" stroke="var(--line)"/>
    <path d="M40 20 L${X(9)} 20 L${X(9)} ${Y(-0.62)} L40 ${Y(-0.62)} Z" fill="#fdecea" opacity=".85"/>
    <path d="M${X(9)} 20 L420 20 L420 ${Y(-0.62)} L${X(9)} ${Y(-0.62)} Z" fill="#e8f6ee" opacity=".85"/>
    <rect x="40" y="${Y(-0.62)}" width="380" height="${265-Y(-0.62)}" fill="#e3f2fd" opacity=".85"/>
    <text x="${X(3)}" y="${Y(0.7)}" font-size="12" fill="#b3261e" font-weight="bold">CORROSÃO</text>
    <text x="${X(3.2)}" y="${Y(0.55)}" font-size="9" fill="#b3261e">Fe²⁺ dissolvido</text>
    <text x="${X(10.4)}" y="${Y(0.7)}" font-size="12" fill="#178a50" font-weight="bold">PASSIVAÇÃO</text>
    <text x="${X(10.4)}" y="${Y(0.55)}" font-size="9" fill="#178a50">óxido protetor</text>
    <text x="${X(5.6)}" y="${Y(-0.85)}" font-size="12" fill="#1565c0" font-weight="bold">IMUNIDADE</text>
    <text x="${X(5.2)}" y="${Y(-1.0)}" font-size="9" fill="#1565c0">Fe metálico estável</text>
    <line x1="40" y1="${Y(0)}" x2="420" y2="${Y(0)}" stroke="var(--line)"/>
    <text x="14" y="150" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 150)">Potencial E (V)</text>
    <text x="215" y="290" font-size="11" fill="var(--ink2)">pH</text>
    <text x="36" y="${Y(0)+4}" font-size="9" fill="var(--muted)">0</text>
    <text x="30" y="${Y(1.0)}" font-size="9" fill="var(--muted)">+1,0</text>
    <text x="28" y="${Y(-1.0)}" font-size="9" fill="var(--muted)">−1,0</text>
    <text x="${X(0)}" y="278" font-size="9" fill="var(--muted)">0</text>
    <text x="${X(7)}" y="278" font-size="9" fill="var(--muted)">7</text>
    <text x="${X(14)-8}" y="278" font-size="9" fill="var(--muted)">14</text>
    <circle class="pt" r="6" fill="#f5c518" stroke="#1a2332" stroke-width="2"/>`;
  const rp = box.querySelector('.rp'), re = box.querySelector('.re');
  function up(){
    const pH = +rp.value/10, E = +re.value/100;
    box.querySelector('.vp').textContent = pH.toFixed(1).replace('.',',');
    box.querySelector('.ve').textContent = E.toFixed(2).replace('.',',');
    const pt = svg.querySelector('.pt');
    pt.setAttribute('cx', X(pH)); pt.setAttribute('cy', Y(E));
    let reg, cor, txt;
    if(E < -0.62){ reg='IMUNIDADE'; cor='a-ok';
      txt='O ferro metálico é a forma estável — não corrói. É exatamente isso que a <b>proteção catódica</b> faz: empurra o potencial da estrutura para baixo, até esta região.'; }
    else if(pH < 9){ reg='CORROSÃO'; cor='a-err';
      txt='O ferro se dissolve como Fe²⁺. É a situação de um cano de aço em água neutra ou ácida sem proteção nenhuma.'; }
    else { reg='PASSIVAÇÃO'; cor='a-ok';
      txt='Forma-se um óxido fino e aderente que protege o metal. É o princípio de manter a água de caldeira alcalina (pH alto) para proteger a tubulação.'; }
    box.querySelector('.fdados').innerHTML = `<div class="aviso ${cor}"><b>Região: ${reg}</b><br>${txt}</div>
      <p class="hint">Pergunta clássica da banca: "que potencial protege o cano em pH 7?" — desça na vertical até entrar na
      imunidade. A resposta é sempre um valor <b>negativo</b> (abaixo de ≈ −0,62 V). O distrator é o mesmo número positivo.</p>`;
  }
  rp.addEventListener('input', up); re.addEventListener('input', up); up();
}

/* =================== CURVA TENSÃO-DEFORMAÇÃO =================== */
function figTracao(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls"><div class="row">
      <button class="btn btn-s" data-z="0">Regiões</button>
      <button class="btn btn-s" data-z="1">Resiliência</button>
      <button class="btn btn-s" data-z="2">Tenacidade</button>
    </div></div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const X = e => 40 + e*3400, Y = s => 265 - s*0.42;
  let d='M '+X(0)+' '+Y(0);
  for(let e=0; e<=0.10; e+=0.002){
    let s;
    if(e<0.0025) s = e*100000;
    else if(e<0.012) s = 250 + (e-0.0025)*900;
    else s = 250 + 8.5 + 320*Math.sin(Math.min(1,(e-0.012)/0.075)*1.5);
    d += ' L '+X(e).toFixed(1)+' '+Y(s).toFixed(1);
  }
  svg.innerHTML = `
    <rect x="40" y="20" width="380" height="245" fill="var(--card)" stroke="var(--line)"/>
    <path class="area" d="" fill="#f5c518" opacity=".35"/>
    <path d="${d}" fill="none" stroke="#0b5c34" stroke-width="2.4"/>
    <line x1="${X(0.002)}" y1="265" x2="${X(0.0145)}" y2="${Y(260)}" stroke="#e53935" stroke-dasharray="3 3"/>
    <circle cx="${X(0.0025)}" cy="${Y(250)}" r="4" fill="#e53935"/>
    <text x="${X(0.006)}" y="${Y(235)}" font-size="10" fill="#e53935">escoamento (0,2%)</text>
    <circle cx="${X(0.087)}" cy="${Y(578)}" r="4" fill="#8e24aa"/>
    <text x="${X(0.062)}" y="${Y(610)}" font-size="10" fill="#8e24aa">limite de resistência</text>
    <text x="${X(0.001)}" y="${Y(120)}" font-size="10" fill="#1e88e5" transform="rotate(-90 ${X(0.001)} ${Y(120)})">região elástica</text>
    <text x="14" y="150" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 150)">Tensão σ (MPa)</text>
    <text x="180" y="290" font-size="11" fill="var(--ink2)">Deformação ε</text>
    <text x="${X(0.0)}" y="278" font-size="9" fill="var(--muted)">0</text>
    <text x="${X(0.05)}" y="278" font-size="9" fill="var(--muted)">5%</text>
    <text x="${X(0.1)}-10" y="278" font-size="9" fill="var(--muted)">10%</text>`;
  const INFO = [
    `<div class="aviso a-ok"><b>Leitura da curva</b><br>A inclinação da parte reta é o <b>módulo de elasticidade E</b> (σ = E·ε).
      O escoamento é medido pela reta paralela deslocada em 0,2%. O ponto mais alto é o <b>limite de resistência</b>;
      depois dele começa a estricção, e a curva cai até a ruptura.</div>`,
    `<div class="aviso a-warn"><b>Resiliência</b> = área <b>só da parte elástica</b>. É a energia que o material devolve ao ser descarregado.
      Fórmula: U<sub>r</sub> = ${fr('σ<sub>e</sub>²','2E')}. Material resiliente ≠ material tenaz.</div>`,
    `<div class="aviso a-warn"><b>Tenacidade</b> = área <b>total</b> sob a curva, até a ruptura. É a energia que o material absorve antes de quebrar.
      Um aço de alta resistência mas frágil pode ter tenacidade MENOR que um aço mais macio e dúctil — é a pegadinha favorita da banca.</div>`
  ];
  function sel(i){
    const a = svg.querySelector('.area');
    if(i===1) a.setAttribute('d', `M ${X(0)} ${Y(0)} L ${X(0.0025)} ${Y(250)} L ${X(0.0025)} ${Y(0)} Z`);
    else if(i===2) a.setAttribute('d', d + ` L ${X(0.1)} ${Y(0)} L ${X(0)} ${Y(0)} Z`);
    else a.setAttribute('d','');
    box.querySelector('.fdados').innerHTML = INFO[i];
    box.querySelectorAll('[data-z]').forEach((b,j)=>b.classList.toggle('btn-p', j===i));
  }
  box.querySelectorAll('[data-z]').forEach(b=>b.addEventListener('click', ()=>sel(+b.dataset.z)));
  sel(0);
}

/* ==================== SCHAEFFLER COM DILUIÇÃO ==================== */
function figSchaeffler(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 320" class="fsvg"></svg></div>
    <div class="ctrls">
      <div class="row">
        <label style="flex:1">Metal de base — Cr<sub>eq</sub>: <b class="v1">18,0</b>
          <input type="range" min="0" max="400" value="180" class="r1"></label>
        <label style="flex:1">Ni<sub>eq</sub>: <b class="v2">12,0</b>
          <input type="range" min="0" max="320" value="120" class="r2"></label>
      </div>
      <div class="row">
        <label style="flex:1">Metal de adição — Cr<sub>eq</sub>: <b class="v3">24,0</b>
          <input type="range" min="0" max="400" value="240" class="r3"></label>
        <label style="flex:1">Ni<sub>eq</sub>: <b class="v4">13,0</b>
          <input type="range" min="0" max="320" value="130" class="r4"></label>
      </div>
      <label>Diluição: <b class="v5">30</b>% <input type="range" min="0" max="100" value="30" class="r5"></label>
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const X = c => 40 + (c/40)*380, Y = n => 275 - (n/32)*250;
  svg.innerHTML = `
    <rect x="40" y="20" width="380" height="255" fill="var(--card)" stroke="var(--line)"/>
    <path d="M${X(0)} ${Y(8)} L${X(40)} ${Y(32)} L${X(40)} ${Y(32)} L${X(0)} ${Y(32)} Z" fill="#e3f2fd" opacity=".7"/>
    <path d="M${X(0)} ${Y(0)} L${X(14)} ${Y(0)} L${X(0)} ${Y(6)} Z" fill="#fdecea" opacity=".7"/>
    <path d="M${X(14)} ${Y(0)} L${X(40)} ${Y(0)} L${X(40)} ${Y(14)} Z" fill="#fff8e1" opacity=".9"/>
    <text x="${X(6)}" y="${Y(24)}" font-size="12" fill="#1565c0" font-weight="bold">A (austenita)</text>
    <text x="${X(3)}" y="${Y(2)}" font-size="11" fill="#b3261e" font-weight="bold">M</text>
    <text x="${X(30)}" y="${Y(4)}" font-size="12" fill="#8a6d00" font-weight="bold">F (ferrita)</text>
    <text x="${X(17)}" y="${Y(11)}" font-size="10" fill="var(--ink2)">A+F</text>
    <text x="${X(9)}" y="${Y(6)}" font-size="10" fill="var(--ink2)">A+M</text>
    <text x="14" y="160" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 160)">Ni equivalente</text>
    <text x="170" y="305" font-size="11" fill="var(--ink2)">Cr equivalente</text>
    <line class="ln" stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="4 3"/>
    <circle class="mb" r="5" fill="#1e88e5" stroke="#fff" stroke-width="1.5"/>
    <circle class="ma" r="5" fill="#8e24aa" stroke="#fff" stroke-width="1.5"/>
    <circle class="zf" r="7" fill="#f5c518" stroke="#1a2332" stroke-width="2"/>
    <text class="tmb" font-size="9" fill="#1e88e5">MB</text>
    <text class="tma" font-size="9" fill="#8e24aa">MA</text>
    <text class="tzf" font-size="10" fill="#1a2332" font-weight="bold">solda</text>`;
  const R = ['.r1','.r2','.r3','.r4','.r5'].map(s=>box.querySelector(s));
  function up(){
    const cb=+R[0].value/10, nb=+R[1].value/10, ca=+R[2].value/10, na=+R[3].value/10, dil=+R[4].value/100;
    box.querySelector('.v1').textContent = cb.toFixed(1).replace('.',',');
    box.querySelector('.v2').textContent = nb.toFixed(1).replace('.',',');
    box.querySelector('.v3').textContent = ca.toFixed(1).replace('.',',');
    box.querySelector('.v4').textContent = na.toFixed(1).replace('.',',');
    box.querySelector('.v5').textContent = (dil*100).toFixed(0);
    const cz = ca + (cb-ca)*dil, nz = na + (nb-na)*dil;
    const ln = svg.querySelector('.ln');
    ln.setAttribute('x1',X(cb)); ln.setAttribute('y1',Y(nb)); ln.setAttribute('x2',X(ca)); ln.setAttribute('y2',Y(na));
    svg.querySelector('.mb').setAttribute('cx',X(cb)); svg.querySelector('.mb').setAttribute('cy',Y(nb));
    svg.querySelector('.ma').setAttribute('cx',X(ca)); svg.querySelector('.ma').setAttribute('cy',Y(na));
    svg.querySelector('.zf').setAttribute('cx',X(cz)); svg.querySelector('.zf').setAttribute('cy',Y(nz));
    svg.querySelector('.tmb').setAttribute('x',X(cb)+8); svg.querySelector('.tmb').setAttribute('y',Y(nb)-6);
    svg.querySelector('.tma').setAttribute('x',X(ca)+8); svg.querySelector('.tma').setAttribute('y',Y(na)-6);
    svg.querySelector('.tzf').setAttribute('x',X(cz)+9); svg.querySelector('.tzf').setAttribute('y',Y(nz)+4);
    box.querySelector('.fdados').innerHTML = `<div class="calc">
      <b>Como o ponto da solda é achado</b>
      <div class="mline">Cr<sub>eq</sub> da zona fundida = Cr<sub>MA</sub> + (Cr<sub>MB</sub> − Cr<sub>MA</sub>) × diluição</div>
      <div class="mline">= ${nv(ca,1)} + (${nv(cb,1)} − ${nv(ca,1)}) × ${nv(dil,2)} = <b>${nv(cz,2)}</b></div>
      <div class="mline">Ni<sub>eq</sub> = ${nv(na,1)} + (${nv(nb,1)} − ${nv(na,1)}) × ${nv(dil,2)} = <b>${nv(nz,2)}</b></div>
      </div>
      <p class="hint">Fórmulas: Cr<sub>eq</sub> = %Cr + %Mo + 1,5×%Si + 0,5×%Nb · Ni<sub>eq</sub> = %Ni + 30×%C + 0,5×%Mn.
      O ponto da solda cai <b>na reta entre MB e MA</b>, à fração da diluição partindo do metal de adição.
      Alvo usual em inox austenítico: cair na faixa A + 5 a 10% de ferrita, que evita trinca a quente.</p>`;
  }
  R.forEach(r=>r.addEventListener('input', up)); up();
}
