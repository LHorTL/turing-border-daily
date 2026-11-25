# Turing Border: Daily Check

**A 60-second daily cyberpunk-noir Turing inspection micro-game built natively on Reddit Devvit Web (`@devvit/web@0.15.6`).**

- **Live Devvit App (`v0.0.1`)**: https://developers.reddit.com/apps/turing-border-daily
- **Public Demo Subreddit**: https://www.reddit.com/r/TuringBorderDaily/
- **Live Playable Daily Post**: https://www.reddit.com/r/TuringBorderDaily/comments/1y4x3kv/turing_border_daily_check_056_20261125_pass_or/

Every day at `00:00 UTC`, every Redditor faces the exact same border checkpoint suspect. Cross-reference their dossier against the **Silent Protocol Border Manual (`R-01`–`R-06`)**, watch the live millimeter-paper **ECG + FFT Ink Polygraph**, run up to **4 interrogation probes** while countering active **EMP polygraph jammers** and **covert bribes**, cite concrete rule violations or human exemptions (`R-05`), and stamp **`APPROVE PASS`** or **`PURGE SYNTH`** to compare your verdict against live subreddit consensus and post a **100% spoiler-free receipt** straight to the Reddit thread.

---

## Original IP Port Disclosure (MIT License)

`Turing Border: Daily Check` is an original-author port of our open-source MIT-licensed web deduction game **`PROTOCOL // TURING BORDER`** (`coding-contests/modelscope-ai-game`), completely re-engineered for Reddit's daily feed format:

- **60-Second Daily Format**: Condensed from a multi-visitor campaign into a single synchronized UTC daily case (`Case #001+`) shared by the whole subreddit, plus a **7-day Practice Archive** for instant replay.
- **100% Self-Contained (Zero External APIs)**: Replaced external LLM dependencies with a deterministic UTC-seeded hybrid case generator (signature border cast + 365+ procedural cases) and a multi-turn episodic-memory English NPC interrogation engine with deterministic rule-guard countermoves. Zero `permissions.http` domains required.
- **Native Reddit Devvit Integration**: Inline feed splash card (`splash.html`, zero scrollbars, live PASS/PURGE consensus bar, personal streak, 1-tap `requestExpandedMode`), Devvit Redis daily consensus & percentile leaderboard, idempotent daily solve lock, automated daily cron post (`0 0 * * *`), moderator menu post creator, and 1-click spoiler-free thread comment posting via `reddit.submitComment` (`runAs: 'USER'`).

---

## Gameplay Loop (`R-01`–`R-06` Silent Protocol)

| Rule | Short Label | What Inspectors Check |
| :--- | :--- | :--- |
| **`R-01`** | Line 4 Ban | Old-City Metro Line 4 flooded in 2041. Claiming recent Line 4 trains exposes an outdated synth model. |
| **`R-02`** | Pass Limit | Permanent / multi-year passes (`2099`, 4-year) are banned; max single permit duration is 12 months. |
| **`R-03`** | Bio / Voice | Living human vocal jitter is `0.80%–4.20%` and 60s surface temp drifts; `0.000°C` flatlock exposes PID control. |
| **`R-04`** | Motion / Cry | Sprinting cannot yield `<=15 br/min` resting breath & `<=35.5°C` skin; exact `4.00 Hz` sine sobs are modulated audio. |
| **`R-05`** | Human Grace | Acid-rain 24h expiry grace, `-12°C` cold-shift chill (`36.0°C` + live drift), fatigue `37.1°C` fever, burn inflammation, and hidden chronic meds are **legal human false positives** — do not purge! |
| **`R-06`** | Blue Pendulum | Human witnesses openly report blue-glow `Blue Pendulum` relays; covert operatives contradict themselves or leak `433 MHz` tuning jargon. |

---

## Architecture

```text
reddit-turing-daily/
├── devvit.json                   # Official Devvit schema v1 (name: "turing-border-daily")
├── package.json                  # Node >=22.12.0, @devvit/web 0.15.6, Hono, React 19, Vite 8
├── vite.config.ts                # @devvit/start/vite multi-entrypoint + CJS server bundler
├── src/
│   ├── shared/
│   │   ├── types.ts              # Strict Fog-of-War PublicCase vs XRayAutopsy contract
│   │   └── rules.ts              # Silent Protocol Border Manual (R-01 ~ R-06)
│   ├── server/
│   │   ├── index.ts              # Production Devvit Hono entrypoint (ZERO dev mocks)
│   │   ├── core/
│   │   │   ├── caseGenerator.ts  # Deterministic UTC-seeded daily & procedural case engine
│   │   │   ├── interrogation.ts  # Episodic memory NPC + EMP/Bribe/Escalation rule guard
│   │   │   ├── store.ts          # Devvit Redis & Reddit runtime adapter (undefined-safe)
│   │   │   └── post.ts           # Custom daily post creator
│   │   └── routes/
│   │       ├── api.ts            # /api/splash, /daily, /probe, /confront, /countermove, /verdict, /share-comment
│   │       ├── menu.ts           # /internal/menu/post-create
│   │       ├── triggers.ts       # /internal/triggers/on-app-install
│   │       └── scheduler.ts      # /internal/cron/daily-post (0 0 * * *)
│   └── client/
│       ├── splash.html / .tsx    # Inline Reddit feed card (compact, zero scrollbars)
│       ├── game.html / .tsx      # Expanded daily inspection desk & Practice Archive
│       └── components/
│           ├── InkPolygraph.tsx  # Canvas millimeter-paper ECG + FFT waveform trace
│           └── PassportPortrait.tsx # Deterministic clinical SVG passport portrait
├── scripts/
│   └── preview-local.mjs         # Isolated local preview server (in-memory Redis + mock Reddit)
└── tests/
    ├── devvitConfig.test.ts      # Official config-file.v1.json Ajv2020 + bundle & UI guardrails
    ├── engine.test.ts            # Determinism, 365-day balance, Fog-of-War, countermoves, receipt
    └── api.test.ts               # Cold-start Redis, idempotent daily lock, archive isolation
```

---

## Local Development, Testing & Verification

Requires **Node.js `>=22.12.0`**.

```bash
# 1. Install dependencies
npm install

# 2. Type-check client, server, shared, and vite configs
npm run test:types

# 3. Build production Devvit bundles (dist/client/* and dist/server/index.cjs)
npm run build

# 4. Run full automated test suite (Ajv schema v1, determinism, Fog-of-War, API idempotency)
npm test

# 5. Launch isolated local standalone preview (in-memory Redis + mock Reddit comments)
npm run preview:local
# -> Inline splash card: http://127.0.0.1:4173/splash.html
# -> Expanded game desk: http://127.0.0.1:4173/game.html
```

---

## Deploying to Reddit Devvit

```bash
npx devvit login
npx devvit upload
npx devvit install <your-test-subreddit> turing-border-daily
```

See [DEVPOST_HANDOFF.md](./DEVPOST_HANDOFF.md) for the exact 60-second submission checklist and ready-to-paste Devpost copy.

---

## License

MIT License.
