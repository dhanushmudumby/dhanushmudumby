/* Sound, confetti and toasts. All optional; the site works without them. */
(function (root) {
  'use strict';
  let ctx, enabled = true;
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tone(freq, dur, type, vol, delay) {
    if (!enabled) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* audio blocked */ }
  }
  const sound = {
    ok() { tone(660, 0.12, 'triangle'); tone(880, 0.16, 'triangle', 0.06, 0.09); },
    bad() { tone(180, 0.22, 'sawtooth', 0.04); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, i * 0.1)); },
    lose() { [330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.04, i * 0.13)); }
  };

  function confetti(ms) {
    if (reduced()) return;
    const c = document.createElement('canvas'); c.className = 'confetti'; document.body.append(c);
    const g = c.getContext('2d'); const W = c.width = innerWidth, H = c.height = innerHeight;
    const cols = ['#6ea8ff', '#a78bfa', '#34d399', '#fbbf24', '#fb7185'];
    const ps = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 14 - 4, s: 4 + Math.random() * 6, c: cols[Math.random() * cols.length | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 }));
    const end = performance.now() + (ms || 2200);
    (function frame(now) {
      g.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); g.restore(); });
      if (now < end) requestAnimationFrame(frame); else c.remove();
    })(performance.now());
  }

  function toast(msg, kind) {
    let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg; box.append(t);
    setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3000);
  }

  root.AFFx = { sound, confetti, toast, setSound: v => { enabled = !!v; } };
})(window);
