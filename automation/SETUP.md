# Always-on automation — Google Apps Script setup

This runs entirely in Google's cloud (no laptop needed, no 7-day cap). Each morning it
reads the day's filtered Team-Anne CSV from Drive, computes the metrics, appends a
formatted day into the **living Doc in place**, and updates the **dashboard** on GitHub.

**Narrative:** templated / rule-based (free, no API key).
**Trigger:** daily 6:00 AM America/New_York (by then the prior evening's export is in the folder).

## What you need
- A fine-grained **GitHub token** with **Contents: Read/write** on `abazon-creator/performance-golf-qa-dashboard`
  (create at https://github.com/settings/personal-access-tokens/new — one repo, longest expiry).
- The Google account you use must be able to: read the drop folder and **edit** the living Doc (both already yours).

## One-time setup (~5 min)
1. Go to **https://script.google.com** → **New project**. Rename it "Team Anne Daily Insights".
2. Delete the default `Code.gs` contents and paste in all of **`automation/DailyInsights.gs`** (from this repo).
3. **⚙ Project Settings → Script Properties → Add script property:**
   - Name: `GITHUB_TOKEN`  ·  Value: *(your fine-grained PAT)*  → Save.
4. **Validate first (no writes):** top toolbar function dropdown → select **`testRun`** → **Run**.
   - Approve the permission prompts (Drive read, Docs edit, external requests to api.github.com).
   - Open **Execution log** — you should see the computed metrics for the latest file. `testRun` writes nothing and changes no state.
5. **Schedule it:** select **`installDailyTrigger`** → **Run**. That creates the daily 6 AM ET trigger.
   *(Or set it by hand: ⏰ Triggers → Add Trigger → function `main`, Time-driven, Day timer, 6am–7am.)*

Done. Every morning `main` processes any new `Call Transcript - Team Anne - MM-DD-YYYY.csv`.

## Good to know
- **State:** processed dates live in Script Property `processedDates` (seeded with `2026-07-01,2026-07-02`).
  To re-process a day, remove its date from that property.
- **Backfill / manual run:** select `main` → Run to process immediately instead of waiting for 6 AM.
- **Where the money is:** $0 — Apps Script + templated narrative, within free quotas.
- **Doc formatting:** newest day is inserted above the most recent date header (kept in place, same URL),
  with orange date heading and a black-header scorecard table. If you later want richer prose, switch the
  narrative engine to the Anthropic API (add `ANTHROPIC_KEY` and a `UrlFetchApp` call) — ask and I'll wire it.
- **Turn off:** Triggers (⏰) → delete the `main` trigger. The session-only `/loop` watcher we set up earlier is
  independent — you can retire it once this is running.
- **Marker:** the dashboard update relies on the `/* __NEW_DAY__ */` comment in `index.html`. Don't remove it.

## How it maps to the manual pipeline
| Manual step (today)                    | Apps Script equivalent            |
|----------------------------------------|-----------------------------------|
| Find new CSV in drop folder            | `listNewFiles_` (DriveApp)        |
| Download + decode                      | `file.getBlob().getDataAsString`  |
| Compute metrics + scorecard            | `analyze_` (same disposition rules) |
| Append day into the Doc in place       | `appendDocSection_` (DocumentApp) |
| Add day to dashboard + deploy          | `updateDashboard_` (GitHub API) → Pages |
