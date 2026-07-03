# CURRENT_STATUS.md

_Last updated: 2026-07-03 (end of session). Date reference for "today" = 2026-07-03._

## ✅ Done and verified
- **Dashboard is LIVE and current** at https://abazon-creator.github.io/performance-golf-qa-dashboard/
  with **three days**: June 30, July 1, July 2 (refreshed). Verified live (`2026-06-30` present, `18.5%` present).
- Latest commit pushed: **`e3ad89e`** "Add Team Anne June 30; refresh July 2 from re-exported CSV".
- Dashboard rebranded to Performance Golf theme; date picker + Daily/Weekly/Monthly filters work.
- Apps Script automation written + pushed (`automation/DailyInsights.gs` + `SETUP.md`).
- `.nojekyll` added (Pages was hanging on Jekyll).
- `/loop` watcher armed (cron `4c3d66c8`, every 30 min) — last fire returned "no new file".
- GitHub token **refreshed** mid-session (old one was revoked → 401; new one verified `push:true`).
- Memory written (3 files) so a fresh session can recover context.

## ⏳ Pending / not finished
1. **THE LIVING DOC IS STALE — top priority.** `1tXqKQoZ…` still shows OLD July 2 (1,173 / 17.7% / Prince 200)
   and July 1, with **NO June 30**. Confirmed via modifiedTime `2026-07-02T23:58` (unchanged).
   The correct content (June 30 + refreshed July 2 + July 1, branded) is ready in temp doc
   **`1szHibLptKP11ZBpBzAgABOMPKoEY_25PTFQUrAMb3Go`** ("_TEMP2 Team Anne source").
   → **Fix:** open _TEMP2 → Ctrl+A → Ctrl+C → open living Doc → Ctrl+A → Ctrl+V. (Manual is reliable;
   Chrome automation of the paste failed twice this session — see Known Issues.)
2. **Trash duplicate/temp Google Docs** (no delete tool available, user must do it):
   `1JTue3B9…` (_TEMP stub, truncated — ignore it), `1szHibLpt…` (_TEMP2, keep until doc pasted then trash),
   and older superseded dupes `1IPyovUl…`, `1sU6Z-O4…`, `1GhXfsLA…`.
3. **Apps Script not installed by user yet.** Needs: create project, paste `DailyInsights.gs`, add Script
   Property `GITHUB_TOKEN`, run `testRun` (validate), then `installDailyTrigger`. See automation/SETUP.md.
4. **Longer-lived token.** The token in use may still be short-dated; user should mint a fine-grained token
   scoped to the one repo with the longest expiry for the always-on Apps Script.

## Current metrics on the dashboard (source of truth)
| Date | Dials | Conn (rate) | Sold (conv) | Decline | Upsell | Glaring |
|---|---|---|---|---|---|---|
| 2026-06-30 | 1,329 | 271 (20.4%) | 31 (11.4%) | 8.1% | 58.1% (18/31) | Chelei Bago 175/0; Christian 35 conn/1 close/7 dec |
| 2026-07-01 | 1,453 | 214 (14.7%) | 27 (12.6%) | 11.2% | 55.6% (15/27) | Prince Wendell 202/19/0 |
| 2026-07-02 (refreshed) | 1,190 | 195 (16.4%) | 36 (18.5%) | 6.7% | 50.0% (18/36) | Prince Wendell 205/13/0 |

Note: July 2 was re-exported mid-session (file grew 3.82→3.99 MB); dashboard was refreshed to the new numbers.
The Doc still holds the OLD July 2 until the paste in item 1 is done.

## Watcher state
`processed_dates.txt` = `2026-06-30, 2026-07-01, 2026-07-02`. Any NEW dated CSV triggers a run.
The `/loop` watcher will NOT re-process an already-listed date even if its file is updated (that's a manual re-run).
