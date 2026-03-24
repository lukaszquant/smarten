# SmartEn

Interactive practice platform for the English language competition (Konkurs Języka Angielskiego) for primary school students in Mazowieckie voivodeship, Poland.

Live at **https://smarten.pages.dev**

## Features

- **Competition tests** — 7 years of past papers (2019–2026), all three stages (szkolny, rejonowy, wojewódzki), solvable online with auto-scoring
- **Practice exercises** — 90 exercises across 9 task types:
  - Wiedza o krajach (knowledge questions with A/B/C/D)
  - Literowanie (word spelling)
  - Słowotwórstwo (word formation)
  - Uzupełnianie luk (open cloze)
  - Prawda / Fałsz / NI (true/false/no information)
  - Wybór A/B/C (multiple choice grammar)
  - Luki w zdaniach (gap fill with sentences)
  - Dialogi (idioms & expressions)
  - Dopasowywanie (matching)
- **Per-user accounts** with independent progress tracking
- **Performance dashboard** on home page — overall average, strongest/weakest task type
- **Per-type metrics** — completion rate, average best score, progress bars
- **Retry** — redo any exercise without leaving the page
- **Server-side results** — all answers saved to Cloudflare KV, viewable via API

## Tech stack

- React 19 + Vite + React Router 7
- Cloudflare Pages (hosting + serverless functions)
- Cloudflare KV (results storage)
- No backend framework — just a single Pages Function at `/api/results`

## Project structure

```
site/                    # React app
  src/
    pages/
      Home.jsx           # Landing page with dashboard
      Practice.jsx       # Practice list, type list, exercise views
      KonkursTest.jsx    # Competition test page with timer
      Progress.jsx       # Detailed progress history
    components/
      konkursy/          # Task renderers (one per task type)
      Layout.jsx         # Nav with user switcher
    lib/
      scoring.js         # Auto-scoring logic
  functions/
    api/results.js       # Cloudflare Pages Function for KV storage
  wrangler.toml          # Cloudflare config with KV binding

pub/                     # Static data (copied to site/public/)
  konkursy/angielski/data/
    tests.json           # Competition test index
    2019-2020/ .. 2025-2026/  # Competition test JSON files
    practice/
      index.json         # Practice exercise index
      knowledge_001..010.json
      spelling_001..010.json
      formation_001..010.json
      cloze_001..010.json
      tfni_001..010.json
      mc_001..010.json
      gapfill_001..010.json
      dialogue_001..010.json
      matching_001..010.json
```

## Development

```bash
cd site
npm install
npm run dev
```

## Deploy

```bash
cd site
npm run build
wrangler pages deploy dist --project-name smarten
```

## API

Results are stored in Cloudflare KV and accessible via:

```
GET  /api/results           # all users' results
GET  /api/results?user=Name # single user's results
POST /api/results           # save a result (JSON body with user, testId, score, etc.)
```
