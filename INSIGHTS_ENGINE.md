# Insights Engine (Phase 6)

## What it does

API Foundry includes a deterministic AI-style insight engine that converts extracted competitor signals into:

- strategy labels
- aggressiveness/stability scores
- executive summaries
- actionable monitoring recommendations

## Why no external LLM is needed for MVP

For hackathon reliability, insight generation is rule-based and deterministic:

- predictable output
- no latency dependency on external model APIs
- fully reproducible during judging
- works in demo-stable mode

## Signals used

- price changes
- offer additions/updates
- availability changes
- announcements/content shifts
- selected data blocks
- severity distribution

## Scoring

### Aggressiveness score

Combines weighted event counts:

- high severity, medium severity, low severity
- price/offer/availability/announcement emphasis
- selected block coverage

Normalized to 0–100.

### Stability score

Starts at 100 and subtracts weighted change volatility.

Higher score means fewer severe disruptions.

### Monitoring priority

Comparison layer ranks competitors into:

- high
- medium
- low

Based on aggressiveness, severity mix, and top signals.

## Future upgrade path

- plug in LLM for narrative refinement
- add vector memory for historical context
- send Slack/email alerts
- scheduled scans
- persistent database and trend analytics
