/* Mostra, módulo a módulo, quantas questões da lição viraram questões
   interativas e quais ficaram de fora (para o conteúdo não sumir sem aviso).

       node ferramentas/conferir-questoes.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { montaQuestoes } from './lib/licao-questoes.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'src', 'conteudo');
const le = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

let totQ = 0, totPerdidas = 0, mods = 0, semQuestoes = [];
for (const pasta of fs.readdirSync(DIR).sort()) {
  const dir = path.join(DIR, pasta);
  if (!fs.statSync(dir).isDirectory()) continue;
  const vol = JSON.parse(le(path.join(dir, 'volume.json')));
  for (const m of vol.mods) {
    const hq = le(path.join(dir, `${m.id}.questoes.html`));
    const hg = le(path.join(dir, `${m.id}.gabarito.html`));
    if (!hq) { semQuestoes.push(m.id); continue; }
    mods++;
    const { qs, perdidas } = montaQuestoes(hq, hg);
    totQ += qs.length; totPerdidas += perdidas.length;
    const marca = perdidas.length ? '⚠' : ' ';
    console.log(`${marca} ${m.id.padEnd(8)} ${String(qs.length).padStart(3)} questões` +
      (perdidas.length ? `   fora: ${perdidas.join(',')}` : ''));
  }
}
console.log(`\n${totQ} questões interativas em ${mods} módulos · ${totPerdidas} não converteram`);
if (semQuestoes.length) console.log(`módulos sem bloco de questões: ${semQuestoes.join(', ')}`);
