# NEXT_SESSION_PROMPT.md — start here

Paste-ready context for the next Claude Code session.

---

## 0. Orient (2 min)
- Working folder: **`D:\Claude\Projects\team anne`** (this is the dashboard git repo).
- Read `handoff/CURRENT_STATUS.md` first, then `ARCHITECTURE.md` and `SCRIPT_INVENTORY.md`.
- Memory is at `C:\Users\ADMIN\.claude\projects\D--Claude-Projects-team-anne\memory\` (auto-loaded).
- Shell is **Windows PowerShell 5.1**; a Bash tool is also available. `git` present; **no `gh` CLI**,
  **no python/node**. Use PowerShell for CSV work.

## 1. THINGS YOU MUST NOT FORGET
- 🔑 **Never write the GitHub token to disk.** It is session-only and the user pastes it each session.
  The one from last session may be revoked/expired — **ask the user for a current fine-grained PAT**
  (Contents R/W on `abazon-creator/performance-golf-qa-dashboard`) before any push. Verify with:
  `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GH_PAT" https://api.github.com/repos/abazon-creator/performance-golf-qa-dashboard` (expect 200).
- 🧩 **Do not remove the `/* __NEW_DAY__ */` marker** in `index.html` (line ~392, just after `const DATASET = {`).
  New days are inserted there; duplicate date keys break rendering (last key wins) — to *update* an existing
  day you must REPLACE its block, not add a second key.
- 📄 **The living Doc `1tXqKQoZ…` is STALE** — see task A below. Don't assume it's current.
- ⚙️ PowerShell: never name a function `Cat` (alias clash); use `@(...).Count` for null-safety.
- 📦 Raw weekly CSVs (74–126 MB) are unusable (10 MB connector cap). Only the filtered daily CSVs work.
- 🌐 The dashboard is a **public** repo (user-approved). Keep that in mind before adding sensitive data.

## 2. EXACT NEXT STEPS (in order)

### A. Finish the living Doc (highest priority — it's stale)
The dashboard is current but the Doc `1tXqKQoZ…` still shows OLD July 2 + July 1, no June 30.
Correct content sits in temp doc **`1szHibLptKP11ZBpBzAgABOMPKoEY_25PTFQUrAMb3Go`** (`_TEMP2`).
- **Preferred (reliable):** ask the user to do it — open _TEMP2 → Ctrl+A → Ctrl+C → open the living Doc
  → Ctrl+A → Ctrl+V. Verify via connector `read_file_content(1tXqKQoZ…)` (look for "June 30, 2026" and "18.5%").
- **Automation retry:** Chrome copy-paste failed twice last session (extension flaky). Only retry if the user
  confirms Chrome is open/focused/signed in; use `browser_batch` and **verify via `get_file_metadata` modifiedTime**
  (must be newer than `2026-07-02T23:58`) — the keystrokes can "succeed" without the paste landing.
- After it's confirmed, tell the user to trash `_TEMP` (`1JTue3B9…`) and `_TEMP2` (`1szHibLpt…`).

### B. Help the user install the always-on Apps Script (retires the `/loop` watcher)
Walk them through `automation/SETUP.md`: create Apps Script project → paste `automation/DailyInsights.gs`
→ add Script Property `GITHUB_TOKEN` → run **`testRun`** (expect the metrics in the log) → run
`installDailyTrigger`. Note the .gs is **untested** — if `testRun` errors, read the log and fix the .gs.

### C. Re-arm the `/loop` watcher if the user wants it running this session
Last session's cron (`4c3d66c8`) is dead once the app closed. To restart, run the watcher check on demand or
re-create it (see `scratchpad/watcher_runbook.md`). Once the Apps Script is live, retire it (`CronDelete`).

## 3. HOW TO RUN A MANUAL DAILY REBUILD (if a new/updated CSV appears)
1. List drop folder: `search_files parentId='1pUFsujkybGUiFfdNT14OXoMHNQei146o' mimeType='text/csv'`.
   A date not in `scratchpad/processed_dates.txt` (or an updated file) needs processing.
2. `download_file_content(fileId)` → it saves base64 to a tool-results `.txt` (too big to inline).
3. `PowerShell: & "<scratchpad>\Process.ps1" -B64Json "<that .txt path>" -Label "YYYY-MM-DD"`
   → writes `summary_YYYY-MM-DD.json` and prints the headline.
4. Read the summary JSON; build a `DATASET` entry (shape: heroTitle, lede, agents[{name,dials,conn,sold,dec}],
   upsellNum/upsellDen, dispoDials[], dispoConn[], headline{k,h,p}, glaring{k,h,p}, calls[], rebuttals[], actions[]).
   - NEW date → Edit `index.html`: replace `/* __NEW_DAY__ */` with the entry + the marker again.
   - UPDATED existing date → REPLACE that date's block (don't add a duplicate key).
5. `git add index.html && git commit && git push https://x-access-token:$GH_PAT@github.com/abazon-creator/performance-golf-qa-dashboard.git main`
6. Force Pages rebuild: `POST /repos/abazon-creator/performance-golf-qa-dashboard/pages/builds`;
   poll the live URL until the new date/number appears.
7. Doc: regenerate `living_v2.html` with all days → create a temp doc (connector, text/html) →
   paste into the living Doc (task A method).
8. Append the date to `scratchpad/processed_dates.txt`.

## 4. DEPENDENCIES
- Local: git, Windows PowerShell 5.1 (built-in). No gh/python/node.
- Connectors/tools: Google Drive connector (read/download ≤10 MB/create), GitHub via `curl`+PAT,
  Claude-in-Chrome (flaky — for the Doc paste only).
- Apps Script path: a Google account with folder read + Doc edit; Script Property `GITHUB_TOKEN`. No packages.

## 5. KNOWN ISSUES / RISKS (full list)
1. **Chrome Doc paste unreliable** — the extension connects then drops; paste can silently not land. Verify by modifiedTime.
2. **Token lifecycle** — PATs expire / were revoked mid-session. Always re-verify before pushing; never persist.
3. **Pages build hangs "building"** — mitigated by `.nojekyll`; force a rebuild via the builds API if stuck.
4. **Connector caps** — 10 MB download, ~1 MB read truncation, and occasional folder-enumeration index lag (retry).
5. **Duplicate date keys** in `DATASET` silently use the last one — always replace, never double-insert.
6. **Apps Script untested** — validate with `testRun` before enabling; watch for Docs-in-cell formatting quirks
   (Google's HTML import renders `<strong>`/`<em>` inside table cells as literal `*` — keep rich styling out of cells).
7. **`/loop` watcher is session-only** and 7-day-capped; it won't re-refresh an already-processed date.
8. **Two duplicate/temp Google Docs** await manual trashing (no delete tool).

## 6. KEY IDS (quick reference)
- Repo: `abazon-creator/performance-golf-qa-dashboard` · Live: https://abazon-creator.github.io/performance-golf-qa-dashboard/
- Living Doc: `1tXqKQoZFcij3xbJMS5rUw992rTsL6s6_F-z-YYxyojE`
- _TEMP2 (paste source): `1szHibLptKP11ZBpBzAgABOMPKoEY_25PTFQUrAMb3Go`
- Drop folder: `1pUFsujkybGUiFfdNT14OXoMHNQei146o`
- Roster sheet: `1ntDeRRIGL-w4BqGsbRW0vB-GqEzBK6D4_A9FPdDxAZA`
- `/loop` cron id: `4c3d66c8`
