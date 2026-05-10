# Change Detection (Phase 5)

## Snapshot model

Each project keeps:

- `previousSnapshot`
- `currentSnapshot`

A snapshot stores extracted feed items by block (`products`, `offers`, `availability`, etc.) plus source URLs and capture time.

## Comparison logic

Refresh flow compares `previousSnapshot` and `currentSnapshot` using stable entity keys:

- key format: `${blockType}:${normalizedName}`
- normalization lowers case, trims spaces, removes noisy currency symbols

## Supported event types

- `price_changed`
- `offer_added`
- `availability_changed`
- `item_added`
- `item_removed`
- `announcement_added`
- `content_changed`

## Severity rules

- **High**:
  - price changes >= 10%
  - availability shifts to out-of-stock/unavailable
  - impactful announcements (launch, expansion, delivery, shutdown, etc.)
  - aggressive offer language (mega/flash/limited/20%+)
- **Medium**:
  - new offers, item additions, recovery availability changes
- **Low**:
  - text-only offer edits, low-impact removals

## Refresh flow

1. Use current snapshot as previous snapshot.
2. Discover/scrape new pages (Anakin live path or fallback).
3. Normalize new pages into a new current snapshot.
4. Detect structured changes.
5. Update project status, lastUpdated, insights, and change timeline.

## Why fallback mode exists

Fallback mode guarantees demo reliability when:

- API key is missing
- Anakin times out/fails
- scraped content is weak

This keeps project creation/refresh and API endpoints functional for hackathon demos.

## Future production upgrade

- persistent database storage for snapshots/history
- scheduled refresh workers
- webhook/event-driven refresh
- alerting channels (email/Slack)
- audit logs and tenant-level controls
