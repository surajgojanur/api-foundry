# LIVE_TRACKING

## What live tracking means in this MVP

Live tracking means API Foundry can create and refresh real competitor projects on demand, detect snapshot changes, and expose stable APIs for feed, changes, insights, AI analysis, and tracking status.

## Target websites

- https://www.zepto.com/
- https://blinkit.com/

## Setup flow

1. `npm run dev`
2. `curl -X POST http://localhost:3000/api/live/setup`
3. `npm run smoke:live`

## Fast Setup vs Deep Refresh

- Fast setup target: finish in about 15-25 seconds (demo-safe), not minutes.
- `/api/live/setup` does not perform deep scraping. It performs quick live Anakin URL discovery when available.
- Setup uses fallback-enriched snapshots so generated APIs are immediately usable even when live discovery is slow.
- Successful live discovery marks setup as `mixed` with `liveSource=anakin`.
- `/api/live/refresh-all` is where deeper re-check attempts happen, with strict time bounds to avoid hangs.
- In production, snapshots should be persisted and refreshed with scheduled/background jobs.

## Tracking modes

- `live`: Anakin discovery/scraping produced usable extraction directly.
- `mixed`: Some live extraction worked, but fallback enrichment was used for stability.
- `fallback`: Live extraction was unavailable/weak, so deterministic demo-stable extraction is used.

## Why extraction can be weak on some sites

- JavaScript-heavy rendering
- location-gated content and session walls
- dynamic listings requiring browser/state context

## What still works in all modes

- generated APIs (`/feed`, `/changes`, `/schema`)
- `/tracking-status`
- change events and summaries
- deterministic insights and optional AI analysis
- live compare endpoint

## Future production upgrades

- persistent database
- scheduled refresh workers
- webhook triggers
- location-specific scraping profiles
- alerting (Slack/email)
