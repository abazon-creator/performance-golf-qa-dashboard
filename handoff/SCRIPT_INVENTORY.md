# SCRIPT_INVENTORY.md

## In the git repo (`D:\Claude\Projects\team anne`, pushed to GitHub)
| File | Size | What it does |
|---|---|---|
| `index.html` | ~54 KB | The entire dashboard. `DATASET` (date-keyed data) + render/aggregate/filter JS + inline CSS. Contains the `/* __NEW_DAY__ */` insertion marker. |
| `README.md` | ~1 KB | Repo intro. |
| `.nojekyll` | 0 B | Tells GitHub Pages to skip Jekyll (which hung on the JS-heavy page). |
| `automation/DailyInsights.gs` | ~20 KB | **Google Apps Script** (always-on path). See "plain-English logic" below. |
| `automation/SETUP.md` | ~3 KB | Click-by-click to install the Apps Script (create project, paste code, set `GITHUB_TOKEN` Script Property, run `testRun` then `installDailyTrigger`). |

## In the scratchpad (session-only, NOT in git)
Path: `C:\Users\ADMIN\AppData\Local\Temp\claude\D--Claude-Projects-team-anne\0d8270ca-dfe5-46f9-a166-f409b0196165\scratchpad\`
| File | What it does |
|---|---|
| `Process.ps1` | The PowerShell analyzer used for the *manual* runs. Decodes a base64-JSON download → CSV, computes metrics/scorecard/sold/declined + verbatim quotes, writes `summary_<date>.json`, prints a one-line headline. |
| `watcher_runbook.md` | The step-by-step the `/loop` cron follows each fire. |
| `processed_dates.txt` | State: dates already published (`2026-06-30/07-01/07-02`). |
| `summary_2026-06-30.json`, `summary_2026-07-02.json` | Computed outputs for those days (metrics, agents, sold/declined rows). |
| `living_v2.html` | The full branded 3-day Doc HTML (June 30 + refreshed July 2 + July 1) — source for the temp doc _TEMP2. |
| `living_doc.html`, `living_doc_branded.html`, `report_0702.html` | Earlier Doc HTML builds (superseded, kept for reference). |
| `ta_*.csv`, `*_b64.txt` | Decoded CSVs and base64 blobs (large, transient). |

---

## `automation/DailyInsights.gs` — logic in plain English
**Entry points:**
- `main()` → the daily-trigger target. Runs the full pipeline for any un-processed file.
- `testRun()` → **validation only.** Force-processes the *latest* CSV, logs the metrics, **writes nothing**
  and changes no state. Run this first to confirm the compute path.
- `installDailyTrigger()` → run once to schedule `main` daily at 6:00 AM `America/New_York`.

**What `main()` does, step by step:**
1. `listNewFiles_` — scan the drop folder (DriveApp) for files named `Call Transcript - Team Anne - MM-DD-YYYY.csv`
   whose date isn't in the `processedDates` Script Property (seeded `2026-07-01,2026-07-02`).
2. For each new file: read it (`getBlob().getDataAsString`), parse with `Utilities.parseCsv`.
3. `analyze_` — filter to `Type=='call'`, bucket each `Call Disposition` (`bucket_`), compute team KPIs,
   per-agent scorecard, pick flagged (longest declined, distinct agents) + model (longest sold) calls,
   build decline-reason rebuttals (with a best-effort verbatim from `extractQuote_`), and assemble a
   dashboard day-object identical in shape to the `DATASET` entries.
4. `appendDocSection_` — insert the day into the living Doc **in place** via `DocumentApp`, above the most
   recent H2 date header (newest-first). Orange date heading, black-header scorecard table.
5. `updateDashboard_` — GitHub Contents API: GET `index.html` (content+sha), replace the `/* __NEW_DAY__ */`
   marker with the new day's JSON entry, PUT it back. Pages auto-deploys.
6. `markProcessed_` — append the date to the `processedDates` Script Property.

**Templated narrative** (no LLM): headline/glaring/actions/rebuttals are generated from the numbers and a
`REBUTTALS` reason→response map. Less nuanced than hand-written prose; verbatim quotes are best-effort.

**Inputs:** the drop-folder CSV; Script Property `GITHUB_TOKEN` (Contents R/W).
**Outputs:** an appended Doc section + a new `DATASET` entry committed to the repo (→ live site).
**Dependencies:** none external — pure Apps Script (DriveApp, DocumentApp, UrlFetchApp, Utilities,
PropertiesService, ScriptApp). Requires a Google account with access to the folder + edit on the Doc.
**⚠ Untested:** could not be executed from Claude Code — MUST be validated with `testRun` before enabling.

---

## `scratchpad/Process.ps1` — logic in plain English
`param($B64Json, $Label)` — takes the path of a downloaded base64-JSON file and an ISO date label.
1. Reads the JSON, base64-decodes `.content` to a `.csv` in the scratchpad.
2. `Import-Csv` → keep `Type -eq 'call'`.
3. `Get-Bucket` classifies each `Call Disposition` (same rules as the .gs / metric defs).
4. Aggregates team totals + per-agent (uses `@(... ).Count` to avoid PowerShell's null-count bug).
5. Sorts sold/declined rows by duration; extracts a member verbatim from `Transcription Text` (`QuoteFrom`).
6. Writes `summary_<Label>.json` and prints a one-line headline.
**Inputs:** the base64-JSON download file. **Outputs:** `summary_<date>.json` + console headline.
**Dependencies:** Windows PowerShell 5.1 (built in). No external modules.
**⚠ Gotcha:** never name a PS function `Cat` — it collides with the `cat`/Get-Content alias (bit us once).
