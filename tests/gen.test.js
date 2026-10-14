/* Run: node tests/gen.test.js
 * Fuzzes every generator and cross-checks answers with independent brute-force solutions. */
const { GENS, make } = require('../js/gen.js');
let fails = 0, checks = 0;
const bad = (g, d, msg, it) => { fails++; if (fails < 15) console.error(`FAIL ${g} d=${d}: ${msg}`, it && JSON.stringify(it).slice(0, 300)); };
const ok = (c, g, d, msg, it) => { checks++; if (!c) bad(g, d, msg, it); };
const nums = s => (s.match(/-?\d+/g) || []).map(Number);

for (const g of Object.keys(GENS)) {
  for (let d = 1; d <= 9; d++) {
    for (let k = 0; k < 150; k++) {
      let it; try { it = make(g, d); } catch (e) { bad(g, d, 'threw ' + e.message); continue; }
      ok(['mcq', 'twoptr', 'bsearch', 'graph'].includes(it.t), g, d, 'bad type', it);
      if (it.t === 'mcq') {
        ok(it.o.length === 4, g, d, 'need 4 options: ' + it.o.length, it);
        ok(new Set(it.o).size === 4, g, d, 'duplicate options', it);
        ok(it.a >= 0 && it.a < 4, g, d, 'answer index out of range', it);
        ok(typeof it.why === 'string' && it.why.length > 10, g, d, 'missing explanation', it);
        // independent checks
        const ans = it.o[it.a];
        if (g === 'kadane') {
          const a = nums(it.code); let best = -Infinity;
          for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; best = Math.max(best, s); } }
          ok(+ans === best, g, d, `kadane ${ans} != ${best}`, it);
        }
        if (g === 'windowSum') {
          const a = nums(it.code), kk = +it.q.match(/of (\d+) consecutive/)[1]; let best = -Infinity;
          for (let i = 0; i + kk <= a.length; i++) best = Math.max(best, a.slice(i, i + kk).reduce((x, y) => x + y, 0));
          ok(+ans === best, g, d, `window ${ans} != ${best}`, it);
        }
        if (g === 'dpGrid') {
          const rows = it.viz.rows, R = rows.length, C = rows[0].length;
          const f = (r, c) => (r < 0 || c < 0 || rows[r][c] === '#') ? 0 : (r === 0 && c === 0 ? 1 : f(r - 1, c) + f(r, c - 1));
          ok(+ans === f(R - 1, C - 1), g, d, 'grid paths mismatch', it);
        }
        if (g === 'coin') {
          const m = it.q.match(/make \*\*(\d+)\*\* using coins \{([\d, ]+)\}/); const amt = +m[1], coins = m[2].split(',').map(Number);
          let lv = [0], seen = new Set([0]), steps = 0, found = false;
          while (!found && lv.length) { steps++; const nx = []; for (const x of lv) for (const c of coins) { const y = x + c; if (y === amt) found = true; if (y < amt && !seen.has(y)) { seen.add(y); nx.push(y); } } lv = nx; }
          ok(+ans === steps, g, d, `coin ${ans} != BFS ${steps}`, it);
        }
        if (g === 'topo') {
          const edges = it.code.split('\n').map(l => l.split(' → ')), ord = ans.split(' → ');
          ok(edges.every(([u, v]) => ord.indexOf(u) < ord.indexOf(v)), g, d, 'chosen answer is not a valid topo order', it);
          it.o.forEach((o, i) => { if (i !== it.a) { const od = o.split(' → '); ok(!edges.every(([u, v]) => od.indexOf(u) < od.indexOf(v)), g, d, 'a distractor is also valid', it); } });
        }
        if (g === 'dijkstra') {
          const L = 'ABCDEFGH', ed = it.code.split('\n').map(l => { const m = l.match(/(\w) — (\w) : (\d+)/); return [L.indexOf(m[1]), L.indexOf(m[2]), +m[3]]; });
          const n = Math.max(...ed.flat().slice(0)) >= 5 ? 6 : 5; const D = Array.from({ length: 8 }, (_, i) => Array.from({ length: 8 }, (_, j) => i === j ? 0 : Infinity));
          ed.forEach(([a, b, w]) => { D[a][b] = Math.min(D[a][b], w); D[b][a] = Math.min(D[b][a], w); });
          for (let k = 0; k < 8; k++) for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) D[i][j] = Math.min(D[i][j], D[i][k] + D[k][j]);
          const T = L.indexOf(it.q.match(/to (\w)\?/)[1]);
          ok(+ans === D[0][T], g, d, `dijkstra ${ans} != FW ${D[0][T]}`, it);
        }
        if (g === 'intervals') {
          const iv = (it.code.match(/\[\d+, \d+\]/g) || []).map(x => nums(x));
          if (/How many intervals remain/.test(it.q)) {
            const s = iv.slice().sort((a, b) => a[0] - b[0]); let c = 0, end = -Infinity; s.forEach(x => { if (x[0] > end) { c++; end = x[1]; } else end = Math.max(end, x[1]); });
            ok(+ans === c, g, d, `merge ${ans} != ${c}`, it);
          } else {
            let mx = 0; for (let t = 0; t <= 30; t += 0.5) mx = Math.max(mx, iv.filter(x => x[0] <= t && t < x[1]).length);
            ok(+ans === mx, g, d, `rooms ${ans} != ${mx}`, it);
          }
        }
        if (g === 'freq') {
          const a = nums(it.code), m = {}; a.forEach(x => m[x] = (m[x] || 0) + 1);
          ok(+ans === +Object.keys(m).sort((x, y) => m[y] - m[x])[0], g, d, 'freq mismatch', it);
        }
        if (g === 'stackSim') {
          const kind = /stack/.test(it.q) ? 's' : 'q'; const ds = [];
          it.code.split('\n').forEach(l => { if (/^(push|enqueue)/.test(l)) ds.push(+l.split(' ')[1]); else kind === 's' ? ds.pop() : ds.shift(); });
          ok(+ans === (kind === 's' ? ds[ds.length - 1] : ds[0]), g, d, 'stack/queue mismatch', it);
        }
        if (g === 'bits') {
          if (/1 bits/.test(it.q)) { const n = +it.q.match(/in (\d+)\?/)[1]; ok(+ans === n.toString(2).replace(/0/g, '').length, g, d, 'popcount', it); }
          if (/n & \(n - 1\)/.test(it.q)) { const n = +it.q.match(/n = (\d+)/)[1]; ok(+ans === (n & (n - 1)), g, d, 'n&(n-1)', it); }
          if (/twice except one/.test(it.q)) { ok(+ans === nums(it.code).reduce((x, y) => x ^ y, 0), g, d, 'xor', it); }
        }
        if (g === 'heapOps' && /Insert these/.test(it.q)) {
          const h = []; nums(it.code).forEach(v => { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p] > h[i]) { [h[p], h[i]] = [h[i], h[p]]; i = p; } else break; } });
          ok(ans === '[' + h.join(', ') + ']', g, d, 'heap build mismatch', it);
        }
        if (g === 'prefixSum' && /Build the/.test(it.q)) { const a = nums(it.code); let s = 0; const P = [0]; a.forEach(x => P.push(s += x)); ok(ans === '[' + P.join(', ') + ']', g, d, 'prefix mismatch', it); }
        if (g === 'bigO') ok(!!it.code, g, d, 'no code', it);
        if (g === 'count' && /subsets/.test(it.q)) ok(+ans === 2 ** +it.q.match(/set of (\d+)/)[1], g, d, 'subsets', it);
      }
      if (it.t === 'twoptr') { let f = false; for (let i = 0; i < it.arr.length; i++) for (let j = i + 1; j < it.arr.length; j++) if (it.arr[i] + it.arr[j] === it.target) f = true; ok(f, g, d, 'twoptr has no solution', it); ok(it.arr.every((x, i, a) => !i || a[i - 1] < x), g, d, 'twoptr not sorted unique', it); }
      if (it.t === 'bsearch') { ok(it.arr.includes(it.target), g, d, 'target missing', it); ok(it.limit >= 3, g, d, 'limit too small', it); }
      if (it.t === 'graph') {
        ok(it.order.length === it.n && new Set(it.order).size === it.n, g, d, 'order must visit every node once (connected graph)', it);
        const adj = Array.from({ length: it.n }, () => []); it.edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
        for (let i = 1; i < it.order.length; i++) ok(adj[it.order[i]].some(x => it.order.slice(0, i).includes(x)), g, d, 'order step not adjacent to a visited node', it);
      }
    }
  }
}
console.log(`${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
