/* AlgoForge procedural puzzle generators.
 * Pure logic, no DOM, so they run in the browser and in Node tests.
 * Every generator takes a difficulty tier `d` (1, 2, 3, ...) and returns a challenge item. */
(function (root) {
  'use strict';

  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[rnd(0, a.length - 1)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const arrFmt = a => '[' + a.join(', ') + ']';
  const range = n => Array.from({ length: n }, (_, i) => i);
  const LET = 'ABCDEFGH';
  const asc = (a, b) => a - b;

  /* Build 4 unique options (correct + distractors). Returns {o, a}. */
  function opts(correct, cands, fmt, fill) {
    fmt = fmt || String;
    const c = fmt(correct); const set = [c];
    for (const x of cands) { const s = fmt(x); if (set.length < 4 && !set.includes(s)) set.push(s); }
    if (typeof correct === 'number') {
      for (let k = 1; set.length < 4 && k < 60; k++) {
        for (const v of [correct + k, correct - k]) {
          const s = fmt(v);
          if (set.length < 4 && !set.includes(s) && (v >= 0 || correct < 0)) set.push(s);
        }
      }
    } else if (fill) {
      for (let k = 0; set.length < 4 && k < 200; k++) { const s = fmt(fill()); if (!set.includes(s)) set.push(s); }
    }
    const o = shuffle(set);
    return { o, a: o.indexOf(c) };
  }

  /* ---------- 1. Big-O reading ---------- */
  const BIGO = [
    { d: 1, c: ['for i in 1..n:', '  work()'], a: 'O(n)', w: 'One loop that runs n times.' },
    { d: 1, c: ['for i in 1..n:', '  for j in 1..n:', '    work()'], a: 'O(n²)', w: 'Loops multiply: n × n.' },
    { d: 1, c: ['while n > 1:', '  n = n / 2', '  work()'], a: 'O(log n)', w: 'Halving each step means about log₂(n) steps.' },
    { d: 1, c: ['x = a[0]', 'y = a[n-1]', 'return x + y'], a: 'O(1)', w: 'Two array reads. Work does not depend on n.' },
    { d: 1, c: ['for i in 1..n:', '  work()', 'for j in 1..n:', '  work()'], a: 'O(n)', w: 'Sequential loops add: n + n = 2n, and constants drop.' },
    { d: 2, c: ['for i in 1..n:', '  for j in i..n:', '    work()'], a: 'O(n²)', w: 'n + (n−1) + … + 1 = n(n+1)/2, which is O(n²).' },
    { d: 2, c: ['for i in 1..n:', '  k = 1', '  while k < n:', '    k = k * 2', '    work()'], a: 'O(n log n)', w: 'The outer loop runs n times; the doubling inner loop runs log n times.' },
    { d: 2, c: ['for i in 1..n:', '  for j in 1..100:', '    work()'], a: 'O(n)', w: 'The inner loop is a constant 100, so total work is 100n, i.e. O(n).' },
    { d: 2, c: ['sort(a)', 'for x in a:', '  work()'], a: 'O(n log n)', w: 'Sorting dominates: O(n log n) + O(n).' },
    { d: 2, c: ['for i in 1..n:', '  binarySearch(sortedList, i)'], a: 'O(n log n)', w: 'n binary searches, each O(log n).' },
    { d: 3, c: ['for i in 1..sqrt(n):', '  work()'], a: 'O(√n)', w: 'The loop stops at √n.' },
    { d: 3, c: ['function f(n):', '  if n <= 1: return 1', '  return f(n-1) + f(n-2)'], a: 'O(2ⁿ)', w: 'Each call spawns two more; the call tree doubles per level.' },
    { d: 3, c: ['for i in 1..n:', '  for j in 1..n:', '    for k in 1..n:', '      work()'], a: 'O(n³)', w: 'Three nested loops: n × n × n.' },
    { d: 3, c: ['i = 1', 'while i < n:', '  work()', '  i = i * 3'], a: 'O(log n)', w: 'Multiplying by 3 each time still reaches n in log₃(n) steps, and the log base is a constant.' }
  ];
  const BIGO_ALL = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)'];
  function bigO(d) {
    const t = pick(BIGO.filter(x => x.d <= Math.max(1, d)));
    const wrong = shuffle(BIGO_ALL.filter(x => x !== t.a));
    const { o, a } = opts(t.a, wrong, String);
    return { t: 'mcq', q: 'What is the time complexity of this code?', code: t.c.join('\n'), o, a, why: t.w };
  }

  /* ---------- 2. Stack / queue simulation ---------- */
  function stackSim(d) {
    const kind = pick(['stack', 'queue']);
    const n = 5 + Math.min(d, 4); const ops = []; const ds = [];
    for (let i = 0; i < n; i++) {
      if (ds.length === 0 || Math.random() < 0.62) { const v = rnd(1, 9); ops.push('push ' + v); ds.push(v); }
      else { ops.push(kind === 'stack' ? 'pop' : 'dequeue'); kind === 'stack' ? ds.pop() : ds.shift(); }
    }
    if (ds.length === 0) { const v = rnd(1, 9); ops.push('push ' + v); ds.push(v); }
    const ops2 = ops.map(o => (kind === 'queue' && o.startsWith('push')) ? o.replace('push', 'enqueue') : o);
    const ans = kind === 'stack' ? ds[ds.length - 1] : ds[0];
    const pushed = ops.filter(o => o.startsWith('push')).map(o => +o.split(' ')[1]);
    const { o, a } = opts(ans, shuffle(pushed), String);
    return {
      t: 'mcq',
      q: kind === 'stack' ? 'Run these operations on an empty **stack**. What is on top at the end?' : 'Run these operations on an empty **queue**. Which value is at the front at the end?',
      code: ops2.join('\n'), o, a,
      why: kind === 'stack' ? `Last in, first out. Final stack (bottom→top): ${arrFmt(ds)}.` : `First in, first out. Final queue (front→back): ${arrFmt(ds)}.`
    };
  }

  /* ---------- 3. Sliding window sum ---------- */
  function windowSum(d) {
    const len = 6 + Math.min(d, 4), k = d >= 3 ? pick([3, 4]) : 3;
    const lo = d >= 2 ? -3 : 1;
    const arr = range(len).map(() => rnd(lo, 9));
    const sums = []; for (let i = 0; i + k <= len; i++) sums.push(arr.slice(i, i + k).reduce((x, y) => x + y, 0));
    const best = Math.max(...sums);
    const { o, a } = opts(best, shuffle(sums), String);
    return {
      t: 'mcq', q: `What is the **largest sum of ${k} consecutive elements**?`, code: arrFmt(arr), o, a,
      why: `Slide the window: add the new element, drop the old one. Window sums: ${arrFmt(sums)}. Max = ${best}.`
    };
  }

  /* ---------- 4. Two pointers (interactive) ---------- */
  function twoptr(d) {
    const n = 6 + Math.min(d, 4);
    const arr = sample(range(40).map(x => x + 1), n).sort(asc);
    const i = rnd(0, n - 2), j = rnd(i + 1, n - 1);
    return { t: 'twoptr', arr, target: arr[i] + arr[j] };
  }

  /* ---------- 5. Binary search duel (interactive) ---------- */
  function bsearch(d) {
    const n = pick([7, 9, 11, 15, 15, 20, 31].filter(x => x <= 7 + 4 * d + 4));
    const arr = sample(range(99).map(x => x + 1), n).sort(asc);
    const target = pick(arr);
    return { t: 'bsearch', arr, target, limit: Math.ceil(Math.log2(n + 1)) };
  }

  /* ---------- 6. Graph traversal order (interactive) ---------- */
  function graphOrder(mode, d) {
    const n = 5 + Math.min(3, Math.floor(d / 2));
    const set = new Set(); const edges = [];
    const add = (a, b) => { const k = Math.min(a, b) + '-' + Math.max(a, b); if (a !== b && !set.has(k)) { set.add(k); edges.push([Math.min(a, b), Math.max(a, b)]); } };
    for (let i = 1; i < n; i++) add(i, rnd(0, i - 1));
    for (let e = rnd(1, 2 + Math.floor(d / 3)); e > 0; e--) add(rnd(0, n - 1), rnd(0, n - 1));
    const adj = range(n).map(() => []);
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    adj.forEach(l => l.sort(asc));
    const order = []; const seen = new Set([0]);
    if (mode === 'bfs') {
      const q = [0]; while (q.length) { const u = q.shift(); order.push(u); adj[u].forEach(v => { if (!seen.has(v)) { seen.add(v); q.push(v); } }); }
    } else {
      const go = u => { seen.add(u); order.push(u); adj[u].forEach(v => { if (!seen.has(v)) go(v); }); };
      go(0);
    }
    return { t: 'graph', mode, n, edges, start: 0, order };
  }

  /* ---------- 7. Heaps ---------- */
  function siftUp(h, i) { while (i > 0) { const p = (i - 1) >> 1; if (h[p] > h[i]) { [h[p], h[i]] = [h[i], h[p]]; i = p; } else break; } }
  function heapInsert(h, v) { h.push(v); siftUp(h, h.length - 1); }
  function siftDown(h, i) { const n = h.length; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < n && h[l] < h[m]) m = l; if (r < n && h[r] < h[m]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
  function extractMin(h) { const top = h[0]; const last = h.pop(); if (h.length) { h[0] = last; siftDown(h, 0); } return top; }

  function heapOps(d) {
    const n = rnd(5, 6 + Math.min(2, d));
    const vals = sample(range(15).map(x => x + 1), n);
    const h = []; vals.forEach(v => heapInsert(h, v));
    if (Math.random() < 0.5) {
      const mh = []; vals.forEach(v => heapInsert(mh, -v));
      const { o, a } = opts(h, [vals, vals.slice().sort(asc), mh.map(v => -v)], arrFmt, () => shuffle(vals));
      return {
        t: 'mcq', q: 'Insert these values **in order** into an empty **min-heap**. What does the heap array look like?', code: arrFmt(vals), o, a,
        why: 'Each insert appends at the end, then swaps upward while smaller than its parent. Result: ' + arrFmt(h) + '.'
      };
    }
    const after = h.slice(); extractMin(after);
    const w2 = h.slice(); const last = w2.pop(); w2[0] = last;
    const { o, a } = opts(after, [h.slice(1), w2, h.slice(1).sort(asc)], arrFmt, () => shuffle(after));
    return {
      t: 'mcq', q: 'This is a valid **min-heap** (array form). What is the array after **one extract-min**?', code: arrFmt(h), o, a,
      why: 'Move the last element to the root, then sift it down by swapping with the smaller child. Result: ' + arrFmt(after) + '.'
    };
  }

  /* ---------- 8. Sorting snapshots ---------- */
  function sortPass(d) {
    const n = rnd(5, 6);
    const arr = sample(range(20).map(x => x + 1), n);
    const kind = pick(d >= 2 ? ['bubble', 'insertion', 'selection'] : ['bubble', 'insertion']);
    const bubble = (a, p) => { a = a.slice(); for (let r = 0; r < p; r++) for (let i = 0; i < a.length - 1; i++) if (a[i] > a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; };
    const insertion = (a, m) => a.slice(0, m).sort(asc).concat(a.slice(m));
    const selection = (a, k) => { a = a.slice(); for (let i = 0; i < k; i++) { let m = i; for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j; [a[i], a[m]] = [a[m], a[i]]; } return a; };
    let ans, cands, q, why;
    if (kind === 'bubble') {
      const p = rnd(1, 2); ans = bubble(arr, p); cands = [bubble(arr, p - 1), bubble(arr, p + 1), arr.slice().sort(asc)];
      q = `Run **${p} full pass${p > 1 ? 'es' : ''} of bubble sort** (swap adjacent out-of-order pairs, left to right). Resulting array?`;
      why = 'Each pass bubbles the largest remaining value to the end by swapping adjacent pairs.';
    } else if (kind === 'insertion') {
      const m = rnd(3, n - 1); ans = insertion(arr, m); cands = [insertion(arr, m - 1), insertion(arr, m + 1), arr.slice().sort(asc)];
      q = `Insertion sort has inserted the **first ${m} elements** into their sorted place. Array now?`;
      why = `The first ${m} elements are sorted among themselves; everything after is untouched.`;
    } else {
      const k = rnd(1, 2); ans = selection(arr, k); cands = [selection(arr, k - 1), selection(arr, k + 1), arr.slice().sort(asc)];
      q = `Run **${k} step${k > 1 ? 's' : ''} of selection sort** (find the minimum of the unsorted part, swap it to the front). Array now?`;
      why = 'Selection sort swaps the minimum of the unsorted suffix into position each step.';
    }
    const { o, a } = opts(ans, cands, arrFmt, () => shuffle(arr));
    return { t: 'mcq', q, code: arrFmt(arr), o, a, why: why + ' Answer: ' + arrFmt(ans) + '.' };
  }

  /* ---------- 9. Intervals ---------- */
  function intervals(d) {
    const n = 4 + Math.min(d, 3);
    const iv = range(n).map(() => { const s = rnd(1, 18); return [s, s + rnd(1, 5)]; });
    const text = iv.map(x => `[${x[0]}, ${x[1]}]`).join('  ');
    if (Math.random() < 0.5) {
      const s = iv.slice().sort((x, y) => x[0] - y[0]); const m = [];
      s.forEach(x => { if (m.length && m[m.length - 1][1] >= x[0]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], x[1]); else m.push(x.slice()); });
      const { o, a } = opts(m.length, [n, 1], String);
      return { t: 'mcq', q: 'Merge all overlapping intervals (touching ends count as overlapping). **How many intervals remain?**', code: text, o, a, why: 'Sort by start, then extend the last interval while the next one overlaps. Merged: ' + m.map(x => `[${x[0]}, ${x[1]}]`).join(' ') + '.' };
    }
    const ev = []; iv.forEach(x => { ev.push([x[0], 1]); ev.push([x[1], -1]); });
    ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    let cur = 0, mx = 0; ev.forEach(e => { cur += e[1]; mx = Math.max(mx, cur); });
    const { o, a } = opts(mx, [n, 1], String);
    return { t: 'mcq', q: 'Each interval is a meeting (a room is free the instant a meeting ends). **How many rooms are needed at minimum?**', code: text, o, a, why: 'Sweep the timeline: +1 at each start, −1 at each end. The peak overlap is ' + mx + '.' };
  }

  /* ---------- 10. Kadane ---------- */
  function kadane(d) {
    for (;;) {
      const n = 7 + Math.min(d, 3);
      const arr = range(n).map(() => rnd(-6, 9));
      if (!arr.some(x => x > 0)) continue;
      let best = -Infinity, cur = 0; arr.forEach(x => { cur = Math.max(x, cur + x); best = Math.max(best, cur); });
      const total = arr.reduce((x, y) => x + y, 0), mx = Math.max(...arr), pos = arr.filter(x => x > 0).reduce((x, y) => x + y, 0);
      if (best === mx) continue;
      const { o, a } = opts(best, [total, mx, pos], String);
      return { t: 'mcq', q: 'What is the **maximum sum of a contiguous subarray**?', code: arrFmt(arr), o, a, why: 'At each element choose: extend the running sum or restart here. cur = max(x, cur + x). Best = ' + best + '.' };
    }
  }

  /* ---------- 11. Coin change ---------- */
  function coin(d) {
    const sets = [[1, 3, 4], [1, 5, 6], [1, 2, 5], [1, 7, 10], [1, 4, 6], [1, 5, 10, 12]];
    for (;;) {
      const coins = pick(sets); const amt = rnd(7, 14 + 2 * d);
      const dp = [0]; for (let x = 1; x <= amt; x++) { dp[x] = Infinity; coins.forEach(c => { if (c <= x && dp[x - c] + 1 < dp[x]) dp[x] = dp[x - c] + 1; }); }
      let g = 0, rem = amt; coins.slice().sort((x, y) => y - x).forEach(c => { g += Math.floor(rem / c); rem %= c; });
      if (!isFinite(dp[amt])) continue;
      const { o, a } = opts(dp[amt], [g, dp[amt] + 1, dp[amt] - 1], String);
      return {
        t: 'mcq', q: `Fewest coins to make **${amt}** using coins {${coins.join(', ')}} (unlimited supply)?`, o, a,
        why: `DP: best[x] = 1 + min(best[x − coin]). Answer ${dp[amt]}.` + (g !== dp[amt] ? ` Greedy (biggest coin first) gives ${g}, which is wrong here.` : ' Greedy happens to work for this input, but not in general.')
      };
    }
  }

  /* ---------- 12. DP grid paths ---------- */
  function dpGrid(d) {
    for (;;) {
      const R = rnd(3, 4 + (d >= 3 ? 1 : 0)), C = rnd(3, 5);
      const g = range(R).map(() => range(C).map(() => 0));
      for (let k = rnd(1, 2 + Math.floor(d / 3)); k > 0; k--) { const r = rnd(0, R - 1), c = rnd(0, C - 1); if ((r || c) && !(r === R - 1 && c === C - 1)) g[r][c] = 1; }
      const dp = range(R).map(() => range(C).map(() => 0)); dp[0][0] = 1;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (g[r][c]) { dp[r][c] = 0; continue; } if (r || c) dp[r][c] = (r ? dp[r - 1][c] : 0) + (c ? dp[r][c - 1] : 0); }
      const ans = dp[R - 1][C - 1]; if (ans === 0) continue;
      const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
      const { o, a } = opts(ans, [binom(R + C - 2, R - 1), ans + 1, ans - 1], String);
      return {
        t: 'mcq', q: 'A robot starts top-left and moves only **right or down** to the bottom-right. `#` cells are blocked. **How many distinct paths?**',
        viz: { type: 'grid', rows: g.map(r => r.map(x => x ? '#' : '·')) }, o, a,
        why: 'paths[r][c] = paths[r−1][c] + paths[r][c−1], and 0 for a blocked cell. Bottom-right = ' + ans + '. (Ignoring walls would give ' + binom(R + C - 2, R - 1) + '.)'
      };
    }
  }

  /* ---------- 13. Tree traversals ---------- */
  const bstIns = (n, v) => { if (!n) return { v, l: null, r: null }; if (v < n.v) n.l = bstIns(n.l, v); else n.r = bstIns(n.r, v); return n; };
  const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o); } return o; };
  const ino = (n, o = []) => { if (n) { ino(n.l, o); o.push(n.v); ino(n.r, o); } return o; };
  const post = (n, o = []) => { if (n) { post(n.l, o); post(n.r, o); o.push(n.v); } return o; };
  const lvl = n => { const o = [], q = n ? [n] : []; while (q.length) { const x = q.shift(); o.push(x.v); if (x.l) q.push(x.l); if (x.r) q.push(x.r); } return o; };
  function tree(d) {
    const n = 5 + Math.min(2, Math.floor(d / 2));
    const vals = sample(range(30).map(x => x + 1), n); let root = null; vals.forEach(v => { root = bstIns(root, v); });
    const kinds = { preorder: [pre, 'root → left → right'], inorder: [ino, 'left → root → right (sorted order for a BST)'], postorder: [post, 'left → right → root'], 'level-order': [lvl, 'level by level, left to right (BFS)'] };
    const k = pick(Object.keys(kinds)); const ans = kinds[k][0](root);
    const others = Object.keys(kinds).filter(x => x !== k).map(x => kinds[x][0](root));
    const { o, a } = opts(ans, others, arrFmt, () => shuffle(ans));
    return { t: 'mcq', q: `The BST below was built by inserting ${arrFmt(vals)} in order. What is its **${k}** traversal?`, viz: { type: 'tree', root }, o, a, why: `${k[0].toUpperCase() + k.slice(1)} visits ${kinds[k][1]}. Result: ${arrFmt(ans)}.` };
  }

  /* ---------- 14. Dijkstra ---------- */
  function dijkstraGen(d) {
    const n = 5 + (d >= 3 ? 1 : 0); const set = new Set(); const edges = [];
    const add = (a, b, w) => { const k = Math.min(a, b) + '-' + Math.max(a, b); if (a !== b && !set.has(k)) { set.add(k); edges.push([Math.min(a, b), Math.max(a, b), w]); } };
    for (let i = 1; i < n; i++) add(i, rnd(0, i - 1), rnd(1, 9));
    for (let e = rnd(2, 3 + Math.floor(d / 3)); e > 0; e--) add(rnd(0, n - 1), rnd(0, n - 1), rnd(1, 9));
    const adj = range(n).map(() => []); edges.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
    const dist = range(n).map(() => Infinity); dist[0] = 0; const done = new Set();
    for (let it = 0; it < n; it++) { let u = -1; range(n).forEach(i => { if (!done.has(i) && (u < 0 || dist[i] < dist[u])) u = i; }); done.add(u); adj[u].forEach(([v, w]) => { if (dist[u] + w < dist[v]) dist[v] = dist[u] + w; }); }
    const T = n - 1; const par = range(n).map(() => -1), seen = new Set([0]), q = [0];
    while (q.length) { const u = q.shift(); adj[u].forEach(([v, w]) => { if (!seen.has(v)) { seen.add(v); par[v] = [u, w]; q.push(v); } }); }
    let hop = 0, cur = T; while (cur !== 0) { hop += par[cur][1]; cur = par[cur][0]; }
    const { o, a } = opts(dist[T], [hop, dist[T] + 1, dist[T] - 1], String);
    return {
      t: 'mcq', q: `What is the **minimum total weight** of a path from A to ${LET[T]}?`, code: edges.map(e => `${LET[e[0]]} — ${LET[e[1]]} : ${e[2]}`).join('\n'), o, a,
      why: 'Dijkstra: repeatedly settle the unsettled node with the smallest distance and relax its edges. Distances from A: ' + dist.map((x, i) => `${LET[i]}=${x}`).join(', ') + '. Fewest hops is not the same as cheapest' + (hop !== dist[T] ? ` (fewest-hops path costs ${hop}).` : '.')
    };
  }

  /* ---------- 15. Topological order ---------- */
  function topo(d) {
    for (;;) {
      const n = 5 + (d >= 3 ? 1 : 0); const perm = shuffle(range(n)); const edges = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.random() < (j === i + 1 ? 0.6 : 0.25)) edges.push([perm[i], perm[j]]);
      if (edges.length < 3) continue;
      const valid = ord => edges.every(([u, v]) => ord.indexOf(u) < ord.indexOf(v));
      const indeg = range(n).map(() => 0); edges.forEach(([, v]) => indeg[v]++);
      const avail = range(n).filter(i => !indeg[i]); const correct = [];
      while (avail.length) { const u = avail.splice(rnd(0, avail.length - 1), 1)[0]; correct.push(u); edges.forEach(([a, b]) => { if (a === u && --indeg[b] === 0) avail.push(b); }); }
      const bad = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const c = correct.slice();[c[i], c[j]] = [c[j], c[i]]; if (!valid(c)) bad.push(c); }
      const cand = sample(bad, 3); let guard = 0;
      while (cand.length < 3 && guard++ < 200) { const c = shuffle(range(n)); if (!valid(c)) cand.push(c); }
      if (cand.length < 3) continue;
      const fmt = ord => ord.map(i => LET[i]).join(' → ');
      const { o, a } = opts(correct, cand, fmt);
      if (o.length < 4) continue;
      return {
        t: 'mcq', q: 'Each line `X → Y` means X must come **before** Y. Which ordering is a valid topological order?', code: edges.map(([u, v]) => `${LET[u]} → ${LET[v]}`).join('\n'), o, a,
        why: 'Repeatedly take a node with no unmet prerequisites (in-degree 0). In every wrong option some prerequisite appears after the node that needs it.'
      };
    }
  }

  /* ---------- 16. Counting / recursion ---------- */
  function count(d) {
    const kind = pick(['fib', 'subsets', 'perms']);
    const calls = n => n <= 1 ? 1 : 1 + calls(n - 1) + calls(n - 2);
    const fact = n => n <= 1 ? 1 : n * fact(n - 1);
    if (kind === 'fib') {
      const n = rnd(4, 5 + Math.min(d, 3)); const ans = calls(n);
      const { o, a } = opts(ans, [calls(n - 1), calls(n + 1), n * n], String);
      return { t: 'mcq', q: `How many **total calls** (including the first) does \`fib(${n})\` make?`, code: 'function fib(n):\n  if n <= 1: return n\n  return fib(n-1) + fib(n-2)', o, a, why: `calls(n) = 1 + calls(n−1) + calls(n−2), with calls(0)=calls(1)=1. That gives ${ans}, so it grows exponentially.` };
    }
    if (kind === 'subsets') {
      const n = rnd(4, 7 + Math.min(d, 3)); const { o, a } = opts(1 << n, [n * n, 2 * n, fact(Math.min(n, 6))], String);
      return { t: 'mcq', q: `How many **subsets** (including the empty one) does a set of ${n} distinct items have?`, o, a, why: `Each item is either in or out: 2^${n} = ${1 << n}.` };
    }
    const n = rnd(4, 6); const { o, a } = opts(fact(n), [n * n, 2 ** n, fact(n - 1)], String);
    return { t: 'mcq', q: `How many distinct **orderings (permutations)** of ${n} different items exist?`, o, a, why: `${n}! = ${fact(n)}: n choices for the first slot, n−1 for the next, and so on.` };
  }

  /* ---------- 17. Prefix sums ---------- */
  function prefixSum(d) {
    const n = 5 + Math.min(d, 2); const arr = range(n).map(() => rnd(1, 9));
    const P = [0]; arr.forEach(x => P.push(P[P.length - 1] + x));
    if (Math.random() < 0.5) {
      const w1 = P.slice(1), w2 = arr.slice().sort(asc), w3 = P.map((x, i) => i ? x - arr[i - 1] + (arr[i - 2] || 0) : 0);
      const { o, a } = opts(P, [w1, w2, w3], arrFmt, () => shuffle(P));
      return { t: 'mcq', q: 'Build the **prefix-sum array** P where P[k] = sum of the first k elements (so P[0] = 0).', code: arrFmt(arr), o, a, why: 'Each entry adds the next element to the previous prefix. Result: ' + arrFmt(P) + '.' };
    }
    const i = rnd(0, n - 3), j = rnd(i + 1, n - 1); const ans = P[j + 1] - P[i];
    const { o, a } = opts(ans, [P[j] - P[i], P[j + 1] - P[i + 1], P[j + 1] + P[i]], String);
    return { t: 'mcq', q: `Given prefix array P = ${arrFmt(P)}, what is the sum of the original elements at **indices ${i} through ${j}** (inclusive)?`, o, a, why: `sum(i..j) = P[j+1] − P[i] = ${P[j + 1]} − ${P[i]} = ${ans}. One subtraction, whatever the range size.` };
  }

  /* ---------- 18. Bit tricks ---------- */
  function bits(d) {
    const bin = n => n.toString(2);
    const kind = pick(['xor', 'pop', 'clear']);
    if (kind === 'xor') {
      const pairs = sample(range(20).map(x => x + 1), 3 + Math.min(d, 2)); const single = rnd(21, 40);
      const arr = shuffle(pairs.concat(pairs).concat([single]));
      const { o, a } = opts(single, pairs, String);
      return { t: 'mcq', q: 'Every value appears **twice except one**. Which one is the single value? (Hint: x ^ x = 0 and x ^ 0 = x.)', code: arrFmt(arr), o, a, why: 'XOR everything: pairs cancel to 0, leaving the single value ' + single + ' in O(n) time and O(1) memory.' };
    }
    if (kind === 'pop') {
      const n = rnd(20, 200 + 20 * d); const c = bin(n).split('').filter(x => x === '1').length;
      const { o, a } = opts(c, [bin(n).length], String);
      return { t: 'mcq', q: `How many **1 bits** are set in ${n}?`, code: `${n} = ${bin(n)} (binary)`, o, a, why: `Count the 1s in ${bin(n)}: ${c}. Brian Kernighan's trick: repeat n = n & (n−1) until 0; each step clears the lowest set bit.` };
    }
    const n = rnd(12, 200); const r = n & (n - 1);
    const { o, a } = opts(r, [n >> 1, n - 1, n & 1], String);
    return { t: 'mcq', q: `What is \`n & (n - 1)\` for n = ${n}?`, code: `n     = ${bin(n)}\nn - 1 = ${bin(n - 1)}`, o, a, why: `Subtracting 1 flips the lowest set bit and the zeros below it, so AND clears exactly the lowest set bit: ${bin(r)} = ${r}.` };
  }

  /* ---------- 19. Frequency counting ---------- */
  function freq(d) {
    for (;;) {
      const n = 8 + Math.min(d, 4); const arr = range(n).map(() => rnd(1, 6)); const m = {}; arr.forEach(x => { m[x] = (m[x] || 0) + 1; });
      const mx = Math.max(...Object.values(m)); const tops = Object.keys(m).filter(k => m[k] === mx);
      if (tops.length !== 1) continue;
      const { o, a } = opts(+tops[0], Object.keys(m).map(Number), String);
      return { t: 'mcq', q: 'Which value appears **most often**?', code: arrFmt(arr), o, a, why: 'Build a hash map value → count in one pass: ' + Object.entries(m).map(([k, v]) => `${k}:${v}`).join(', ') + '.' };
    }
  }

  const GENS = {
    bigO, stackSim, windowSum, twoptr, bsearch,
    bfs: d => graphOrder('bfs', d), dfs: d => graphOrder('dfs', d),
    heapOps, sortPass, intervals, kadane, coin, dpGrid, tree,
    dijkstra: dijkstraGen, topo, count, prefixSum, bits, freq
  };
  const make = (g, d) => { const it = GENS[g](Math.max(1, d | 0)); it.gen = g; return it; };

  const api = { GENS, make, helpers: { rnd, pick, shuffle, sample, opts, arrFmt, heapInsert, extractMin, bstIns, pre, ino, post, lvl } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AFGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
