/* Run: npm start (in another terminal), then  node tests/e2e.js
 * Needs Playwright (npm i -D playwright). Plays every level perfectly, then Practice and the Arena, and fails on any JS error. */
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8080/index.html';
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(URL);
  const out = await pg.evaluate(() => {
    const done = [];
    for (const n of AF.NODES) {
      if (!AF.isOpen(n)) throw new Error('level locked after completing previous: ' + n.id);
      AF.startNode(n); let s = 0;
      while (AF.play.current.active() && s++ < 40) { AF.play.current.solve(); AF.play.current.cont(); }
      if (!(AF.store.get().levels[n.id] || {}).stars) throw new Error('not completed: ' + n.id);
      done.push(n.id); document.querySelector('.results-screen .btn:last-child')?.click();
    }
    AF.startPractice(); let p = 0; while (AF.play.current.active() && p++ < 20) { AF.play.current.solve(); AF.play.current.cont(); }
    document.querySelector('.results-screen .btn:last-child')?.click();
    return done.length;
  });
  console.log(`completed ${out} nodes + practice; JS errors: ${errs.length}`);
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
