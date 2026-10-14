/* Progress, XP, streaks and mastery, persisted in localStorage. */
(function (root) {
  'use strict';
  const KEY = 'algoforge.v1';
  const today = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

  const fresh = () => ({
    xp: 0, streak: { n: 0, last: '' }, levels: {}, skills: {}, badges: {},
    endless: { best: 0, bestScore: 0, runs: 0 }, daily: { date: today(), xp: 0 },
    stats: { answered: 0, firstTry: 0 }, settings: { theme: 'auto', sound: true, unlockAll: false }
  });

  let S;
  function load() {
    try { const raw = JSON.parse(localStorage.getItem(KEY)); S = Object.assign(fresh(), raw || {}); } catch (e) { S = fresh(); }
    S.settings = Object.assign(fresh().settings, S.settings);
    if (S.daily.date !== today()) S.daily = { date: today(), xp: 0 };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

  /* Player level: level n needs 100 + 50·(n−1) XP to clear. */
  const need = n => 100 + 50 * (n - 1);
  function levelInfo(xp) {
    let lv = 1, rest = xp; while (rest >= need(lv)) { rest -= need(lv); lv++; }
    return { level: lv, into: rest, need: need(lv) };
  }

  function addXP(n) {
    const before = levelInfo(S.xp).level; S.xp += n;
    if (S.daily.date !== today()) S.daily = { date: today(), xp: 0 };
    S.daily.xp += n;
    const after = levelInfo(S.xp).level; save();
    return { leveled: after > before, level: after };
  }

  function touchStreak() {
    const t = today();
    if (S.streak.last === t) return;
    S.streak.n = (S.streak.last && daysBetween(S.streak.last, t) === 1) ? S.streak.n + 1 : 1;
    S.streak.last = t; save();
  }
  /* A streak that was not extended yesterday or today shows as 0. */
  function liveStreak() { return (S.streak.last && daysBetween(S.streak.last, today()) <= 1) ? S.streak.n : 0; }

  function recordAnswer(skill, firstTry) {
    const k = S.skills[skill] || (S.skills[skill] = { seen: 0, miss: 0 });
    k.seen++; if (!firstTry) k.miss++;
    S.stats.answered++; if (firstTry) S.stats.firstTry++;
  }
  const mastery = skill => { const k = S.skills[skill]; return k && k.seen ? Math.max(0, 1 - k.miss / k.seen) : null; };

  function completeLevel(id, stars) {
    const cur = S.levels[id] || { stars: 0, plays: 0 };
    cur.stars = Math.max(cur.stars, stars); cur.plays++; S.levels[id] = cur; save();
  }

  function award(id) { if (S.badges[id]) return false; S.badges[id] = today(); save(); return true; }

  function reset() { S = fresh(); save(); }
  function exportJSON() { return JSON.stringify(S, null, 2); }
  function importJSON(text) { const o = JSON.parse(text); if (typeof o !== 'object' || o === null || typeof o.xp !== 'number') throw new Error('Not an AlgoForge save file'); S = Object.assign(fresh(), o); save(); }

  load();
  const api = { get: () => S, save, addXP, levelInfo, touchStreak, liveStreak, recordAnswer, mastery, completeLevel, award, reset, exportJSON, importJSON, today };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AFStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
