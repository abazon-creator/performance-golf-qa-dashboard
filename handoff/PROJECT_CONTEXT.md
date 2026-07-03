# PROJECT_CONTEXT.md — Team Anne Daily Performance & QA

## What this project is
An automated daily reporting pipeline for **Performance Golf's "Team Anne"** phone-sales team.
Every day a person exports a filtered call-transcript CSV to Google Drive; from it we produce:
1. An **interactive web dashboard** (GitHub Pages) — KPIs, disposition charts, sortable agent
   scorecard, flagged/model calls, decline rebuttals, action plan, with date + Daily/Weekly/Monthly filters.
2. A **living Google Doc** — "Team Anne — Daily Performance Summary", newest day on top, one
   branded section per date.

The user is **Anne Cheryl Bazon** (`abazon@performancegolfzone.com`), the team lead.

## Working folder (local)
`D:\Claude\Projects\team anne`  — this IS the git repo for the dashboard.
- Scratchpad (session-only, NOT in git): `C:\Users\ADMIN\AppData\Local\Temp\claude\D--Claude-Projects-team-anne\0d8270ca-dfe5-46f9-a166-f409b0196165\scratchpad`
- Memory: `C:\Users\ADMIN\.claude\projects\D--Claude-Projects-team-anne\memory\` (MEMORY.md + 2 notes)

## Live artifacts
| Artifact | ID / URL |
|---|---|
| Dashboard repo | `abazon-creator/performance-golf-qa-dashboard` (GitHub, **public**) |
| Live site | https://abazon-creator.github.io/performance-golf-qa-dashboard/ |
| Living Doc | `1tXqKQoZFcij3xbJMS5rUw992rTsL6s6_F-z-YYxyojE` |
| Drive drop folder (filtered CSVs land here) | `1pUFsujkybGUiFfdNT14OXoMHNQei146o` |
| Raw weekly transcript folder → `June 2026` subfolder | `1vIKylo4U0jFDhiNN06cEFVdRH9jCKCyv` → `1x7YB0rszBCbQb3KA-ema8oECcpu4n4wr` |
| Roster sheet (all agents; Team Anne = the 12 below) | `1ntDeRRIGL-w4BqGsbRW0vB-GqEzBK6D4_A9FPdDxAZA` |

## Team Anne roster (the `User Name` values that appear in the CSV)
Rubilyn Estrada · Christian Buceron · Sitti Besas · Kenneth Semira · Laurice Pentinio ·
Jemar Namora · Romuel Sabile · Andrea Isabel Balon · Audrey Bañares (a.k.a. "Audrey Banares") ·
Chelei Bago · Jesica Jumao-as · Prince Wendell De Luna. Lead: Anne Cheryl Bazon.

## Data source reality (important)
- The **raw weekly** transcript CSVs (`Aloware - Blackfish 2 - Call Transcript - WBxxxx.csv`) are
  **74–126 MB** — TOO BIG for the Drive connector (10 MB download cap; read truncates ~1 MB). Do not try to use them directly.
- The usable input is the **Team-Anne-filtered daily CSV** a person drops in the drop folder,
  named `Call Transcript - Team Anne - MM-DD-YYYY.csv` (~3–5 MB, under the cap).
- A daily Aloware export is configured for ~6 PM EST (see the "Call Transcript Sends" sheet in the raw folder).

## Two automation paths (both exist)
1. **Session `/loop` watcher** (running now, this session only): cron job `4c3d66c8`, `*/30 * * * *`,
   polls the drop folder and runs the pipeline on any new dated CSV. Dies when the app closes; 7-day expiry.
2. **Always-on Google Apps Script** (built, NOT yet installed by user): `automation/DailyInsights.gs`,
   templated narrative, daily 6 AM ET, edits the Doc natively + updates the dashboard via GitHub API.
   This is the durable replacement for the `/loop` watcher.

See ARCHITECTURE.md for the full pipeline, CURRENT_STATUS.md for what's done/pending.
