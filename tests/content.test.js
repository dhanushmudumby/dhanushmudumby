/* Run: node tests/content.test.js. Validates every authored level so content typos can't ship. */
const { CHAPTERS, CODEX, BADGES, S, O } = require('../js/content.js');
const { GENS } = require('../js/gen.js');
let fails = 0, n = 0; const bad = m => { fails++; console.error('FAIL', m); }; const ok = (c, m) => { n++; if (!c) bad(m); };
const ids = new Set();
CHAPTERS.forEach(ch => {
  ok(ch.levels.length >= 1 && ch.color && ch.icon, `chapter ${ch.id} incomplete`);
  ch.levels.forEach(lv => {
    ok(!ids.has(lv.id), `duplicate level id ${lv.id}`); ids.add(lv.id);
    ok(lv.lesson && lv.lesson.length >= 2 && lv.lesson.every(c => c.h && c.p), `${lv.id}: lesson needs >=2 cards with h+p`);
    ok(lv.items.length >= 4, `${lv.id}: too few items (${lv.items.length})`);
    lv.items.forEach((it, i) => {
      const w = `${lv.id}[${i}] ${it.t}`;
      if (it.t === 'gen') return ok(typeof GENS[it.g] === 'function', `${w}: unknown generator ${it.g}`);
      if (it.t === 'mcq' || it.t === 'scenario') {
        ok(Array.isArray(it.o) && it.o.length === 4 && new Set(it.o).size === 4, `${w}: need 4 unique options`);
        ok(Number.isInteger(it.a) && it.a >= 0 && it.a < it.o.length, `${w}: bad answer index`);
        ok(it.why && it.why.length > 10, `${w}: missing explanation`);
        if (it.trap) ok(it.trap[0] !== it.a && it.trap[0] >= 0 && it.trap[0] < it.o.length && it.trap[1], `${w}: bad trap`);
      }
      if (it.t === 'scenario') { ok(/\[\[.+?\]\]/.test(it.text), `${w}: no [[signal]]`); ok(((it.text.match(/\(\(/g) || []).length === (it.text.match(/\)\)/g) || []).length), `${w}: unbalanced noise markup`); }
      if (it.t === 'mcq') ok(it.q, `${w}: no question`);
      if (it.t === 'order') ok(it.steps.length >= 4 && new Set(it.steps).size === it.steps.length, `${w}: needs >=4 unique steps`);
      if (it.t === 'bug') ok(Array.isArray(it.code) && it.bug >= 0 && it.bug < it.code.length && it.why, `${w}: bad bug line index`);
    });
    ok(new Set(lv.items.filter(x => x.t !== 'gen').map(x => x.q || x.text || x.title)).size === lv.items.filter(x => x.t !== 'gen').length, `${lv.id}: duplicate authored item`);
  });
});
CODEX.forEach(c => ok(ids.has(c.l), `codex "${c.n}" links to unknown level ${c.l}`));
ok(new Set(BADGES.map(b => b.id)).size === BADGES.length, 'duplicate badge ids');
console.log(`${n} checks, ${fails} failures, ${ids.size} levels, ${Object.keys(GENS).length} generators`);
process.exit(fails ? 1 : 0);
