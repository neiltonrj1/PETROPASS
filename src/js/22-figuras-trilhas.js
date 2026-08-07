/* ===================================================================
   FIGURAS INTERATIVAS DAS TRILHAS NOVAS
   (Produção, Elétrica e Análise de Projetos)

   Mesmo padrão das figuras do volume de Inspeção: cada função recebe
   a caixa onde deve desenhar, monta um SVG na hora e reage aos
   controles. Nada de imagem externa — funciona offline.
   =================================================================== */

/* Atalho: cria um controle deslizante rotulado. */
function _slider(id, rot, min, max, passo, val, unid){
  return `<label class="fsl"><span>${rot}: <b id="${id}v">${val}${unid||''}</b></span>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${passo}" value="${val}"></label>`;
}
function _liga(box, ids, redesenha){
  ids.forEach(id=>{
    const el = box.querySelector('#'+id);
    if(el) el.addEventListener('input', redesenha);
  });
  redesenha();
}

/* ---------------- ELÉTRICA: triângulo de potências ---------------- */
function figTriangulo(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      ${_slider('tpP','Potência ativa P',10,200,5,100,' kW')}
      ${_slider('tpFP','Fator de potência da carga',50,100,1,70,'%')}
      ${_slider('tpAlvo','Corrigir para',80,100,1,92,'%')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');

  const desenha = ()=>{
    const P = +box.querySelector('#tpP').value;
    const fp = +box.querySelector('#tpFP').value/100;
    const alvo = +box.querySelector('#tpAlvo').value/100;
    box.querySelector('#tpPv').textContent = P+' kW';
    box.querySelector('#tpFPv').textContent = (fp*100).toFixed(0)+'%';
    box.querySelector('#tpAlvov').textContent = (alvo*100).toFixed(0)+'%';

    const fi   = Math.acos(fp),  fi2 = Math.acos(alvo);
    const Q    = P*Math.tan(fi),  Q2 = P*Math.tan(fi2);
    const S    = P/fp,            S2 = P/alvo;
    const Qcap = Q - Q2;

    /* escala: o maior S sempre cabe na figura */
    const k = 300/Math.max(S, 1);
    const x0 = 60, y0 = 250;
    const px = x0 + P*k, qy = y0 - Q*k, qy2 = y0 - Q2*k;

    svg.innerHTML = `
      <line x1="${x0}" y1="${y0}" x2="430" y2="${y0}" stroke="var(--line)"/>
      <line x1="${x0}" y1="${y0}" x2="${x0}" y2="20" stroke="var(--line)"/>
      <polygon points="${x0},${y0} ${px},${y0} ${px},${qy}" fill="#e5393520" stroke="none"/>
      <line x1="${x0}" y1="${y0}" x2="${px}" y2="${y0}" stroke="#118A52" stroke-width="3"/>
      <line x1="${px}" y1="${y0}" x2="${px}" y2="${qy}" stroke="#e53935" stroke-width="3"/>
      <line x1="${x0}" y1="${y0}" x2="${px}" y2="${qy}" stroke="#1e88e5" stroke-width="3"/>
      <line x1="${px}" y1="${y0}" x2="${px}" y2="${qy2}" stroke="#8e24aa" stroke-width="3" stroke-dasharray="5 3"/>
      <line x1="${x0}" y1="${y0}" x2="${px}" y2="${qy2}" stroke="#8e24aa" stroke-width="2" stroke-dasharray="5 3"/>
      <text x="${(x0+px)/2-14}" y="${y0+16}" font-size="11" fill="#118A52">P = ${P} kW</text>
      <text x="${px+6}" y="${(y0+qy)/2}" font-size="11" fill="#e53935">Q = ${Q.toFixed(0)} kvar</text>
      <text x="${(x0+px)/2-42}" y="${(y0+qy)/2-6}" font-size="11" fill="#1e88e5">S = ${S.toFixed(0)} kVA</text>
      <text x="${px+6}" y="${qy2-6}" font-size="10" fill="#8e24aa">depois: ${S2.toFixed(0)} kVA</text>
      <text x="${x0+16}" y="${y0-6}" font-size="10" fill="var(--muted)">φ = ${(fi*180/Math.PI).toFixed(0)}°</text>`;

    const queda = (1 - S2/S)*100;
    dados.innerHTML = `
      <div class="aviso a-ok"><b>Banco de capacitores necessário:</b>
        Q<sub>cap</sub> = P·(tg φ₁ − tg φ₂) = ${P}·(${Math.tan(fi).toFixed(3)} − ${Math.tan(fi2).toFixed(3)})
        = <b>${Qcap.toFixed(1)} kvar</b>.</div>
      <div class="aviso a-warn"><b>O que muda na instalação:</b> a potência aparente cai de
        ${S.toFixed(0)} para ${S2.toFixed(0)} kVA, ou seja, a <b>corrente cai ${queda.toFixed(1)}%</b>
        para a mesma potência ativa. Como a perda Joule vai com o quadrado da corrente, ela cai
        cerca de <b>${(100-Math.pow(S2/S,2)*100).toFixed(1)}%</b>.</div>
      <div class="aviso a-err"><b>Pegadinha:</b> a potência ativa <b>não muda</b> — o processo continua
        consumindo os mesmos ${P} kW. Corrigir o fator de potência alivia a rede, não a conta de energia ativa.</div>`;
  };
  _liga(box, ['tpP','tpFP','tpAlvo'], desenha);
}

/* ---------------- ELÉTRICA: conjugado × velocidade do motor de indução ---------------- */
function figConjugado(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      ${_slider('cjV','Tensão aplicada',50,110,5,100,'% da nominal')}
      ${_slider('cjR','Resistência do rotor',1,6,1,1,'× a de fábrica')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');

  const desenha = ()=>{
    const v = +box.querySelector('#cjV').value/100;
    const r = +box.querySelector('#cjR').value;
    box.querySelector('#cjVv').textContent = (v*100).toFixed(0)+'% da nominal';
    box.querySelector('#cjRv').textContent = r+'× a de fábrica';

    /* Kloss: T/Tmax = 2 / (s/sm + sm/s), com sm proporcional a R2 */
    const sm = 0.15*r, Tmax = 2.6*v*v;
    const X = s => 420 - s*380, Y = t => 260 - t*70;
    let d='';
    for(let s=1; s>=0.001; s-=0.005){
      const T = Tmax*2/(s/sm + sm/s);
      d += (d?' L ':'M ')+X(s).toFixed(1)+' '+Y(T).toFixed(1);
    }
    const Tpart = Tmax*2/(1/sm + sm);
    const Tcarga = 1.0;
    svg.innerHTML = `
      <line x1="40" y1="260" x2="440" y2="260" stroke="var(--line)"/>
      <line x1="40" y1="260" x2="40" y2="20" stroke="var(--line)"/>
      <line x1="40" y1="${Y(Tcarga)}" x2="440" y2="${Y(Tcarga)}" stroke="#8e24aa" stroke-dasharray="4 3"/>
      <text x="330" y="${Y(Tcarga)-5}" font-size="10" fill="#8e24aa">conjugado da carga</text>
      <path d="${d}" fill="none" stroke="#1e88e5" stroke-width="2.6"/>
      <circle cx="${X(1)}" cy="${Y(Tpart)}" r="4" fill="#e53935"/>
      <text x="${X(1)+6}" y="${Y(Tpart)-6}" font-size="10" fill="#e53935">partida (s = 1)</text>
      <circle cx="${X(sm)}" cy="${Y(Tmax)}" r="4" fill="#118A52"/>
      <text x="${X(sm)-30}" y="${Y(Tmax)-8}" font-size="10" fill="#118A52">conjugado máximo</text>
      <text x="${X(0)-40}" y="278" font-size="10" fill="var(--muted)">síncrona</text>
      <text x="${X(1)-8}" y="278" font-size="10" fill="var(--muted)">0</text>
      <text x="200" y="292" font-size="11" fill="var(--ink2)">velocidade →</text>
      <text x="14" y="160" font-size="11" fill="var(--ink2)" transform="rotate(-90 14 160)">conjugado</text>`;

    const parte = Tpart > Tcarga;
    dados.innerHTML = `
      <div class="aviso a-ok"><b>Conjugado ∝ tensão².</b> Com ${(v*100).toFixed(0)}% da tensão, o conjugado
        de partida é <b>${(Tpart).toFixed(2)}</b> (em múltiplos do nominal da carga) e o máximo,
        <b>${Tmax.toFixed(2)}</b>. Repare que o <b>valor do pico não muda</b> quando você mexe na
        resistência do rotor — só o escorregamento em que ele acontece.</div>
      <div class="aviso ${parte?'a-ok':'a-err'}"><b>${parte? 'O motor parte.' : 'O motor NÃO parte.'}</b>
        ${parte? 'O conjugado de partida está acima do exigido pela carga.'
               : 'O conjugado de partida ficou abaixo do da carga: o rotor trava, a corrente fica alta e a proteção atua. É o que acontece ao usar estrela-triângulo com carga pesada.'}</div>
      <div class="aviso a-warn"><b>Rotor bobinado:</b> aumentar a resistência do rotor empurra o pico para
        a esquerda (escorregamento maior) e é assim que se ganha conjugado de partida sem elevar a corrente.</div>`;
  };
  _liga(box, ['cjV','cjR'], desenha);
}

/* ---------------- ELÉTRICA: curva do relé de sobrecorrente ---------------- */
function figRele(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      <div class="row">
        <button class="btn btn-s" data-c="NI">Normalmente inversa</button>
        <button class="btn btn-s" data-c="MI">Muito inversa</button>
        <button class="btn btn-s" data-c="EI">Extremamente inversa</button>
      </div>
      ${_slider('rlDial','Dial de tempo',5,100,5,50,'')}
      ${_slider('rlM','Corrente da falta',110,2000,10,600,'% do ajuste')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');
  const CURVAS = {NI:{k:0.14,a:0.02,nome:'normalmente inversa'},
                  MI:{k:13.5,a:1,nome:'muito inversa'},
                  EI:{k:80,a:2,nome:'extremamente inversa'}};
  let atual = 'NI';

  const desenha = ()=>{
    const dial = +box.querySelector('#rlDial').value/100;
    const M = +box.querySelector('#rlM').value/100;
    box.querySelector('#rlDialv').textContent = dial.toFixed(2);
    box.querySelector('#rlMv').textContent = (M*100).toFixed(0)+'% do ajuste';
    box.querySelectorAll('[data-c]').forEach(b=>b.classList.toggle('btn-p', b.dataset.c===atual));

    const tempo = (c,m)=> dial*c.k/(Math.pow(m,c.a)-1);
    /* eixos em escala logarítmica */
    const X = m => 45 + (Math.log10(m)-0.04)*270;
    const Y = t => 262 - (Math.log10(Math.max(t,0.01))+2)*62;

    let paths='';
    for(const [id,c] of Object.entries(CURVAS)){
      let d='';
      for(let m=1.1; m<=20; m*=1.03){
        const t = tempo(c,m);
        if(t>100) continue;
        d += (d?' L ':'M ')+X(m).toFixed(1)+' '+Y(t).toFixed(1);
      }
      const cor = id===atual? '#1e88e5' : 'var(--line)';
      paths += `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${id===atual?2.6:1.4}"/>`;
    }
    const t = tempo(CURVAS[atual], M);
    svg.innerHTML = `
      <line x1="45" y1="262" x2="440" y2="262" stroke="var(--line)"/>
      <line x1="45" y1="262" x2="45" y2="20" stroke="var(--line)"/>
      ${[1,2,5,10,20].map(m=>`<line x1="${X(m)}" y1="262" x2="${X(m)}" y2="20" stroke="var(--line)" stroke-dasharray="2 4"/>
        <text x="${X(m)-5}" y="276" font-size="9" fill="var(--muted)">${m}×</text>`).join('')}
      ${[0.1,1,10].map(v=>`<line x1="45" y1="${Y(v)}" x2="440" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/>
        <text x="16" y="${Y(v)+3}" font-size="9" fill="var(--muted)">${v}s</text>`).join('')}
      ${paths}
      <circle cx="${X(M)}" cy="${Y(t)}" r="5" fill="#e53935"/>
      <text x="${Math.min(X(M)+8,360)}" y="${Y(t)-8}" font-size="11" fill="#e53935">${t.toFixed(2)} s</text>
      <text x="180" y="292" font-size="11" fill="var(--ink2)">múltiplo da corrente de ajuste</text>`;

    const c = CURVAS[atual];
    dados.innerHTML = `
      <div class="aviso a-ok"><b>Conta da prova.</b> Curva ${c.nome}: K = ${c.k}, α = ${c.a}.<br>
        t = DT·K ÷ [(I/I<sub>aj</sub>)<sup>α</sup> − 1] = ${dial.toFixed(2)}·${c.k} ÷ [${M.toFixed(2)}<sup>${c.a}</sup> − 1]
        = <b>${t.toFixed(2)} s</b>.</div>
      <div class="aviso a-warn"><b>Leitura da curva:</b> quanto maior a corrente, menor o tempo — é o que
        significa "tempo inverso". Aumentar o <b>dial</b> desloca a curva inteira para cima, sem mudar o formato:
        é assim que se abre o degrau de coordenação entre dois relés em série.</div>
      <div class="aviso a-err"><b>Cuidado:</b> se a corrente da falta ficar <b>abaixo do ajuste</b> (múltiplo ≤ 1),
        o denominador zera e o relé simplesmente <b>não atua</b>. Por isso o ajuste tem que ficar abaixo da menor
        corrente de curto do trecho protegido.</div>`;
  };
  box.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click', ()=>{ atual=b.dataset.c; desenha(); }));
  _liga(box, ['rlDial','rlM'], desenha);
}

/* ---------------- PRODUÇÃO: curva ABC ---------------- */
function figABC(box){
  const ITENS = [
    ['Válvula de controle', 40, 5200], ['Selo mecânico', 120, 1500], ['Rolamento', 300, 380],
    ['Correia', 500, 90], ['Filtro', 800, 45], ['Parafuso', 12000, 2],
    ['Junta de vedação', 3000, 12], ['Eletrodo', 2500, 8], ['Luva', 900, 25], ['Graxa (kg)', 600, 40],
  ];
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      ${_slider('abA','Corte da classe A',50,90,5,80,'% do valor')}
      ${_slider('abB','Corte da classe B',85,99,1,95,'% do valor')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');

  const desenha = ()=>{
    const cA = +box.querySelector('#abA').value, cB = +box.querySelector('#abB').value;
    box.querySelector('#abAv').textContent = cA+'% do valor';
    box.querySelector('#abBv').textContent = cB+'% do valor';

    const lista = ITENS.map(([n,q,c])=>({n, q, c, v:q*c})).sort((a,b)=>b.v-a.v);
    const total = lista.reduce((a,i)=>a+i.v,0);
    let acum=0;
    lista.forEach(i=>{ acum += i.v; i.acum = acum/total*100; i.classe = i.acum<=cA?'A':(i.acum<=cB?'B':'C'); });

    const larg = 360/lista.length;
    const COR = {A:'#e53935', B:'#f5a623', C:'#118A52'};
    let barras='', linha='';
    lista.forEach((i,k)=>{
      const h = i.v/lista[0].v*180;
      barras += `<rect x="${50+k*larg}" y="${240-h}" width="${larg-4}" height="${h}" fill="${COR[i.classe]}" opacity=".85"/>
        <text x="${50+k*larg+larg/2}" y="252" font-size="8" fill="var(--muted)" text-anchor="middle">${i.classe}</text>`;
      linha += (k?' L ':'M ')+(50+k*larg+larg/2)+' '+(240-i.acum/100*180);
    });
    svg.innerHTML = `
      <line x1="45" y1="240" x2="425" y2="240" stroke="var(--line)"/>
      <line x1="45" y1="240" x2="45" y2="30" stroke="var(--line)"/>
      ${barras}
      <path d="${linha}" fill="none" stroke="#1e88e5" stroke-width="2" stroke-dasharray="4 3"/>
      <line x1="45" y1="${240-cA/100*180}" x2="425" y2="${240-cA/100*180}" stroke="#e53935" stroke-dasharray="3 3"/>
      <text x="380" y="${240-cA/100*180-4}" font-size="9" fill="#e53935">${cA}%</text>
      <line x1="45" y1="${240-cB/100*180}" x2="425" y2="${240-cB/100*180}" stroke="#f5a623" stroke-dasharray="3 3"/>
      <text x="380" y="${240-cB/100*180-4}" font-size="9" fill="#f5a623">${cB}%</text>
      <text x="14" y="150" font-size="10" fill="var(--ink2)" transform="rotate(-90 14 150)">valor de consumo</text>
      <text x="150" y="278" font-size="10" fill="var(--ink2)">itens ordenados por consumo × custo</text>`;

    const conta = c => lista.filter(i=>i.classe===c);
    const linhaTab = c => {
      const g = conta(c);
      const val = g.reduce((a,i)=>a+i.v,0)/total*100;
      return `<tr><td><b>${c}</b></td><td>${g.length} (${(g.length/lista.length*100).toFixed(0)}%)</td>
        <td>${val.toFixed(1)}%</td><td>${g.map(i=>i.n).join(', ')||'—'}</td></tr>`;
    };
    dados.innerHTML = `
      <div class="tw"><table><thead><tr><th>Classe</th><th>Itens</th><th>Valor</th><th>Quais</th></tr></thead>
        <tbody>${linhaTab('A')}${linhaTab('B')}${linhaTab('C')}</tbody></table></div>
      <div class="aviso a-ok"><b>Como a banca monta a questão:</b> ela dá consumo anual e custo unitário.
        Multiplique um pelo outro, ordene do maior para o menor, acumule o percentual e corte.
        <b>Não é o preço nem a quantidade isolados</b> — é o produto dos dois.</div>
      <div class="aviso a-err"><b>Repare no parafuso:</b> 12 000 unidades por ano a R$ 2,00. É o item de maior
        quantidade e mesmo assim cai na classe C. E a válvula, com só 40 unidades, é classe A.</div>`;
  };
  _liga(box, ['abA','abB'], desenha);
}

/* ---------------- PRODUÇÃO: ponto de equilíbrio ---------------- */
function figEquilibrio(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      ${_slider('peCF','Custo fixo',100,900,50,600,' mil')}
      ${_slider('pePV','Preço de venda',40,150,5,90,' R$/un')}
      ${_slider('peCV','Custo variável',10,120,5,60,' R$/un')}
      ${_slider('peQ','Volume atual',0,30,1,15,' mil un')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');

  const desenha = ()=>{
    const CF = +box.querySelector('#peCF').value*1000;
    const PV = +box.querySelector('#pePV').value;
    const CV = +box.querySelector('#peCV').value;
    const Q  = +box.querySelector('#peQ').value*1000;
    box.querySelector('#peCFv').textContent = (CF/1000)+' mil';
    box.querySelector('#pePVv').textContent = PV+' R$/un';
    box.querySelector('#peCVv').textContent = CV+' R$/un';
    box.querySelector('#peQv').textContent = (Q/1000)+' mil un';

    const MC = PV - CV;
    const PE = MC>0 ? CF/MC : Infinity;
    const QMAX = 30000, VMAX = Math.max(PV*QMAX, CF+CV*QMAX);
    const X = q => 50 + q/QMAX*370;
    const Y = v => 250 - v/VMAX*215;
    const lucro = Q*MC - CF;

    svg.innerHTML = `
      <line x1="50" y1="250" x2="425" y2="250" stroke="var(--line)"/>
      <line x1="50" y1="250" x2="50" y2="25" stroke="var(--line)"/>
      <polygon points="${X(0)},${Y(CF)} ${X(QMAX)},${Y(CF+CV*QMAX)} ${X(QMAX)},${Y(PV*QMAX)}"
        fill="#118A5220" stroke="none"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(QMAX)}" y2="${Y(PV*QMAX)}" stroke="#118A52" stroke-width="2.6"/>
      <line x1="${X(0)}" y1="${Y(CF)}" x2="${X(QMAX)}" y2="${Y(CF+CV*QMAX)}" stroke="#e53935" stroke-width="2.6"/>
      <line x1="${X(0)}" y1="${Y(CF)}" x2="${X(QMAX)}" y2="${Y(CF)}" stroke="#8e24aa" stroke-width="1.6" stroke-dasharray="4 3"/>
      <text x="${X(QMAX)-60}" y="${Y(PV*QMAX)+14}" font-size="10" fill="#118A52">receita</text>
      <text x="${X(QMAX)-70}" y="${Y(CF+CV*QMAX)-6}" font-size="10" fill="#e53935">custo total</text>
      <text x="${X(0)+6}" y="${Y(CF)-5}" font-size="10" fill="#8e24aa">custo fixo</text>
      ${isFinite(PE) && PE<=QMAX ? `
        <line x1="${X(PE)}" y1="250" x2="${X(PE)}" y2="${Y(PV*PE)}" stroke="var(--ink2)" stroke-dasharray="3 3"/>
        <circle cx="${X(PE)}" cy="${Y(PV*PE)}" r="5" fill="var(--ink)"/>
        <text x="${X(PE)-16}" y="264" font-size="10" fill="var(--ink)">${(PE/1000).toFixed(1)} mil</text>` : ''}
      <line x1="${X(Q)}" y1="250" x2="${X(Q)}" y2="25" stroke="#1e88e5" stroke-dasharray="2 3"/>
      <text x="${X(Q)+4}" y="36" font-size="10" fill="#1e88e5">volume atual</text>`;

    const ms = (isFinite(PE)&&Q>0) ? (Q-PE)/Q*100 : 0;
    const gao = lucro>0 ? (Q*MC)/lucro : 0;
    dados.innerHTML = `
      <div class="aviso ${MC>0?'a-ok':'a-err'}"><b>Margem de contribuição:</b> ${PV} − ${CV} =
        <b>R$ ${MC.toFixed(2)}/un</b>${MC<=0?' — com margem zero ou negativa não existe ponto de equilíbrio: vender mais só aumenta o prejuízo.':''}<br>
        ${MC>0? `<b>Ponto de equilíbrio:</b> CF ÷ MC = ${CF.toLocaleString('pt-BR')} ÷ ${MC.toFixed(2)} =
        <b>${Math.round(PE).toLocaleString('pt-BR')} unidades</b>.` : ''}</div>
      <div class="aviso ${lucro>=0?'a-ok':'a-err'}"><b>No volume atual:</b> resultado de
        <b>R$ ${lucro.toLocaleString('pt-BR',{maximumFractionDigits:0})}</b>
        ${isFinite(PE)&&Q>0? `· margem de segurança de <b>${ms.toFixed(0)}%</b>` : ''}
        ${lucro>0? `· grau de alavancagem operacional (MC ÷ lucro) = <b>${gao.toFixed(2)}</b>` : ''}.</div>
      <div class="aviso a-warn"><b>Para justificar um aumento de capacidade</b> que acrescente ΔCF ao custo fixo,
        a demanda precisa crescer <b>ΔCF ÷ MC</b> unidades. Com esta margem, cada R$ 100 mil de custo fixo novo
        exige <b>${MC>0? Math.round(100000/MC).toLocaleString('pt-BR') : '—'}</b> unidades a mais.</div>`;
  };
  _liga(box, ['peCF','pePV','peCV','peQ'], desenha);
}

/* ---------------- PROJETOS: perfil do VPL e a TIR ---------------- */
function figVPL(box){
  box.innerHTML = `
    <div class="svgwrap"><svg viewBox="0 0 460 300" class="fsvg"></svg></div>
    <div class="ctrls">
      ${_slider('vpI','Investimento inicial',50,300,10,100,' mil')}
      ${_slider('vpF','Entrada anual',10,90,5,40,' mil')}
      ${_slider('vpN','Duração',2,10,1,4,' anos')}
      ${_slider('vpT','TMA',1,40,1,10,'% a.a.')}
    </div>
    <div class="fdados"></div>`;
  const svg = box.querySelector('.fsvg');
  const dados = box.querySelector('.fdados');

  const desenha = ()=>{
    const I = +box.querySelector('#vpI').value;
    const F = +box.querySelector('#vpF').value;
    const N = +box.querySelector('#vpN').value;
    const TMA = +box.querySelector('#vpT').value/100;
    box.querySelector('#vpIv').textContent = I+' mil';
    box.querySelector('#vpFv').textContent = F+' mil';
    box.querySelector('#vpNv').textContent = N+' anos';
    box.querySelector('#vpTv').textContent = (TMA*100).toFixed(0)+'% a.a.';

    const vpl = i => { let s=-I; for(let t=1;t<=N;t++) s += F/Math.pow(1+i,t); return s; };
    /* TIR por bisseção: a taxa em que a curva do VPL corta o eixo */
    let a=0.0001, b=5, tir=null;
    if(vpl(a)>0 && vpl(b)<0){
      for(let k=0;k<80;k++){
        const m=(a+b)/2;
        if(vpl(m)>0) a=m; else b=m;
      }
      tir=(a+b)/2;
    }
    const IMAX = 0.6;
    const v0 = vpl(0.0001), vmax = Math.max(Math.abs(v0), Math.abs(vpl(IMAX)), 10);
    const X = i => 50 + i/IMAX*370;
    const Y = v => 150 - v/vmax*115;
    let d='';
    for(let i=0.0001; i<=IMAX; i+=0.004) d += (d?' L ':'M ')+X(i).toFixed(1)+' '+Y(vpl(i)).toFixed(1);

    const atual = vpl(TMA);
    svg.innerHTML = `
      <line x1="50" y1="${Y(0)}" x2="430" y2="${Y(0)}" stroke="var(--line)" stroke-width="1.5"/>
      <line x1="50" y1="20" x2="50" y2="275" stroke="var(--line)"/>
      <path d="${d}" fill="none" stroke="#1e88e5" stroke-width="2.6"/>
      ${tir? `<circle cx="${X(tir)}" cy="${Y(0)}" r="5" fill="#e53935"/>
        <text x="${X(tir)-10}" y="${Y(0)+18}" font-size="11" fill="#e53935">TIR ${(tir*100).toFixed(1)}%</text>`:''}
      <line x1="${X(TMA)}" y1="20" x2="${X(TMA)}" y2="275" stroke="#8e24aa" stroke-dasharray="3 3"/>
      <text x="${X(TMA)+4}" y="32" font-size="10" fill="#8e24aa">TMA</text>
      <circle cx="${X(TMA)}" cy="${Y(atual)}" r="5" fill="#118A52"/>
      <text x="${Math.min(X(TMA)+8,340)}" y="${Y(atual)-8}" font-size="11" fill="#118A52">VPL ${atual.toFixed(1)} mil</text>
      ${[0,10,20,30,40,50,60].map(p=>`<text x="${X(p/100)-8}" y="290" font-size="9" fill="var(--muted)">${p}%</text>`).join('')}
      <text x="14" y="150" font-size="10" fill="var(--ink2)" transform="rotate(-90 14 150)">VPL</text>`;

    const paybackS = Math.ceil(I/F);
    let acum=0, paybackD=null;
    for(let t=1;t<=N;t++){ acum += F/Math.pow(1+TMA,t); if(acum>=I && paybackD===null) paybackD=t; }
    dados.innerHTML = `
      <div class="aviso ${atual>0?'a-ok':'a-err'}"><b>Decisão:</b> VPL à TMA de ${(TMA*100).toFixed(0)}% =
        <b>${atual.toFixed(1)} mil</b> ⇒ <b>${atual>0?'aceitar':'rejeitar'}</b> o projeto.
        ${tir? `Como a TIR é ${(tir*100).toFixed(1)}%, ela está <b>${tir>TMA?'acima':'abaixo'}</b> da TMA —
        as duas regras concordam, e sempre concordam quando o fluxo é convencional.` : ''}</div>
      <div class="aviso a-warn"><b>Payback simples:</b> ${paybackS} ano(s) —
        <b>descontado:</b> ${paybackD? paybackD+' ano(s)' : 'não se paga dentro do prazo'}.
        O descontado é sempre maior ou igual ao simples, e nenhum dos dois enxerga o que acontece depois.</div>
      <div class="aviso a-err"><b>Teste de mesa:</b> multiplique <i>todas</i> as entradas e saídas por um
        mesmo fator. O VPL fica multiplicado por ele, mas a <b>TIR não muda</b> — é onde a curva corta o eixo,
        e escalar o fluxo inteiro não move esse ponto.</div>`;
  };
  _liga(box, ['vpI','vpF','vpN','vpT'], desenha);
}
