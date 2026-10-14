/* AlgoForge app shell: router, views, and the play session runner. */
(function () {
  'use strict';
  const { CHAPTERS, CODEX, STRUCTS, BADGES, RANKS } = AFContent;
  const { engines, el, md } = AFGames;
  const store = AFStore, gen = AFGen, fx = AFFx;
  const { shuffle, rnd, pick } = gen.helpers;
  const app = document.getElementById('app');

  const SKILLS = { bigo: 'Big-O', hash: 'Hashing', window: 'Pointers & Windows', stack: 'Stacks & Queues', bsearch: 'Binary Search', sort: 'Sorting', heap: 'Heaps', greedy: 'Greedy & Intervals', tree: 'Trees', graph: 'BFS & DFS', dijkstra: 'Shortest Paths', uf: 'Union-Find & Topo', backtrack: 'Backtracking', dp: 'DP I', dp2: 'DP II', trie: 'Tries', prefix: 'Prefix & Bits', mix: 'Pattern Recognition', boss: 'Boss' };
  const GEN_SKILL = { bigO: 'bigo', stackSim: 'stack', windowSum: 'window', twoptr: 'window', bsearch: 'bsearch', bfs: 'graph', dfs: 'graph', heapOps: 'heap', sortPass: 'sort', intervals: 'greedy', kadane: 'dp', coin: 'dp', dpGrid: 'dp2', tree: 'tree', dijkstra: 'dijkstra', topo: 'uf', count: 'backtrack', prefixSum: 'prefix', bits: 'prefix', freq: 'hash' };

  /* ---------- flatten curriculum into a linear path ---------- */
  const NODES = [];
  CHAPTERS.forEach((ch, ci) => {
    ch.levels.forEach((lv, li) => NODES.push(Object.assign({}, lv, { chapter: ch, ci, li, idx: NODES.length })));
    NODES.push({ id: 'boss-' + ch.id, boss: true, title: ch.title + ' Boss', icon: '👑', skill: 'boss', blurb: `Prove you own ${ch.title}: 8 mixed problems from the whole chapter, and fewer hearts.`, chapter: ch, ci, li: ch.levels.length, idx: NODES.length });
  });
  const stars = n => (store.get().levels[n.id] || {}).stars || 0;
  const isDone = n => stars(n) > 0;
  const isOpen = n => store.get().settings.unlockAll || n.idx === 0 || isDone(NODES[n.idx - 1]);
  const nextNode = () => NODES.find(n => !isDone(n)) || null;
  const diff = (n, extra) => 1 + Math.floor(n.idx / 3) + (extra || 0);

  /* ---------- item preparation ---------- */
  function prep(it) {
    if (it.t !== 'mcq' && it.t !== 'scenario') return it;
    const perm = shuffle(it.o.map((_, i) => i));
    const c = Object.assign({}, it, { o: perm.map(i => it.o[i]), a: perm.indexOf(it.a) });
    if (it.trap) c.trap = [perm.indexOf(it.trap[0]), it.trap[1]];
    return c;
  }
  function resolve(it, skill, d) {
    if (it.t === 'gen') return Object.assign(gen.make(it.g, d), { _skill: GEN_SKILL[it.g] || skill });
    return Object.assign({}, prep(it), { _skill: skill });
  }
  const levelPool = n => n.items.map(it => ({ it, skill: n.skill }));
  const chapterPool = ch => ch.levels.flatMap(lv => levelPool(lv));
  const rankName = lv => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 3))];

  /* ---------- tiny utilities ---------- */
  const ring = (pct, label, sub) => el('div', { class: 'ring', style: `--p:${Math.round(pct * 100)}` }, el('div', { class: 'ring-in' }, el('b', {}, label), sub ? el('small', {}, sub) : null));
  function modal(content, opts) {
    const back = el('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true' });
    const box = el('div', { class: 'modal' }, content); back.append(box);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); opts && opts.onClose && opts.onClose(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey); document.body.append(back);
    const f = box.querySelector('button, [href]'); f && f.focus();
    return { close, box };
  }
  const starRow = n => el('span', { class: 'stars', 'aria-label': n + ' of 3 stars' }, [1, 2, 3].map(i => el('span', { class: i <= n ? 'on' : '' }, '★')));

  /* ---------- chrome (top bar chips, theme) ---------- */
  function applyTheme() {
    const t = store.get().settings.theme; const r = document.documentElement;
    t === 'auto' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', t);
    fx.setSound(store.get().settings.sound);
  }
  function chrome() {
    const S = store.get(), li = store.levelInfo(S.xp), st = store.liveStreak();
    document.getElementById('chips').replaceChildren(
      el('a', { class: 'chip-stat', href: '#/profile', title: 'Day streak' }, el('span', { 'aria-hidden': 'true' }, '🔥'), el('b', {}, st), el('span', { class: 'sr' }, ' day streak')),
      el('a', { class: 'chip-stat', href: '#/profile', title: 'Player level' }, el('span', { 'aria-hidden': 'true' }, '⚡'), el('b', {}, 'Lv ' + li.level), el('span', { class: 'xpbar', role: 'progressbar', 'aria-valuenow': li.into, 'aria-valuemax': li.need }, el('i', { style: `width:${Math.round(100 * li.into / li.need)}%` }))));
    const links = document.querySelectorAll('[data-nav]'); const cur = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
    links.forEach(a => a.classList.toggle('active', a.dataset.nav === cur));
  }

  /* ================= VIEWS ================= */
  const views = {};

  views.home = () => {
    const S = store.get(), started = Object.keys(S.levels).length > 0, nx = nextNode();
    const totalLv = NODES.filter(n => !n.boss).length;
    const ctas = el('div', { class: 'row' },
      el('a', { class: 'btn primary lg', href: '#/learn' }, started ? (nx ? `Continue: ${nx.title}` : 'Replay the path') : 'Start learning free'),
      el('a', { class: 'btn lg', href: '#/endless' }, '🏟️ Endless Arena'));
    const hero = el('section', { class: 'hero' },
      el('div', { class: 'hero-copy' },
        el('div', { class: 'eyebrow' }, 'Data structures & algorithms, gamified'),
        el('h1', {}, 'Learn DSA by ', el('span', { class: 'grad' }, 'playing'), ', not by memorising.'),
        el('p', { class: 'lead' }, 'Short interactive games teach you to recognise the right technique, predict how code behaves, and build algorithms step by step. Levels get harder as you do, and the game never runs out of puzzles.'),
        ctas,
        el('div', { class: 'proof' }, [[totalLv, 'levels'], [CHAPTERS.length, 'chapters'], [Object.keys(gen.GENS).length, 'puzzle generators'], ['∞', 'endless arena']].map(([a, b]) => el('div', {}, el('b', {}, a), el('span', {}, b))))),
      el('div', { class: 'hero-art', 'aria-hidden': 'true' }, heroArt()));
    const how = el('section', { class: 'band' }, el('h2', {}, 'How a level works'),
      el('div', { class: 'cards3' }, [
        ['1', '📖', 'Learn', 'A 60-second lesson: the idea, the signals, and the cost.'],
        ['2', '🎮', 'Play', 'Six to eight games: spot the pattern, trace the code, hunt the bug, build the steps.'],
        ['3', '⭐', 'Level up', 'Earn XP and stars. Mistakes cost hearts, so every answer matters.']
      ].map(([n, i, h, p]) => el('div', { class: 'card step-card' }, el('div', { class: 'big-n' }, n), el('div', { class: 'ico' }, i), el('h3', {}, h), el('p', {}, p)))));
    const kinds = el('section', { class: 'band' }, el('h2', {}, 'Nine ways to practise'),
      el('div', { class: 'cards3 tight' }, [
        ['🎯', 'Pattern recognition', 'Read a real-world story, find the signal phrases, pick the technique.'],
        ['🧱', 'Algorithm builder', 'Arrange an algorithm\'s steps in order, with no code typing.'],
        ['🐞', 'Bug hunt', 'Find the one broken line in pseudocode.'],
        ['📈', 'Big-O reading', 'Estimate the cost of code before running it.'],
        ['✂️', 'Binary search duel', 'Find the target in as few probes as possible.'],
        ['🕸️', 'Graph traversal', 'Tap nodes in exact BFS / DFS order.'],
        ['👉👈', 'Pointer steering', 'Move two pointers across a sorted array.'],
        ['⛰️', 'Data-structure tracing', 'Predict heaps, stacks, sorts and trees after each operation.'],
        ['🧮', 'DP & counting', 'Fill tables mentally: coins, grids, subsequences.']
      ].map(([i, h, p]) => el('div', { class: 'card mini' }, el('div', { class: 'ico' }, i), el('h3', {}, h), el('p', {}, p)))));
    const chs = el('section', { class: 'band' }, el('h2', {}, 'The path'),
      el('div', { class: 'cards3' }, CHAPTERS.map((c, i) => el('a', { class: 'card chap', href: '#/learn', style: `--c:${c.color}` }, el('div', { class: 'ico' }, c.icon), el('div', { class: 'tag' }, 'Chapter ' + (i + 1)), el('h3', {}, c.title), el('p', {}, c.blurb), el('div', { class: 'tag' }, c.levels.map(l => l.title).join(' · '))))));
    const end = el('section', { class: 'band endless-cta' }, el('div', {}, el('h2', {}, 'The game never ends'), el('p', { class: 'lead' }, 'After the path, the Endless Arena throws freshly generated puzzles at you: unlimited, with tiers that keep getting harder. Chase a higher tier every day.')), el('a', { class: 'btn primary lg', href: '#/endless' }, 'Enter the arena'));
    return [hero, how, kinds, chs, end];
  };

  function heroArt() {
    const items = ['O(n)', 'BFS', 'heap', 'DP', 'trie', 'O(log n)'];
    return el('div', { class: 'art' }, el('div', { class: 'art-card a1' }, el('div', { class: 'tag' }, 'Level 5 · Binary Search'), el('div', { class: 'chips mini' }, [3, 8, 15, 21, 34, 42, 57].map((v, i) => el('div', { class: 'chip' + (i === 3 ? ' on' : i > 3 ? '' : ' dim') }, el('b', {}, v))))),
      el('div', { class: 'art-card a2' }, el('div', { class: 'tag' }, 'Streak'), el('b', { class: 'big' }, '🔥 12')),
      el('div', { class: 'art-card a3' }, items.map(t => el('span', { class: 'pill' }, t))));
  }

  /* ---------- learn path ---------- */
  views.learn = () => {
    const S = store.get(), done = NODES.filter(isDone).length, nx = nextNode();
    const head = el('div', { class: 'page-head' }, el('div', {}, el('h1', {}, 'Your path'), el('p', { class: 'muted' }, `${done} of ${NODES.length} nodes complete. Finish a node to unlock the next.`)),
      ring(done / NODES.length, Math.round(100 * done / NODES.length) + '%', 'done'));
    const out = [head];
    CHAPTERS.forEach((ch, ci) => {
      const nodes = NODES.filter(n => n.ci === ci); const cd = nodes.filter(isDone).length;
      const sec = el('section', { class: 'chapter', style: `--c:${ch.color}` },
        el('div', { class: 'chap-head' }, el('div', { class: 'chap-ico' }, ch.icon), el('div', {}, el('div', { class: 'tag' }, `Chapter ${ci + 1}`), el('h2', {}, ch.title), el('p', { class: 'muted' }, ch.blurb)), el('div', { class: 'chap-prog' }, `${cd}/${nodes.length}`)));
      const path = el('div', { class: 'path' });
      nodes.forEach((n, k) => {
        const open = isOpen(n), s = stars(n), cur = nx && nx.id === n.id;
        const off = [0, 44, 66, 44, 0, -44, -66, -44][k % 8];
        path.append(el('div', { class: 'pnode-wrap', style: `transform:translateX(${off}px)` },
          el('button', { class: 'pnode' + (n.boss ? ' boss' : '') + (open ? '' : ' locked') + (s ? ' done' : '') + (cur ? ' current' : ''), 'aria-label': `${n.title}${open ? '' : ' (locked)'}${s ? `, ${s} stars` : ''}`, onclick: () => openSheet(n) }, open ? n.icon : '🔒'),
          el('div', { class: 'pname' }, n.title), s ? starRow(s) : (cur ? el('div', { class: 'tag go' }, 'START') : null)));
      });
      sec.append(path); out.push(sec);
    });
    out.push(el('div', { class: 'card endless-cta slim' }, el('div', {}, el('h3', {}, 'Finished the path?'), el('p', { class: 'muted' }, 'It never really ends. Generated puzzles scale forever in the Endless Arena.')), el('a', { class: 'btn primary', href: '#/endless' }, 'Enter the arena')));
    return out;
  };

  function openSheet(n) {
    const open = isOpen(n), s = stars(n);
    const types = n.boss ? 'Mixed from the chapter' : [...new Set(n.items.map(i => ({ mcq: 'Concept', scenario: 'Pattern', order: 'Builder', bug: 'Bug hunt', gen: 'Generated' }[i.t])))].join(' · ');
    const body = el('div', { class: 'sheet' },
      el('div', { class: 'sheet-ico' }, open ? n.icon : '🔒'), el('div', { class: 'tag' }, `Chapter ${n.ci + 1} · ${n.chapter.title}`), el('h2', {}, n.title), el('p', { class: 'muted' }, n.blurb),
      el('div', { class: 'facts' }, el('div', {}, el('b', {}, n.boss ? 8 : n.items.length), el('span', {}, 'challenges')), el('div', {}, el('b', {}, n.boss ? 4 : 5), el('span', {}, 'hearts')), el('div', {}, el('b', {}, s ? starRow(s) : '–'), el('span', {}, 'best'))),
      el('p', { class: 'tag' }, types));
    const act = el('div', { class: 'row' });
    if (!open) { body.append(el('p', { class: 'note' }, 'Complete the previous node to unlock this one.')); act.append(el('button', { class: 'btn', onclick: () => m.close() }, 'Close')); }
    else {
      if (n.lesson) act.append(el('button', { class: 'btn', onclick: () => { m.close(); openLesson(n, true); } }, '📖 Lesson'));
      act.append(el('button', { class: 'btn primary', onclick: () => { m.close(); (n.lesson && !s) ? openLesson(n, true) : startNode(n); } }, s ? 'Play again' : 'Start'));
    }
    body.append(act); const m = modal(body);
  }

  function openLesson(n, thenPlay) {
    let i = 0; const cards = n.lesson; const box = el('div', { class: 'lesson' }); let m;
    const draw = () => {
      const c = cards[i];
      box.replaceChildren(el('div', { class: 'tag' }, `${n.title} · Lesson ${i + 1}/${cards.length}`), el('h2', {}, c.h), el('p', { class: 'lesson-p', html: md(c.p) }), c.code ? el('pre', { class: 'code' }, c.code) : null,
        el('div', { class: 'dots' }, cards.map((_, k) => el('i', { class: k === i ? 'on' : '' }))),
        el('div', { class: 'row' }, i > 0 ? el('button', { class: 'btn', onclick: () => { i--; draw(); } }, 'Back') : null,
          i < cards.length - 1 ? el('button', { class: 'btn primary', onclick: () => { i++; draw(); } }, 'Next')
            : el('button', { class: 'btn primary', onclick: () => { m.close(); if (thenPlay) startNode(n); } }, thenPlay ? 'Start challenge ▶' : 'Done')));
    };
    draw(); m = modal(box);
  }

  /* ---------- practice, endless, codex, profile ---------- */
  views.practice = () => {
    const S = store.get(); const doneLv = NODES.filter(n => !n.boss && isDone(n));
    const rows = Object.keys(SKILLS).filter(k => k !== 'boss').map(k => ({ k, m: store.mastery(k) }));
    const weak = rows.filter(r => r.m !== null).sort((a, b) => a.m - b.m).slice(0, 3);
    return [el('div', { class: 'page-head' }, el('div', {}, el('h1', {}, 'Smart practice'), el('p', { class: 'muted' }, 'Ten problems weighted toward the skills you miss most. No stars, just reps.'))),
      el('div', { class: 'card' }, el('h3', {}, 'Your weakest skills'),
        weak.length ? el('div', { class: 'bars' }, weak.map(w => bar(SKILLS[w.k], w.m))) : el('p', { class: 'muted' }, 'Play a few levels first and this will learn what to drill.'),
        el('div', { class: 'row', style: 'margin-top:14px' }, el('button', { class: 'btn primary lg', onclick: startPractice }, 'Start practice'), doneLv.length ? null : el('span', { class: 'muted' }, 'Uses the first chapter until you complete levels.')))];
  };
  const bar = (label, v) => el('div', { class: 'bar' }, el('div', { class: 'bar-l' }, el('span', {}, label), el('b', {}, v === null ? '–' : Math.round(v * 100) + '%')), el('div', { class: 'track' }, el('i', { style: `width:${v === null ? 0 : Math.round(v * 100)}%` })));

  views.endless = () => {
    const E = store.get().endless;
    return [el('section', { class: 'arena' }, el('div', { class: 'eyebrow' }, 'Endless Arena'), el('h1', {}, 'How far can you get?'),
      el('p', { class: 'lead' }, 'Fresh puzzles are generated from ' + Object.keys(gen.GENS).length + ' problem types, with the difficulty tier rising every three correct answers. Three hearts. Every mistake costs a heart.'),
      el('div', { class: 'proof' }, [[E.best || 0, 'best tier'], [E.bestScore || 0, 'best score'], [E.runs || 0, 'runs']].map(([a, b]) => el('div', {}, el('b', {}, a), el('span', {}, b)))),
      el('button', { class: 'btn primary lg', onclick: startEndless }, 'Start run'))];
  };

  views.codex = () => {
    const q = el('input', { type: 'search', class: 'search', placeholder: 'Search techniques…', 'aria-label': 'Search techniques' });
    const grid = el('div', { class: 'cards3 tight' });
    const draw = () => { const t = q.value.toLowerCase(); grid.replaceChildren(...CODEX.filter(c => !t || (c.n + c.use + c.c).toLowerCase().includes(t)).map(c => el('div', { class: 'card mini codex' }, el('div', { class: 'ico' }, c.i), el('h3', {}, c.n), el('p', {}, c.use), el('div', { class: 'tag' }, 'Cost: ' + c.c)))); };
    q.addEventListener('input', draw); draw();
    const tbl = el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, ['Structure', 'Access', 'Search', 'Insert', 'Delete'].map(h => el('th', {}, h)))), el('tbody', {}, STRUCTS.map(r => el('tr', {}, r.map((c, i) => i ? el('td', {}, c) : el('th', {}, c))))));
    return [el('div', { class: 'page-head' }, el('div', {}, el('h1', {}, 'Codex'), el('p', { class: 'muted' }, 'A field guide to every technique: when to use it, and what it costs.'))), q, grid,
      el('h2', { style: 'margin-top:28px' }, 'Operation costs'), el('div', { class: 'tbl-wrap' }, tbl),
      el('h2', { style: 'margin-top:28px' }, 'Rule of thumb'), el('div', { class: 'card' }, el('p', { html: md('About **10⁸** simple operations per second. n ≤ 20 → O(2ⁿ). n ≤ 500 → O(n³). n ≤ 5,000 → O(n²). n ≤ 10⁶ → O(n log n). n ≤ 10⁸ → O(n). Beyond that → O(log n) or O(1).') }))];
  };

  views.profile = () => {
    const S = store.get(), li = store.levelInfo(S.xp), st = store.liveStreak();
    const lvDone = NODES.filter(n => !n.boss && isDone(n)).length, starTot = NODES.reduce((a, n) => a + stars(n), 0);
    const acc = S.stats.answered ? Math.round(100 * S.stats.firstTry / S.stats.answered) : 0;
    const goal = 50, dp = Math.min(1, S.daily.xp / goal);
    const hero = el('div', { class: 'card profile-hero' }, ring(li.into / li.need, 'Lv ' + li.level, rankName(li.level)),
      el('div', {}, el('h1', {}, rankName(li.level)), el('p', { class: 'muted' }, `${li.into} / ${li.need} XP to level ${li.level + 1} · ${S.xp} XP total`),
        el('div', { class: 'daily' }, el('div', { class: 'bar-l' }, el('span', {}, 'Daily goal'), el('b', {}, `${Math.min(S.daily.xp, goal)} / ${goal} XP`)), el('div', { class: 'track' }, el('i', { style: `width:${dp * 100}%` })))));
    const stats = el('div', { class: 'cards4' }, [[st, '🔥 day streak'], [lvDone, '✅ levels done'], [starTot, '⭐ stars'], [acc + '%', '🎯 first-try accuracy'], [S.endless.best || 0, '🏟️ best arena tier'], [S.stats.answered, '🧩 challenges played']].map(([a, b]) => el('div', { class: 'card stat' }, el('b', {}, a), el('span', {}, b))));
    const skills = el('div', { class: 'card' }, el('h3', {}, 'Skill mastery'), el('div', { class: 'bars two' }, Object.keys(SKILLS).filter(k => k !== 'boss').map(k => bar(SKILLS[k], store.mastery(k)))));
    const badges = el('div', { class: 'card' }, el('h3', {}, 'Badges'), el('div', { class: 'badges' }, BADGES.map(b => el('div', { class: 'badge' + (S.badges[b.id] ? ' got' : ''), title: b.d }, el('div', { class: 'bi' }, S.badges[b.id] ? b.i : '🔒'), el('b', {}, b.n), el('small', {}, b.d)))));
    const set = S.settings;
    const sel = el('select', { 'aria-label': 'Theme', onchange: e => { set.theme = e.target.value; store.save(); applyTheme(); } }, ['auto', 'dark', 'light'].map(v => el('option', { value: v, selected: set.theme === v }, v === 'auto' ? 'Theme: match device' : 'Theme: ' + v)));
    const tog = (label, key) => el('label', { class: 'toggle' }, el('input', { type: 'checkbox', checked: !!set[key], onchange: e => { set[key] = e.target.checked; store.save(); applyTheme(); chrome(); } }), el('span', {}, label));
    const file = el('input', { type: 'file', accept: 'application/json', hidden: true, onchange: e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { store.importJSON(t); fx.toast('Progress imported', 'good'); route(); } catch (err) { fx.toast('Import failed: ' + err.message, 'bad'); } }); } });
    const settings = el('div', { class: 'card' }, el('h3', {}, 'Settings & data'), el('div', { class: 'settings' }, sel, tog('Sound effects', 'sound'), tog('Unlock every level (for experienced players)', 'unlockAll')),
      el('p', { class: 'muted' }, 'Progress is saved in this browser. Export it to back up or move to another device.'),
      el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => { const a = el('a', { href: URL.createObjectURL(new Blob([store.exportJSON()], { type: 'application/json' })), download: 'algoforge-progress.json' }); a.click(); } }, 'Export progress'), el('button', { class: 'btn', onclick: () => file.click() }, 'Import progress'), file,
        el('button', { class: 'btn danger', onclick: () => confirmBox('Reset all progress?', 'This erases XP, stars, streak and badges on this device. It cannot be undone.', 'Reset everything', () => { store.reset(); applyTheme(); route(); fx.toast('Progress reset'); }) }, 'Reset progress')));
    return [hero, stats, skills, badges, settings];
  };

  function confirmBox(title, text, yes, onYes) {
    const b = el('div', { class: 'sheet' }, el('h2', {}, title), el('p', { class: 'muted' }, text), el('div', { class: 'row' }, el('button', { class: 'btn', onclick: () => m.close() }, 'Cancel'), el('button', { class: 'btn danger', onclick: () => { m.close(); onYes(); } }, yes)));
    const m = modal(b);
  }

  /* ================= PLAY SESSION ================= */
  function play(cfg) {
    const st = { i: 0, hearts: cfg.hearts, mistakes: 0, xp: 0, ok: 0, firstTry: 0, dead: false, over: false };
    const root = el('div', { class: 'play', role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title });
    const hearts = el('div', { class: 'hearts', 'aria-live': 'polite' });
    const fill = el('i'); const track = el('div', { class: 'ptrack' }, fill);
    const stage = el('div', { class: 'stage' }), dock = el('div', { class: 'dock' });
    root.append(el('div', { class: 'phead' }, el('button', { class: 'x', 'aria-label': 'Quit', onclick: askQuit }, '✕'), cfg.total ? track : el('div', { class: 'tierchip' }), hearts), stage, dock);
    document.body.append(root); document.body.classList.add('noscroll');
    const tierChip = root.querySelector('.tierchip');
    let cur = null, settled = false, itemWrong = false, engine = null;
    const drawHearts = () => { hearts.replaceChildren(...Array.from({ length: cfg.hearts }, (_, i) => el('span', { class: i < st.hearts ? 'h on' : 'h' }, '♥'))); hearts.setAttribute('aria-label', st.hearts + ' hearts left'); };
    const progress = () => { if (cfg.total) fill.style.width = (100 * st.i / cfg.total) + '%'; else if (tierChip) tierChip.textContent = `Tier ${cfg.tier(st)} · ${st.ok} solved`; };
    function setDock(kind, msg, withContinue) {
      dock.className = 'dock ' + kind;
      dock.replaceChildren(el('div', { class: 'dock-in' }, el('div', { class: 'dock-msg' }, el('b', {}, kind === 'good' ? '✓ Correct' : kind === 'bad' ? '✗ Not quite' : ''), el('div', { html: md(msg || '') })), withContinue ? el('button', { class: 'btn primary lg continue', onclick: next, autofocus: true }, st.i + 1 >= (cfg.total || Infinity) ? 'Finish' : 'Continue') : null));
    }
    function load() {
      cur = cfg.item(st.i, st); settled = false; itemWrong = false;
      stage.replaceChildren(); dock.className = 'dock'; dock.replaceChildren();
      const ctx = {
        correct(msg) {
          if (settled || st.over) return; settled = true; st.ok++; if (!itemWrong) st.firstTry++;
          st.xp += (itemWrong ? 5 : 10) * (cfg.xpMult || 1); store.recordAnswer(cur._skill, !itemWrong); fx.sound.ok(); setDock('good', msg, true);
        },
        wrong(msg) {
          if (settled || st.over) return; itemWrong = true; st.mistakes++; st.hearts--; fx.sound.bad(); drawHearts();
          if (st.hearts <= 0) { store.recordAnswer(cur._skill, false); return end(true); }
          setDock('bad', msg, false);
        },
        bonus(p) { st.xp += p; }
      };
      const host = el('div', { class: 'item' }); stage.append(host);
      engine = engines[cur.t](host, cur, ctx);
      progress(); stage.scrollTop = 0;
    }
    function next() { if (st.over) return; st.i++; if (cfg.total && st.i >= cfg.total) return end(false); load(); }
    function end(dead) { if (st.over) return; st.over = true; st.dead = dead; teardown(); cfg.finish(st, dead); }
    function teardown() { document.removeEventListener('keydown', onKey); root.remove(); document.body.classList.remove('noscroll'); }
    function askQuit() { confirmBox('Quit this run?', 'Progress in this run will be lost.', 'Quit', () => { st.over = true; teardown(); cfg.onQuit && cfg.onQuit(); }); }
    function onKey(e) {
      if (document.querySelector('.modal-back')) return;
      if (/^[1-9]$/.test(e.key)) { const b = stage.querySelectorAll('.opt')[+e.key - 1]; b && !b.disabled && b.click(); }
      if (e.key === 'Enter') { const c = dock.querySelector('.continue'); if (c && document.activeElement !== c) { e.preventDefault(); c.click(); } }
    }
    document.addEventListener('keydown', onKey);
    drawHearts(); load();
    play.current = { st, item: () => cur, solve: () => engine.solve(), cont: () => { const c = dock.querySelector('.continue'); c && c.click(); }, active: () => !st.over };
  }

  /* ---- awarding badges & results ---- */
  function checkBadges() {
    const S = store.get(), got = [];
    const lvDone = NODES.filter(n => !n.boss && isDone(n)).length;
    const test = { first: lvDone >= 1, perfect: NODES.some(n => stars(n) === 3), streak3: store.liveStreak() >= 3, streak7: store.liveStreak() >= 7, boss: NODES.some(n => n.boss && isDone(n)), five: lvDone >= 5, ten: lvDone >= 10, xp1k: S.xp >= 1000, arena5: S.endless.best >= 5, arena10: S.endless.best >= 10 };
    BADGES.forEach(b => { if (test[b.id] && store.award(b.id)) got.push(b); });
    return got;
  }

  function results(o) {
    const box = el('div', { class: 'results' });
    const mk = (cls, icon, title, sub) => box.append(el('div', { class: 'res-head ' + cls }, el('div', { class: 'res-ico' }, icon), el('h1', {}, title), el('p', { class: 'muted' }, sub)));
    mk(o.fail ? 'fail' : 'win', o.icon, o.title, o.sub);
    if (o.stars != null) box.append(el('div', { class: 'res-stars' }, starRow(o.stars)));
    box.append(el('div', { class: 'cards3 tight' }, o.stats.map(([a, b]) => el('div', { class: 'card stat' }, el('b', {}, a), el('span', {}, b)))));
    if (o.levelUp) box.append(el('div', { class: 'banner' }, `🎉 Level up! You are now level ${o.levelUp}: ${rankName(o.levelUp)}`));
    (o.badges || []).forEach(b => box.append(el('div', { class: 'banner gold' }, `${b.i} Badge unlocked: ${b.n}. ${b.d}`)));
    box.append(el('div', { class: 'row center' }, o.actions));
    const wrap = el('div', { class: 'play results-screen' }, box); document.body.append(wrap); document.body.classList.add('noscroll');
    const close = fn => () => { wrap.remove(); document.body.classList.remove('noscroll'); fn && fn(); route(); };
    o.actions.forEach(a => { const f = a._go; a.onclick = close(f); });
    o.fail ? fx.sound.lose() : (fx.sound.win(), fx.confetti());
    chrome();
  }
  const btn = (label, cls, go) => { const b = el('button', { class: 'btn ' + cls }, label); b._go = go; return b; };

  /* ---- level / boss ---- */
  function startNode(n) {
    const d = diff(n, n.boss ? 1 : 0);
    let list;
    if (n.boss) list = shuffle(chapterPool(n.chapter)).slice(0, 8);
    else list = shuffle(levelPool(n));
    const items = list.map(({ it, skill }) => resolve(it, skill, d));
    const hearts = n.boss ? 4 : 5;
    play({
      title: n.title, hearts, total: items.length, xpMult: n.boss ? 2 : 1, item: i => items[i],
      onQuit: () => route(),
      finish(st, dead) {
        const half = Math.floor(st.xp / 2);
        if (dead) {
          if (half) { store.addXP(half); store.touchStreak(); }
          return results({ fail: true, icon: '💔', title: 'Out of hearts', sub: 'Every miss teaches something. Review the lesson and go again.', stats: [[st.ok + '/' + items.length, 'solved'], ['+' + half, 'XP kept'], [st.mistakes, 'mistakes']],
            actions: [btn('Try again', 'primary', () => startNode(n)), n.lesson ? btn('📖 Review lesson', '', () => openLesson(n, false)) : null, btn('Back to path', '', () => { location.hash = '#/learn'; })].filter(Boolean) });
        }
        const sCount = st.mistakes === 0 ? 3 : st.mistakes <= 2 ? 2 : 1;
        const bonus = sCount * 15 * (n.boss ? 2 : 1); const gain = st.xp + bonus;
        store.completeLevel(n.id, sCount); const r = store.addXP(gain); store.touchStreak();
        const badges = checkBadges(); const nx = NODES[n.idx + 1];
        results({ icon: n.boss ? '👑' : '🎉', title: n.boss ? 'Boss defeated!' : 'Level complete!', sub: n.title, stars: sCount, levelUp: r.leveled ? r.level : 0, badges,
          stats: [['+' + gain, 'XP earned'], [Math.round(100 * st.firstTry / items.length) + '%', 'first-try accuracy'], [st.hearts + '/' + hearts, 'hearts left']],
          actions: [nx ? btn('Next: ' + nx.title, 'primary', () => { location.hash = '#/learn'; setTimeout(() => openSheet(nx), 50); }) : btn('Path complete: try the arena', 'primary', () => { location.hash = '#/endless'; }), btn('Replay', '', () => startNode(n)), btn('Back to path', '', () => { location.hash = '#/learn'; })] });
      }
    });
  }

  /* ---- smart practice ---- */
  function startPractice() {
    let pool = NODES.filter(n => !n.boss && isDone(n)); if (!pool.length) pool = NODES.filter(n => !n.boss && n.ci === 0);
    const cand = pool.flatMap(n => n.items.map(it => ({ it, skill: n.skill, n })));
    const weight = c => { const m = store.mastery(c.skill); return 1 + (m === null ? 1 : (1 - m) * 4); };
    const chosen = []; const left = cand.slice();
    while (chosen.length < 10 && left.length) { const tot = left.reduce((a, c) => a + weight(c), 0); let r = Math.random() * tot, k = 0; for (; k < left.length - 1; k++) { r -= weight(left[k]); if (r <= 0) break; } chosen.push(left.splice(k, 1)[0]); }
    const items = chosen.map(c => resolve(c.it, c.skill, diff(c.n)));
    play({
      title: 'Smart practice', hearts: 5, total: items.length, xpMult: 0.6, item: i => items[i], onQuit: () => route(),
      finish(st, dead) {
        const gain = Math.round(st.xp); const r = store.addXP(gain); store.touchStreak(); const badges = checkBadges();
        results({ fail: dead, icon: dead ? '💔' : '💪', title: dead ? 'Out of hearts' : 'Practice complete', sub: 'Reps build instinct.', levelUp: r.leveled ? r.level : 0, badges,
          stats: [['+' + gain, 'XP earned'], [st.ok + '/' + items.length, 'solved'], [st.mistakes, 'mistakes']],
          actions: [btn('Practice again', 'primary', startPractice), btn('Home', '', () => { location.hash = '#/learn'; })] });
      }
    });
  }

  /* ---- endless arena ---- */
  function startEndless() {
    const names = Object.keys(gen.GENS); let lastG = null; let tierSeen = 1;
    const tier = st => 1 + Math.floor(st.ok / 3);
    play({
      title: 'Endless Arena', hearts: 3, total: null, tier, xpMult: 0.6,
      item(i, st) { let g; do { g = pick(names); } while (g === lastG); lastG = g; tierSeen = tier(st); return Object.assign(gen.make(g, tierSeen), { _skill: GEN_SKILL[g] }); },
      onQuit: () => route(),
      finish(st) {
        const t = tier(st), score = st.ok * 10 + t * 25; const E = store.get().endless; const newBest = t > E.best; E.runs++; E.best = Math.max(E.best, t); E.bestScore = Math.max(E.bestScore, score);
        const r = store.addXP(Math.round(st.xp)); store.touchStreak(); const badges = checkBadges();
        results({ icon: '🏟️', title: 'Run over', sub: newBest ? 'New personal best tier!' : 'Tier ' + t + ' reached', levelUp: r.leveled ? r.level : 0, badges,
          stats: [['Tier ' + t, 'reached'], [st.ok, 'solved'], [score, 'score']],
          actions: [btn('Run again', 'primary', startEndless), btn('Home', '', () => { location.hash = '#/'; })] });
      }
    });
  }

  /* ================= ROUTER ================= */
  function route() {
    const name = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
    const v = views[name] || views.home;
    app.replaceChildren(...[].concat(v()).filter(Boolean)); app.className = 'view view-' + name;
    window.scrollTo(0, 0); chrome(); document.title = (name === 'home' ? 'AlgoForge: Learn DSA by playing' : 'AlgoForge · ' + name[0].toUpperCase() + name.slice(1));
    document.getElementById('main').focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  document.getElementById('theme-toggle').addEventListener('click', () => { const s = store.get().settings; const cur = s.theme === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.theme; s.theme = cur === 'dark' ? 'light' : 'dark'; store.save(); applyTheme(); });
  applyTheme(); route();

  window.AF = { NODES, startNode, startEndless, startPractice, play, store, isDone, isOpen };
})();
