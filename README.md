# Nihongo Daily

A local-first, single-user PWA for daily Japanese practice — built for one
person who opens it every day on a phone, aiming at travel-usable Japanese
around JLPT N4–N3.

One button starts an ~18-minute session of five blocks:

1. **Kana drill** — 20 items, weighted toward visually confusable pairs
   (さ/ち, ぬ/め, わ/な, る/ろ, れ/ね, シ/ツ, ン/ソ, ク/ワ). Characters
   graduate out of rotation at >90% accuracy over 20+ reps.
2. **Vocab SRS** — SM-2-lite spaced repetition over travel-focused N5/N4
   vocabulary, every card with an example sentence and TTS.
3. **Listening** — TTS plays a sentence; pick the meaning; replay and 0.75×
   slow toggle.
4. **Speaking** — speak the answer to an English prompt; speech recognition
   plus fuzzy Japanese matching. Never blocks progress.
5. **Reading** — a short graded passage with furigana toggle, tap-for-gloss,
   and one comprehension question.

Everything is stored in IndexedDB on the device. No accounts, no backend,
no telemetry, fully offline after the first load.

## Commands

```bash
npm install            # install dependencies
npm run dev            # local dev server
npm run build          # typecheck + production build to dist/
npm test               # unit tests (srs, match, streak, kana)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run validate-content   # zod-validate all content JSON (runs in CI)
npm run icons          # regenerate PWA icons into public/icons/
```

## Deploying

### GitHub Pages (primary)

`.github/workflows/deploy.yml` builds and publishes on every push to
`main` or the development branch.

**One-time setup, which must be done by the repo owner:**
**Settings → Pages → Build and deployment → Source: GitHub Actions.**

This step cannot be automated — the workflow's `GITHUB_TOKEN` is not
permitted to turn Pages on, so `configure-pages` fails with "Get Pages
site failed" until the switch is flipped by hand. After that, the next
push deploys and the live URL is `https://<owner>.github.io/<repo>/`.
You can also deploy on demand from the Actions tab ("Deploy to GitHub
Pages" → Run workflow).

If the deploy job is then rejected with an environment protection error,
the `github-pages` environment is restricted to the default branch:
either merge the branch into `main`, or add the branch under
Settings → Environments → github-pages → Deployment branches.

Two Pages-specific details the workflow handles for you:

- Pages serves from a subpath, so the build runs with
  `BASE_PATH=/<repo>/`. Vite's `base`, the router's `basename`, and the
  manifest's `start_url`/`scope` all follow that variable, so nothing is
  hard-coded.
- Pages has no rewrite rules, so the workflow copies `index.html` to
  `404.html`. That is what makes deep links like `/settings` load the app
  instead of a GitHub 404 page.

### Vercel

Either connect the GitHub repo to Vercel (it picks up `vercel.json`:
SPA rewrite, immutable `/assets/*` cache, `no-cache` on `sw.js` /
`index.html`), or deploy from the CLI:

```bash
npm run build
npx vercel --prod
```

### Netlify

`netlify.toml` carries the same redirect and header rules:

```bash
npm run build
npx netlify deploy --prod --dir dist
```

After deploying, verify on a real phone: install to the home screen, turn on
airplane mode, and complete a full session — everything should work and
progress should persist after reopening.

## Adding content

Content lives in `src/data/*.json` and is validated by zod schemas in
`src/data/schema.ts`. To add vocabulary, append entries to
`src/data/vocab.json`:

```json
{
  "id": "v311",              // unique, keep the v-number sequence
  "kanji": "水",             // written form (repeat the kana if none)
  "kana": "みず",
  "romaji": "mizu",
  "meaning": "water",
  "jlpt": "N5",              // N5 | N4 | N3
  "themes": ["food"],        // transport, food, lodging, shopping,
                              // directions, emergency, smalltalk,
                              // time-numbers, signs
  "exampleJa": "水をください。",
  "exampleKana": "みずをください。",
  "exampleEn": "Water, please."
}
```

Then run `npm run validate-content`. The validator fails the build on any
malformed entry, wrong theme, or duplicate id — so a typo can't silently
ship. Grammar, dialogues, and readings follow the same pattern; see their
schemas in `src/data/schema.ts` for the exact shape.

New vocab automatically joins the SRS as `new` cards (introduced at the
daily new-card cap, default 10/day, adjustable in Settings).

## Backup

Settings → Export progress writes a JSON file with all cards, kana stats,
sessions, favorites, and settings. Import restores it exactly — use this
when switching phones.

## Browser notes

- **Speech recognition** (the speaking block's mic) is Chrome/Edge-only on
  desktop and unreliable or unavailable on iOS Safari. The block detects
  this and falls back to "say it aloud, then compare with the model answer".
- **Speech synthesis** (TTS) works almost everywhere; the voice picker in
  Settings lists your device's Japanese voices. On-device Japanese voices
  must be installed for offline audio.
- Everything else — kana, vocab, reading, phrasebook, progress — works in
  any modern browser, fully offline after the first visit.
