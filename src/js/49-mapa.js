/* ===================================================================
   MAPA MENTAL E MNEMÔNICOS

   Abre a lição: primeiro a estrutura do assunto em blocos ligados ao
   centro, depois os mnemônicos. A ideia é o aluno ver o esqueleto do
   tema antes de ler o texto, e voltar a ele para revisar em 30 s.

   O desenho é HTML, não imagem: acompanha o tema claro/escuro, escala
   com o tamanho da letra, dá para copiar o texto e não pesa no arquivo.
   =================================================================== */

/* **negrito** e · viram marcação; o resto é escapado. */
function mdCurto(s){
  return esc(String(s||''))
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/ · /g, ' <i class="pt">·</i> ');
}

function mapaDoModulo(mid){ return (DATA.mapas || {})[mid] || null; }

/* Atalho no alto da lição. O mapa fecha o módulo, lá embaixo — mas sem
   este aviso ninguém sabe que ele existe numa lição de 800 palavras. */
function chamadaDoMapa(mod){
  const m = mapaDoModulo(mod.id);
  if(!m) return '';
  const n = (m.ramos||[]).length, k = (m.mnemonicos||[]).length;
  return `<button class="mapa-chamada" onclick="vaiParaMapa()">
    <span class="mapa-ic">🧠</span>
    <span class="mapa-ch-tx">
      <b>Mapa do assunto no fim da lição</b>
      <span>${n} blocos e ${k} ${k===1?'mnemônico':'mnemônicos'} para fechar o módulo</span>
    </span>
    <span class="mapa-ch-seta">↓</span>
  </button>`;
}
function vaiParaMapa(){
  const el = document.querySelector('.mapa-m');
  if(!el) return;
  if(S.mapaAberto === false){ S.mapaAberto = true; save(); render(); }
  setTimeout(()=>{ const x = document.querySelector('.mapa-m'); if(x) x.scrollIntoView({behavior:'smooth', block:'start'}); }, 40);
}

function mapaHTML(mod){
  const m = mapaDoModulo(mod.id);
  if(!m) return '';
  const aberto = S.mapaAberto !== false;
  const cores = {acento:'var(--amarelo)', ok:'var(--ok)', err:'var(--err)', info:'#1e88e5'};

  return `<section class="mapa-m ${aberto?'':'fechado'}">
    <button class="mapa-cab" onclick="alternaMapa()">
      <span class="mapa-ic">🧠</span>
      <span class="mapa-tt">Mapa do assunto${m.nota?` <em>${esc(m.nota)}</em>`:''}</span>
      <span class="mapa-seta">${aberto?'▾':'▸'}</span>
    </button>
    ${aberto ? `
    <div class="mapa-corpo">
      <div class="mapa-arv">
        <div class="mapa-centro">${esc(m.centro)}</div>
        <div class="mapa-ramos">
          ${(m.ramos||[]).map(r => `<div class="mapa-ramo" style="--rc:${cores[r.cor]||'var(--ink2)'}">
            <div class="mapa-rt">${mdCurto(r.t)}</div>
            <ul>${(r.itens||[]).map(i => `<li>${mdCurto(i)}</li>`).join('')}</ul>
          </div>`).join('')}
        </div>
      </div>
      ${(m.mnemonicos||[]).length ? `
      <div class="mnem">
        <div class="mnem-tt">Mnemônicos e regras de bolso</div>
        ${m.mnemonicos.map(x => `<div class="mnem-c">
          <div class="mnem-t">${mdCurto(x.t)}</div>
          <div class="mnem-x">${mdCurto(x.c)}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>` : ''}
  </section>`;
}
function alternaMapa(){ S.mapaAberto = S.mapaAberto === false; save(); render(); }

/* Quantos módulos da trilha já têm mapa — usado no aviso da tela Estudar. */
function modulosComMapa(){
  return modsTrilha().filter(m => mapaDoModulo(m.id)).length;
}
