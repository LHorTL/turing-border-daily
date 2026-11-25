# Devpost & Reddit Devvit Handoff (`Turing Border: Daily Check` · `v0.0.2`)

**Target Contest**: Reddit's Game of the Day (`$35,000 USD` prize pool, closes `2026-12-09 10:00 CST`)
**Primary Prize Tracks**:
1. **Best Ported Daily Game (`$6,000`)** — original-author MIT port of [`PROTOCOL // TURING BORDER`](https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol)
2. **Best Daily Game (`$15,000`)**
3. **Honorable Mentions (`10 × $1,000`)**

**Live Production Links**:
- **Devpost Project**: https://devpost.com/software/turing-border-daily-check
- **Live Devvit App (`v0.0.2`)**: https://developers.reddit.com/apps/turing-border-daily
- **Public Subreddit**: https://www.reddit.com/r/TuringBorderDaily/
- **Live Playable Daily Post**: https://www.reddit.com/r/TuringBorderDaily/comments/1y4x3kv/turing_border_daily_check_056_20261125_pass_or/
- **GitHub Repository**: https://github.com/LHorTL/turing-border-daily
- **Original MIT Source Repository**: https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol ([MIT LICENSE](https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol/file/view/master/LICENSE))

---

## Build, Verification & Deployment Commands

Run from `e:\project\自动化收益\coding-contests\reddit-turing-daily\`:

```powershell
# 1. Confirm clean type-check, build, and 16/16 Vitest unit tests
npm run test:types && npm run build && npm test

# 2. Authenticate Reddit developer account (opens browser OAuth once)
npx devvit login

# 3. Upload app version v0.0.2 to Reddit Devvit (`name: "turing-border-daily"`)
npx devvit upload --bump patch -v

# 4. Install onto public subreddit r/TuringBorderDaily
npx devvit install r/TuringBorderDaily turing-border-daily
```

### Verification Checklist After Installing in `r/TuringBorderDaily`
1. Open the post in `r/TuringBorderDaily` -> confirm the inline **Splash Card** renders cleanly with zero scrollbars (`600×320` & `390×320`), suspect preview, live Redis verdict count (`N inspectors ruled today` or `Be today's first inspector`), and `Inspect Suspect →` button.
2. Tap **`Inspect Suspect →`** -> confirm `requestExpandedMode` opens the full desktop/mobile inspection desk.
3. Run 2–4 probes, pin a dossier field + match a rule (`R-01`–`R-06` or `R-05` human exemption) + click **`Confront`**, then stamp **`APPROVE PASS`** or **`PURGE SYNTH`**.
4. Confirm **Investigation-First Scoring** (`Grade S` `90–100` for investigated + rule-cited solves; `<= 68` `Grade C` cap on 0-probe blind guesses; `<= 35` `Grade D`/`F` on wrong verdicts), **Post-Verdict X-Ray Autopsy**, and honest community ranking (`First Inspector Today` when `n <= 1`, real Redis score-bucket percentile when `n >= 2`).
5. Click **`Post Receipt to Thread`** -> confirm a 100% spoiler-free Wordle-style receipt comment appears directly under the Reddit post.
6. Switch to a past day in the **Practice Archive (7d)** selector -> confirm archive solves display **`Practice Archive — Unranked`** (`percentile: null`, never printing fake `Top N%`) and isolate daily streak/community counts.

---

## Ready-to-Paste Devpost Submission Copy

### Project Title
`Turing Border: Daily Check`

### Tagline (<= 120 chars)
`A 60-second daily Turing inspection micro-game on Reddit: probe suspects, cite rules R-01–R-06, pass or purge synths.`

### Inspiration
We originally built and open-sourced **`PROTOCOL // TURING BORDER`** (MIT License, https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol), a cyberpunk-noir border checkpoint deduction game inspired by *Papers, Please* and the Turing Test. Playing it on desktop made us realize its sharpest tension—spotting whether a suspect's micro-contradiction is a synthetic giveaway or a stressed human false positive—is tailor-made for a **shared 60-second daily Reddit ritual**, where an entire subreddit debates the exact same suspect every day without spoiling the answer in the comments.

### What It Does
- **One Synchronized Daily Suspect (`00:00 UTC`)**: Deterministic UTC-date seeding guarantees every Redditor inspects the exact same Case `#001+` dossier each day, backed by 6 signature border characters interleaved with a 365+ day procedural generator.
- **Live Inline Feed Splash Card**: Displays today's suspect dossier preview, live Redis verdict counter (`N inspectors ruled today` with `tabular-nums`, or `Be today's first inspector`), live `PURGE % / PASS %` consensus bar, personal streak, and 1-tap `requestExpandedMode` launch with zero scrollbars at `600×320` and `390×320`.
- **Zero-Spoiler Fog-of-War & Millimeter-Paper Ink Polygraph**: The client never receives hidden truth labels before verdict lock. Players inspect 4 dossier fields, watch a real-time HTML5 Canvas ECG + FFT vocal tremor strip chart, and run up to 4 quick-chip or freeform interrogation probes.
- **Inline 1-Click `Pin Field → Match Rule (R-01–R-06) → Confront`**: Zero tutorial walls or modal hunting. Players pin any dossier anomaly, match it against compact Silent Protocol rule chips (including `R-05` human false-positive exemptions so anxious humans aren't blindly purged), and confront the suspect.
- **Investigation-First Scoring & Active Countermoves**: Covert synths deploy **EMP polygraph jammers** (counterable via a 1-use **Faraday EMP Shield**), slide **covert credit bribes**, or file **Oversight complaints**. Thorough probing + verified `R-01`–`R-06` citations earn **Grade `S` (`90–100`)**, while 0-probe blind guesses are strictly capped at **`<= 68` (Grade `C`)** and wrong verdicts stay **`<= 35` (Grade `D`/`F`)**.
- **Honest Subreddit Consensus, Streaks & Spoiler-Free Comment Receipts**: Devvit Redis tracks live `PURGE % / PASS %` consensus, inspector streaks, and real score-bucket percentiles (`First Inspector Today` when `total <= 1`; real bucket ranks when `total >= 2`) with an idempotent daily solve lock. Players unlock a full **Post-Verdict X-Ray Autopsy**, post a **100% spoiler-free receipt** straight into the Reddit thread (`reddit.submitComment`), and replay the **past 7 days** in the unranked **Practice Archive** (`Practice Archive — Unranked`, `percentile: null`).

### How We Built It (Original Port Provenance & Architecture)
- **Transparent Original-Author MIT Port**: Ported by the original author from our MIT-licensed [`PROTOCOL // TURING BORDER`](https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol) repository ([root MIT LICENSE](https://www.modelscope.cn/studios/yangyunxi/turing-border-protocol/file/view/master/LICENSE); initial release `346fd42` on `2026-11-23` -> `v2.0` `a625324` -> `v2.1` `b6aaf33` -> Reddit Devvit Web rewrite `d1c5dea` on `2026-11-25` -> `v0.0.1` live deploy `614c3a7` -> `v0.0.2` audit polish) into **Devvit Web (`@devvit/web@0.15.6` + `@devvit/start@0.15.6`)**, **Hono**, **React 19**, **Tailwind CSS 4**, and **Vite 8**.
- **100% Self-Contained**: Deliberately eliminated external LLM/HTTP calls (`permissions.http` omitted) so the game runs at sub-50ms latency inside Reddit's sandbox with zero external domain dependencies or rate-limit failures.
- **Production Isolation & Verification**: Production `dist/server/index.cjs` runs purely on Devvit's Hono + `@devvit/web/server` runtime, verified by **16 automated Vitest unit tests across 3 suites** (`5` in `devvitConfig.test.ts` including official `config-file.v1.json` Ajv2020 validation & `AI_SLOP_HITS=0` UI guardrails, `7` in `engine.test.ts` covering 365-day balance, Fog-of-War redaction, 60-day blind-guess cap vs Grade `S` invariants, and spoiler-free receipts, plus `4` in `api.test.ts` testing cold-start Redis, idempotency, unranked archive isolation, and real multi-user Redis percentiles) alongside headless Playwright E2E verification across inline feed (`600×320`, `390×320`), desktop (`1440×900`), and mobile (`390×844`).

### Challenges We Ran Into
- Keeping **Turn-0 Fog-of-War** mathematically leak-free across both JSON payloads and Canvas polygraph traces so clever players can't inspect network requests or initial waveforms to cheat today's consensus.
- Balancing **investigation-first scoring** so 0-probe lucky blind guesses (`<= 68`, Grade `C`) can never outscore genuine multi-probe + rule-cited deduction (`90–100`, Grade `S`), across both covert synth (`R-01`–`R-04`/`R-06`) and anxious human (`R-05`) cases.
- Ensuring **100% honest ranking semantics** on cold-start daily threads (`First Inspector Today`) and isolated replays (`Practice Archive — Unranked`) without ever fabricating synthetic percentiles.
- Crafting a **zero-scrollbar inline feed splash card** (`320px` height) that prominently surfaces today's live verdict count (`N inspectors ruled today`), community split, and personal streak on both Reddit desktop and mobile.

### Built With
`Devvit Web`, `Reddit API`, `Redis`, `TypeScript`, `React`, `Hono`, `Vite`, `Tailwind CSS`, `HTML5 Canvas`, `Vitest`
