# Performance Golf — Daily Performance & QA Dashboard

An interactive, single-page dashboard built from the **July 1, 2026** Aloware daily
performance & QA export for the Performance Golf sales floor.

**Live site:** _enable GitHub Pages (Settings → Pages → Deploy from branch → `main` / root), then the URL appears here._

## What's inside
- **KPI strip** — Dials, Connect Rate, Conversion, Decline Rate, Upsell Rate
- **Disposition breakdown** — toggle between all 1,453 dials and outcomes within the 214 connected calls
- **Agent scorecard** — sortable table with conversion pills and zero-close flags
- **Flagged & model calls** — filterable coaching cards linking straight to the Aloware recordings
- **Decline reasons & rebuttals** — expandable member-verbatim / rebuttal pairs
- **Action plan** — the day's coaching priorities

## Tech
Pure HTML/CSS/vanilla JS in a single `index.html` — no build step, no dependencies.
Open the file locally or serve it from any static host.

---
_Metrics are drawn directly from the Aloware export; coaching observations are grounded in the flagged transcripts._
