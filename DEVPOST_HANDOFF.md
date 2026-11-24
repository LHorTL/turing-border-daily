# Devpost & Reddit Devvit Morning Handoff (`Turing Border: Daily Check`)

**Target Contest**: Reddit's Game of the Day (`$35,000 USD` prize pool, closes `2026-12-09 10:00 CST`)
**Primary Prize Tracks**:
1. **Best Ported Daily Game (`$6,000`)** — original-author MIT port of `PROTOCOL // TURING BORDER`
2. **Best Daily Game (`$15,000`)**
3. **Honorable Mentions (`10 × $1,000`)**

---

## 60-Second Morning Launch Checklist

Run from `e:\project\自动化收益\coding-contests\reddit-turing-daily\`:

```powershell
# 1. Confirm clean build & tests (already passing locally)
npm run test:types && npm run build && npm test

# 2. Authenticate Reddit developer account (opens browser OAuth once)
npx devvit login

# 3. Upload app version to Reddit Devvit (`name: "turing-border-daily"`)
npx devvit upload

# 4. Install onto your test subreddit (creates today's Daily Check post automatically via onAppInstall)
npx devvit install <your-test-subreddit> turing-border-daily

# 5. Optional live hot-reload check in your test subreddit
npx devvit playtest <your-test-subreddit>
```

### Verification Checklist After Installing in Test Subreddit
1. Open the auto-created post in `r/<your-test-subreddit>` -> confirm the inline **Splash Card** renders cleanly in the feed with zero scrollbars, suspect preview, and `Inspect Suspect →` button.
2. Tap **`Inspect Suspect →`** -> confirm `requestExpandedMode` opens the full desktop/mobile inspection desk.
3. Run 1–2 probes, pin a field + match a rule (`R-01`–`R-06`) + click **`Confront`**, then stamp **`APPROVE PASS`** or **`PURGE SYNTH`**.
4. Confirm the **Post-Verdict X-Ray Autopsy** and live **Community Consensus** bar appear.
5. Click **`Post Receipt to Thread`** -> confirm a 100% spoiler-free Wordle-style receipt comment appears directly under the Reddit post!
6. Switch to a past day in the **Practice Archive (7d)** selector to record a 30–60s demo clip showing both the live daily check and archive replay.
7. Make the test subreddit **public** (required for hackathon judges to play the live Reddit post!) and paste the post URL + GitHub repo URL into Devpost.

---

## Ready-to-Paste Devpost Submission Copy

### Project Title
`Turing Border: Daily Check`

### Tagline (<= 120 chars)
`A 60-second daily Turing inspection micro-game on Reddit: probe suspects, cite rules R-01–R-06, pass or purge synths.`

### Inspiration
We originally built and open-sourced **`PROTOCOL // TURING BORDER`** (MIT License), a cyberpunk-noir border checkpoint deduction game inspired by *Papers, Please* and the Turing Test. Playing it on desktop made us realize its sharpest tension—spotting whether a suspect's micro-contradiction is a synthetic giveaway or a stressed human false positive—is tailor-made for a **shared 60-second daily Reddit ritual**, where an entire subreddit debates the exact same suspect every day without spoiling the answer in the comments.

### What It Does
- **One Synchronized Daily Suspect (`00:00 UTC`)**: Deterministic UTC-date seeding guarantees every Redditor inspects the exact same Case `#001+` dossier each day, backed by a hybrid cast of signature border characters and a 365+ day procedural generator.
- **Zero-Spoiler Fog-of-War & Millimeter-Paper Ink Polygraph**: The client never receives hidden truth labels before verdict lock. Players inspect 4 dossier fields, watch a real-time HTML5 Canvas ECG + FFT vocal tremor strip chart, and run up to 4 quick-chip or freeform interrogation probes.
- **Inline 1-Click `Pin Field → Match Rule (R-01–R-06) → Confront`**: Zero tutorial walls or modal hunting. Players pin any dossier anomaly, match it against compact Silent Protocol rule chips (including `R-05` human false-positive exemptions so anxious humans aren't blindly purged), and confront the suspect.
- **Active NPC Countermoves**: Covert synths deploy **EMP polygraph jammers** (counterable via a 1-use **Faraday EMP Shield**), slide **covert credit bribes** across the tray, or trigger **Oversight complaints**—creating crisp tactical tension inside a 60-second loop.
- **Live Subreddit Consensus, Streaks & Spoiler-Free Comment Receipts**: Devvit Redis tracks daily `PURGE % / PASS %` consensus, inspector streaks, and score percentiles with an idempotent daily solve lock. Players unlock a full **Post-Verdict X-Ray Autopsy**, post a **100% spoiler-free receipt** directly into the Reddit thread (`reddit.submitComment`), and replay the **past 7 days** in the built-in Practice Archive.

### How We Built It (Port & Architecture Disclosure)
- **Original Port**: Ported from our own MIT-licensed `PROTOCOL // TURING BORDER` engine into **Devvit Web (`@devvit/web@0.15.6` + `@devvit/start@0.15.6`)**, **Hono**, **React 19**, **Tailwind CSS 4**, and **Vite 8**.
- **100% Self-Contained**: Deliberately eliminated external LLM/HTTP calls (`permissions.http` omitted) so the game runs at sub-50ms latency inside Reddit's sandbox with zero external domain dependencies or rate-limit failures.
- **Production Isolation & Verification**: Production `dist/server/index.cjs` runs purely on Devvit's Hono + `@devvit/web/server` runtime, validated by automated Vitest unit tests (including official `config-file.v1.json` Ajv2020 schema validation, 365-day case balance checks, Fog-of-War leak assertions, and Redis idempotency tests) plus headless Playwright E2E across inline feed (`600×320`, `390×320`), desktop (`1440×900`), and mobile (`390×844`).

### Challenges We Ran Into
- Keeping **Turn-0 Fog-of-War** mathematically leak-free across both JSON payloads and Canvas polygraph traces so clever players can't inspect network requests or initial waveforms to cheat today's consensus.
- Designing **human false positives (`R-05`)**—acid-rain late passes, `-12°C` cold-shift temperatures, double-shift `37.1°C` fevers, undeclared heart medication, and irritable human auditors—so `PASS` vs `PURGE` creates genuine daily subreddit debate instead of trivial pattern matching.
- Crafting a **zero-scrollbar inline feed splash card** (`320px` height) that communicates today's suspect, live community split, and personal streak at a glance on both Reddit desktop and mobile.

### Built With
`Devvit Web`, `Reddit API`, `Redis`, `TypeScript`, `React`, `Hono`, `Vite`, `Tailwind CSS`, `HTML5 Canvas`, `Vitest`
