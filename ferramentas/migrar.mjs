/* ============================================================
   Converte o DATA embutido na versão 3 do app (um objeto gigante
   dentro do index.html) na estrutura de arquivos da versão 4:

       src/conteudo/<volume>/volume.json
       src/conteudo/<volume>/<modulo>.licao.html
       src/conteudo/<volume>/<modulo>.questoes.html
       src/conteudo/<volume>/<modulo>.gabarito.html
       src/dados/quizzes/<volume>.json

   Assim cada lição vira um arquivo HTML de verdade, que dá para
   abrir e editar no VS Code com realce de sintaxe.

   Roda uma vez só:  node ferramentas/migrar.mjs
   Depois disso a fonte da verdade é src/conteudo/.

   Os IDs internos (v1, v1m1, …) ficam como estavam: é por eles que
   o app guarda anotações a caneta, notas e respostas de quem já usa
   o app. Renomear apagaria o progresso de todo mundo.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const velho = JSON.parse(fs.readFileSync(path.join(RAIZ, 'ferramentas', 'DATA-original.json'), 'utf8'));

const grava = (rel, txt) => {
  const p = path.join(RAIZ, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt, 'utf8');
};

let nArquivos = 0;
for (const vol of velho.conteudo) {
  const dir = `src/conteudo/${vol.id}`;
  grava(`${dir}/volume.json`, JSON.stringify({
    id: vol.id,
    t: vol.t.replace(/^Vol \d+ · /, ''),
    sub: vol.sub,
    mods: vol.mods.map(m => ({ id: m.id, n: m.n, t: m.t })),
  }, null, 1) + '\n');
  nArquivos++;

  for (const m of vol.mods) {
    for (const aba of ['licao', 'questoes', 'gabarito']) {
      if (!m[aba]) continue;
      grava(`${dir}/${m.id}.${aba}.html`, m[aba].trim() + '\n');
      nArquivos++;
    }
  }

  const quiz = velho.quizzes[vol.id] || [];
  if (quiz.length) { grava(`src/dados/quizzes/${vol.id}.json`, JSON.stringify(quiz, null, 1) + '\n'); nArquivos++; }
}

console.log(`✓ ${nArquivos} arquivos gravados`);
console.log(`  ${velho.conteudo.length} volumes · ${velho.conteudo.reduce((a, v) => a + v.mods.length, 0)} módulos` +
  ` · ${Object.values(velho.quizzes).reduce((a, q) => a + q.length, 0)} questões comentadas`);
