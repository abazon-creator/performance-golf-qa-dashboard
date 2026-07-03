# ARCHITECTURE.md

## The pipeline (end to end)
```
[Person exports daily] → Drive drop folder (1pUFsujk…)
   "Call Transcript - Team Anne - MM-DD-YYYY.csv"  (~3-5 MB, Team-Anne only)
        │
        ▼
[Detect new file]  compare filename date vs processed_dates.txt
        │
        ▼
[Download + decode]  connector download_file_content → base64 → saved to tool-results file
        │            → PowerShell ConvertFrom-Json + [Convert]::FromBase64String → .csv
        ▼
[Compute metrics]  Process.ps1 (Import-Csv, Type=='call' only) → summary_<date>.json
        │           team KPIs + per-agent scorecard + sold/declined rows + verbatim quotes
        ▼
     ┌──┴─────────────────────────────┐
     ▼                                ▼
[Dashboard]                       [Living Doc]
 build a DATASET entry             build a branded HTML day-section
 insert into index.html            → (manual/Chrome) paste into the Doc in place
 at /* __NEW_DAY__ */ marker        (Apps Script path edits it natively via DocumentApp)
 git commit + push
 force Pages rebuild
```

## The metric definitions (authoritative — used everywhere)
Applied to **`Type == 'call'` rows only** (exclude `sms`).
- **Dials** = count of call rows.
- **Not connected** = `Call Disposition` in { `A. Unreachable/VM`, `B. Busy tone`, `L. Ghost call`,
  `M. Invalid number`, blank }. (NOTE: only *B. Busy tone* is excluded — other `B.` dispositions
  = Already communicated, Trusted Advisor VM, PPSD — count as **connected**.)
- **Connected** = Dials − Not connected. **Connect rate** = Connected / Dials.
- **Sold** = disposition starts `D.`  **Conversion** = Sold / Connected. (Floor/target = 30%.)
- **Declined** = starts `F.`  **Decline rate** = Declined / Connected.
- **Upsell** = Sold rows whose disposition contains `Upsell` or `PG1+VIP`. **Upsell rate** = Upsell / Sold.
- Per agent: group by `User Name`, same formulas.

## CSV schema (columns used)
`Type` (call/sms), `Call Disposition` (the A./B./…/D./F. codes), `User Name` (agent),
`Duration` (HH:MM:SS), `Communication Link` (the aloware call URL), `Transcription Text`,
`Summary` (AI analysis), plus `Disposition Status`, sentiment, etc. Header row is row 0; match columns by name.

## Dashboard (index.html) design
- Single self-contained HTML file. Data lives in a JS object `DATASET`, keyed by ISO date
  (`"2026-07-02": { heroTitle, lede, agents[], upsellNum, upsellDen, dispoDials[], dispoConn[],
  headline{k,h,p}, glaring{k,h,p}, calls[], rebuttals[], actions[] }`).
- `AVAILABLE = Object.keys(DATASET).sort()`; default selected date = latest. Weekly/Monthly aggregate
  across dates in the ISO-week / calendar-month via `aggregate()`.
- **Insertion marker:** right after `const DATASET = {` there is a line `/* __NEW_DAY__ */`.
  Automation inserts `"<date>": {…},\n  /* __NEW_DAY__ */` there. **Never delete this marker.**
- Branding: Performance Orange `#FD3300`, dark orange `#DB2C00`, black `#1D1A1A`, warm grays
  (Stone/Pebble/Sand/Fog/Mist). Fonts: Space Grotesk (≈Repro), Fraunces (≈GT Super), Space Mono (≈Repro Mono)
  loaded from Google Fonts. `.nojekyll` disables Jekyll so the JS-heavy page serves as-is.

## Living Doc design
- One doc, **newest day on top**, each date an H2 (orange), sections H3 with an orange `▸`.
- Branded via inline styles (Google Docs HTML import only honors inline CSS): Playfair Display headings,
  Roboto body, Roboto Mono kickers, black-header scorecard table, Sand snapshot box.
- **Connector cannot edit an existing Doc in place** (create+read only). To keep the SAME URL we:
  create a temp source doc (formatted) via connector → Chrome copy-paste it into the living Doc.
  The Apps Script path avoids this entirely (DocumentApp edits in place).

## Auth & hosting
- GitHub pushes use a **fine-grained PAT** the user supplies each session (Contents R/W on the repo).
  **The token is session-only and must never be written to disk.** It was revoked+rotated once mid-session.
- Pages deploys automatically on push; sometimes hangs "building" — force with
  `POST /repos/abazon-creator/performance-golf-qa-dashboard/pages/builds`.
- No Google Drive webhook is available to the connector → detection is by polling, not push.
