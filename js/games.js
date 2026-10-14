/* Challenge engines. Each engine renders one item into `host` and reports through ctx:
 *   ctx.correct(explanationMd)  ctx.wrong(hintMd)  ctx.bonus(points)
 * Each returns { solve() } which performs the correct interaction (used by automated tests). */
(function (root) {
  'use strict';
  const { shuffle } = root.AFGen.helpers;

  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
    return e;
  }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const SVG = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v); kids.flat().forEach(k => k != null && e.append(k.nodeType ? k : document.createTextNode(k))); return e; };
  const LET = 'ABCDEFGH';

  /* ---------- visuals ---------- */
  function vizGrid(rows) {
    return el('div', { class: 'grid-viz', role: 'img', 'aria-label': 'Grid. # means blocked.', style: `grid-template-columns:repeat(${rows[0].length},44px)` },
      rows.flat().map((c, i) => el('div', { class: 'cell' + (c === '#' ? ' wall' : '') + (i === 0 ? ' start' : '') + (i === rows.flat().length - 1 ? ' end' : '') }, i === 0 ? 'S' : i === rows.flat().length - 1 ? 'E' : c)));
  }
  function vizTree(root_) {
    const pos = new Map(); let idx = 0, maxD = 0;
    (function walk(n, d) { if (!n) return; walk(n.l, d + 1); pos.set(n, { x: idx++, d }); maxD = Math.max(maxD, d); walk(n.r, d + 1); })(root_, 0);
    const W = idx * 48 + 24, H = (maxD + 1) * 58 + 16;
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tree-viz', role: 'img', 'aria-label': 'Binary search tree', width: W, height: H });
    const P = n => ({ x: pos.get(n).x * 48 + 24, y: pos.get(n).d * 58 + 28 });
    pos.forEach((_, n) => { [n.l, n.r].forEach(c => { if (c) { const a = P(n), b = P(c); s.append(svg('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'edge' })); } }); });
    pos.forEach((_, n) => { const p = P(n); s.append(svg('circle', { cx: p.x, cy: p.y, r: 18, class: 'node' }), svg('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', class: 'nlabel' }, String(n.v))); });
    return el('div', { class: 'viz-wrap' }, s);
  }
  const viz = v => v.type === 'grid' ? vizGrid(v.rows) : vizTree(v.root);

  /* ---------- engines ---------- */
  const engines = {};

  engines.mcq = (host, item, ctx) => {
    host.append(el('h2', { class: 'q', html: md(item.q) }));
    if (item.code) host.append(el('pre', { class: 'code' }, item.code));
    if (item.viz) host.append(viz(item.viz));
    let done = false;
    const btns = item.o.map((t, i) => el('button', { class: 'opt', 'data-i': i, onclick: () => choose(i) }, el('kbd', {}, i + 1), el('span', { html: md(t) })));
    host.append(el('div', { class: 'opts' }, btns));
    function choose(i) {
      if (done || btns[i].disabled) return;
      if (i === item.a) { done = true; btns.forEach(b => b.disabled = true); btns[i].classList.add('ok'); ctx.correct(item.why); }
      else {
        btns[i].classList.add('no'); btns[i].disabled = true;
        ctx.wrong(item.trap && item.trap[0] === i ? item.trap[1] : (item.hint || 'Not that one. Re-read the constraints and try again.'));
      }
    }
    return { solve: () => btns[item.a].click() };
  };

  engines.scenario = (host, item, ctx) => {
    const toks = []; const re = /\[\[(.+?)\]\]|\(\((.+?)\)\)/g; let last = 0, m;
    while ((m = re.exec(item.text))) { if (m.index > last) toks.push({ t: item.text.slice(last, m.index) }); toks.push(m[1] ? { t: m[1], k: 'sig' } : { t: m[2], k: 'noise' }); last = re.lastIndex; }
    if (last < item.text.length) toks.push({ t: item.text.slice(last) });
    const sel = new Set(); let locked = false;
    host.append(el('div', { class: 'eyebrow' }, 'Scenario'));
    const story = el('div', { class: 'story' }); host.append(story);
    const area = el('div', { class: 'area' }); host.append(area);
    const paint = () => {
      story.replaceChildren(...toks.map((t, i) => {
        if (!t.k) return document.createTextNode(t.t);
        let c = 'tok';
        if (locked) { const p = sel.has(i); c += p && t.k === 'sig' ? ' good' : p ? ' bad' : t.k === 'sig' ? ' miss' : ''; }
        else if (sel.has(i)) c += ' sel';
        return el('span', { class: c, role: locked ? null : 'button', tabindex: locked ? null : 0, onclick: () => { if (!locked) { sel.has(i) ? sel.delete(i) : sel.add(i); paint(); } }, onkeydown: e => { if (!locked && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.target.click(); } } }, t.t);
      }));
    };
    paint();
    let inner = null;
    function showOptions() {
      area.replaceChildren();
      inner = engines.mcq(area, { q: 'Which approach fits best?', o: item.o, a: item.a, why: item.why, trap: item.trap }, ctx);
    }
    const hasSig = toks.some(t => t.k === 'sig');
    if (!hasSig) showOptions();
    else {
      area.append(el('p', { class: 'muted' }, 'Step 1: tap the phrases that point to the technique. Some highlighted phrases are just story.'),
        el('button', { class: 'btn primary lock', onclick: lock }, 'Lock in signals'));
    }
    function lock() {
      locked = true; paint();
      const sigs = toks.filter(t => t.k === 'sig').length;
      const good = [...sel].filter(i => toks[i].k === 'sig').length, bad = sel.size - good;
      ctx.bonus(Math.max(0, good * 3 - bad * 2));
      area.replaceChildren(el('p', { class: 'tag' }, `🟢 signal found · 🟡 signal missed · 🔴 story noise. You found ${good}/${sigs} signals${bad ? ` and tapped ${bad} noise phrase${bad > 1 ? 's' : ''}` : ''}.`));
      const holder = el('div'); area.append(holder);
      inner = engines.mcq(holder, { q: 'Step 2: which approach fits best?', o: item.o, a: item.a, why: item.why, trap: item.trap }, ctx);
    }
    return { solve() { if (hasSig && !locked) { toks.forEach((t, i) => t.k === 'sig' && sel.add(i)); lock(); } inner.solve(); } };
  };

  engines.order = (host, item, ctx) => {
    const n = item.steps.length; let pool = shuffle(item.steps.map((t, i) => ({ t, i }))), ans = [], checked = false, finished = false;
    host.append(el('div', { class: 'eyebrow' }, 'Build the algorithm'), el('h2', { class: 'q' }, item.title), el('p', { class: 'muted' }, 'Tap steps to place them in the correct order. Tap a placed step to take it back.'));
    const out = el('div', { class: 'steps' }), poolEl = el('div', { class: 'steps pool' }), actions = el('div', { class: 'row' });
    host.append(el('div', { class: 'tag' }, 'Your solution'), out, el('div', { class: 'tag' }, 'Available steps'), poolEl, actions);
    function draw() {
      out.replaceChildren(...(ans.length ? ans.map((s, p) => el('button', { class: 'step' + (checked ? (s.i === p ? ' ok' : ' no') : ''), disabled: finished, onclick: () => { ans.splice(p, 1); pool.push(s); checked = false; draw(); } }, el('span', { class: 'n' }, p + 1), el('span', {}, s.t))) : [el('p', { class: 'muted empty' }, 'Nothing placed yet.')]));
      poolEl.replaceChildren(...pool.map(s => el('button', { class: 'step', 'data-i': s.i, onclick: () => { pool.splice(pool.indexOf(s), 1); ans.push(s); checked = false; draw(); } }, el('span', { class: 'n' }, '+'), el('span', {}, s.t))));
      actions.replaceChildren(...(finished ? [] : [
        el('button', { class: 'btn primary', disabled: pool.length > 0, onclick: check }, 'Run it ▶'),
        el('button', { class: 'btn', onclick: () => { pool = shuffle(pool.concat(ans)); ans = []; checked = false; draw(); } }, 'Reset')]));
    }
    function check() {
      checked = true; const right = ans.filter((s, p) => s.i === p).length;
      if (right === n) { finished = true; draw(); ctx.correct(`That is the full algorithm, and you never wrote code. ${item.why || ''}`); }
      else { draw(); ctx.wrong(`${right}/${n} steps are in the right place. Red ones are misplaced: tap them to pull them back out.`); }
    }
    draw();
    return { solve() { item.steps.forEach((_, i) => host.querySelector(`.pool .step[data-i="${i}"]`).click()); check(); } };
  };

  engines.bug = (host, item, ctx) => {
    host.append(el('div', { class: 'eyebrow' }, 'Bug hunt'), el('h2', { class: 'q' }, item.title), el('p', { class: 'muted' }, item.desc + ' Tap the buggy line.'));
    let done = false;
    const lines = item.code.map((l, i) => el('button', { class: 'cline', onclick: () => pick(i) }, el('span', { class: 'ln' }, i + 1), el('code', {}, l)));
    host.append(el('div', { class: 'codebox' }, lines));
    function pick(i) {
      if (done || lines[i].disabled) return;
      if (i === item.bug) { done = true; lines.forEach(b => b.disabled = true); lines[i].classList.add('ok'); ctx.correct(item.why); }
      else { lines[i].classList.add('no'); lines[i].disabled = true; ctx.wrong('That line is fine. Trace the code with a tiny input to see where it breaks.'); }
    }
    return { solve: () => lines[item.bug].click() };
  };

  engines.twoptr = (host, item, ctx) => {
    const { arr, target } = item; let l = 0, r = arr.length - 1, finished = false;
    host.append(el('div', { class: 'eyebrow' }, 'Two pointers'), el('h2', { class: 'q', html: md(`Find two values that sum to **${target}**. At each step, decide what to do with the pointers.`) }));
    const row = el('div', { class: 'chips' }), msg = el('p', { class: 'muted pt-msg' }), ctl = el('div', { class: 'row' });
    host.append(row, msg, ctl);
    const mk = (label, act, cls) => el('button', { class: 'btn ' + (cls || ''), 'data-act': act, onclick: () => step(act) }, label);
    function draw() {
      row.replaceChildren(...arr.map((v, i) => el('div', { class: 'chip' + (i < l || i > r ? ' dim' : '') + (i === l || i === r ? ' on' : '') }, el('b', {}, v), el('small', {}, `${i === l ? 'L' : ''}${i === r ? 'R' : ''}` || '·'))));
      msg.textContent = `L points at ${arr[l]}, R points at ${arr[r]}. Target ${target}.`;
      ctl.replaceChildren(...(finished ? [] : [mk('Sum too small → move L right', 'l'), mk('Sum too big → move R left', 'r'), mk('Sum equals target ✓', 'f', 'primary')]));
    }
    function step(act) {
      const s = arr[l] + arr[r]; const right = s < target ? 'l' : s > target ? 'r' : 'f';
      if (act !== right) { ctx.wrong(`L + R = ${arr[l]} + ${arr[r]} = **${s}**, which is ${s < target ? 'less than' : s > target ? 'greater than' : 'equal to'} ${target}. ${s < target ? 'You need a bigger sum: advance L.' : s > target ? 'You need a smaller sum: retreat R.' : 'That is the answer!'}`); return; }
      if (act === 'f') { finished = true; draw(); ctx.correct(`${arr[l]} + ${arr[r]} = ${target}. Each pointer only moved inward, so the whole search was O(n) with O(1) memory.`); return; }
      act === 'l' ? l++ : r--; draw();
    }
    draw();
    return { solve() { while (!finished) { const s = arr[l] + arr[r]; host.querySelector(`[data-act="${s < target ? 'l' : s > target ? 'r' : 'f'}"]`).click(); } } };
  };

  engines.bsearch = (host, item, ctx) => {
    const { arr, target, limit } = item; let lo = 0, hi = arr.length - 1, probes = 0, finished = false;
    host.append(el('div', { class: 'eyebrow' }, 'Binary search duel'), el('h2', { class: 'q', html: md(`Find **${target}** in at most **${limit} probes**. Tap an index to probe it.`) }));
    const bar = el('div', { class: 'tag probes' }), row = el('div', { class: 'chips bs' }), msg = el('p', { class: 'muted bs-msg' }, 'Tip: probing the middle always discards the most.');
    host.append(bar, row, msg);
    function draw() {
      bar.textContent = `Probes used: ${probes} / ${limit}`;
      row.replaceChildren(...arr.map((v, i) => el('button', { class: 'chip bsb' + (i < lo || i > hi ? ' dim' : ''), 'data-i': i, disabled: finished, onclick: () => probe(i), 'aria-label': `index ${i}, value ${v}` }, el('b', {}, v), el('small', {}, i))));
    }
    function reset(note) { lo = 0; hi = arr.length - 1; probes = 0; draw(); msg.textContent = note; }
    function probe(i) {
      if (finished) return;
      if (i < lo || i > hi) { msg.textContent = 'That part is already ruled out. Probe inside the bright range.'; return; }
      probes++;
      if (arr[i] === target) {
        if (probes <= limit) { finished = true; draw(); ctx.correct(`Found in ${probes} probe${probes > 1 ? 's' : ''}. The theoretical limit is ⌈log₂(${arr.length + 1})⌉ = ${limit}. Always probing the middle guarantees it.`); }
        else { ctx.wrong(`You found it, but used ${probes} probes (limit ${limit}). Probe the **middle** of the bright range each time. Starting over.`); reset('Starting over: aim for the middle.'); }
        return;
      }
      if (arr[i] < target) { lo = i + 1; msg.textContent = `${arr[i]} is too small → everything to its left is ruled out.`; }
      else { hi = i - 1; msg.textContent = `${arr[i]} is too big → everything to its right is ruled out.`; }
      if (probes >= limit) { ctx.wrong(`Out of probes (${limit}) before finding ${target}. Probe the middle of the remaining range. Starting over.`); reset('Starting over: aim for the middle.'); return; }
      draw();
    }
    draw();
    return { solve() { while (!finished) { host.querySelector(`.bsb[data-i="${(lo + hi) >> 1}"]`).click(); } } };
  };

  engines.graph = (host, item, ctx) => {
    const { n, edges, order, mode } = item; let k = 0;
    const adj = Array.from({ length: n }, () => []); edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); }); adj.forEach(l => l.sort((x, y) => x - y));
    host.append(el('div', { class: 'eyebrow' }, mode === 'bfs' ? 'Breadth-first search' : 'Depth-first search'),
      el('h2', { class: 'q', html: md(`Tap the nodes in the order **${mode.toUpperCase()}** visits them, starting at **A**. Visit neighbours in **alphabetical order**.`) }));
    const W = 320, H = 280, cx = W / 2, cy = H / 2, R = 108;
    const P = i => ({ x: cx + R * Math.cos(2 * Math.PI * i / n - Math.PI / 2), y: cy + R * Math.sin(2 * Math.PI * i / n - Math.PI / 2) });
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'graph-viz', role: 'group', 'aria-label': 'Graph' });
    edges.forEach(([a, b]) => { const p = P(a), q = P(b); s.append(svg('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'edge' })); });
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const p = P(i), g = svg('g', { class: 'gnode', tabindex: 0, role: 'button', 'aria-label': 'Node ' + LET[i], 'data-i': i }, svg('circle', { cx: p.x, cy: p.y, r: 20 }), svg('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle' }, LET[i]));
      g.addEventListener('click', () => tap(i)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(i); } });
      nodes.push(g); s.append(g);
    }
    const seq = el('p', { class: 'tag seq' }); host.append(el('div', { class: 'viz-wrap' }, s), seq,
      el('p', { class: 'muted' }, 'Adjacency: ' + adj.map((l, i) => `${LET[i]}: ${l.map(x => LET[x]).join(' ') || '–'}`).join(' · ')));
    const paint = () => { seq.textContent = 'Visited: ' + (order.slice(0, k).map(i => LET[i]).join(' → ') || '(none yet)'); nodes.forEach((g, i) => g.classList.toggle('visited', order.slice(0, k).includes(i))); };
    function tap(i) {
      if (k >= order.length || order.slice(0, k).includes(i)) return;
      if (i === order[k]) { k++; paint(); if (k === order.length) ctx.correct(`Order: ${order.map(x => LET[x]).join(' → ')}. ` + (mode === 'bfs' ? 'BFS uses a queue: every neighbour of the earliest-discovered node is visited before going deeper.' : 'DFS dives as deep as possible along the first unvisited neighbour, then backtracks.')); }
      else ctx.wrong(mode === 'bfs' ? 'BFS visits ALL neighbours of the current node (a queue) before moving to the next layer. Which node was discovered first?' : 'DFS goes as deep as it can first: take the smallest unvisited neighbour of the current node, and backtrack only when stuck.');
    }
    paint();
    return { solve() { order.forEach(i => nodes[i].dispatchEvent(new Event('click'))); } };
  };

  const api = { engines, el, md, esc };
  root.AFGames = api;
})(window);
