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
