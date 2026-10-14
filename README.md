# AlgoForge

Learn data structures and algorithms by **playing**. A static web app (HTML, CSS, vanilla JS) with no build step and no dependencies.

## What it is

- **18 levels in 5 chapters + 5 boss fights.** Foundations → Search & Order → Trees & Graphs → Optimization → Advanced Toolkit. Each level has a short lesson, then 4-8 games.
- **Nine game types.** Pattern recognition from a story (spot the signal phrases, pick the technique), algorithm builder (order the steps), bug hunt, Big-O reading, binary-search duel, BFS/DFS tap-the-order, two-pointer steering, structure tracing (heaps, sorts, stacks, trees), DP and counting.
- **Never ends.** 20 procedural generators produce fresh puzzles at rising difficulty tiers for the **Endless Arena**, chapter bosses and **Smart Practice** (which weights your weakest skills).
- **Progression.** XP, player levels and ranks, stars, hearts, daily streak, daily goal, badges, per-skill mastery, a Codex reference, light/dark theme, export/import of progress.

## Run it

```bash
npm start            # serves http://localhost:8080  (any static server works)
npm test             # 158k fuzz checks of the generators + curriculum validation
npm run test:e2e     # optional: needs `npm i -D playwright`; plays the whole game headless
```

Opening `index.html` directly from disk also works.

## Deploy

Static hosting only: GitHub Pages, Netlify, Vercel, Cloudflare Pages. The included workflow (`.github/workflows/pages.yml`) runs the tests and deploys to GitHub Pages on every push to `main` (enable *Settings → Pages → Source: GitHub Actions*).

## Add content

Everything lives in `js/content.js`. Add a level to a chapter:

```js
{ id: 'my-level', title: 'My Level', icon: '🧪', skill: 'dp', blurb: 'One line.',
  lesson: [{ h: 'Idea', p: 'Plain explanation with `code` and **bold**.' }],
  items: [
    mcq('Question?', ['a', 'b', 'c', 'd'], 1, 'Why b is right.'),
    sc('Story with [[signal phrase]] and ((noise)).', ['A', 'B', 'C', 'D'], 0, 'Why A.', [1, 'Why B is tempting but wrong.']),
    order('Algorithm name', ['step 1', 'step 2', 'step 3', 'step 4']),
    bug('Title', 'Describe symptom.', ['line 1', 'line 2'], 1, 'Why line 2 is the bug.'),
    ...gen('freq', 2)            // fresh random puzzles from js/gen.js
  ] }
```

Run `npm test` after editing: it checks answer indexes, duplicate options, missing explanations and codex links. New generators go in `js/gen.js` (return `{t:'mcq', q, o, a, why}`); add a brute-force cross-check to `tests/gen.test.js`.

## Structure

```
index.html          app shell
css/styles.css      design system (dark/light, responsive)
js/gen.js           pure puzzle generators (also run in Node tests)
js/content.js       curriculum: chapters, lessons, items, codex, badges
js/store.js         progress, XP, streak, mastery (localStorage)
js/games.js         interactive challenge engines
js/main.js          router, views, play session runner
js/fx.js            sound, confetti, toasts
tests/              generator fuzz tests, content validation, e2e bot
```

## Limits (honest)

- Progress is per-browser (localStorage). There are no accounts or leaderboards, because there is no backend.
- Challenges teach **recognition, tracing and reasoning**; you do not type code. Pair it with real coding practice.
- Authored content is finite (18 levels); the Arena and generators are what make it endless.
