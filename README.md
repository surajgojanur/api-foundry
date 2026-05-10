# PricePulse

Track competitors automatically and get Telegram alerts when important changes happen.

## Product direction
PricePulse is built for shop owners and business users who need simple competitor monitoring and action suggestions.

- Core workflow: track competitors -> detect important change -> send Telegram alert -> take action
- Internal engine: API Foundry still powers feeds, schemas, and advanced APIs for developer use

## Core capabilities
- Next.js App Router + TypeScript + Tailwind
- Competitor tracking (including live Zepto/Blinkit paths)
- Change detection
- OpenAI-powered recommended actions with deterministic fallback
- Anakin integration with fallback mode
- Telegram alerts and alert history

## Setup
1. `npm install`
2. Create `.env.local` and set:

```env
ANAKIN_API_KEY=...
OPENAI_API_KEY=...
# or OPEN_AI=...
TELEGRAM_BOT_TOKEN=regenerated_token_here
TELEGRAM_CHAT_ID=8779239912
```

3. `npm run dev`

## Main pages
- Dashboard: `/`
- Competitors: `/projects/new`
- Live Tracking: `/live-tracking`
- Telegram Alerts: `/telegram`
- Compare: `/compare`
- Advanced APIs: `/api-docs`

## Telegram quick test
```bash
curl http://localhost:3000/api/telegram/health
curl -X POST http://localhost:3000/api/telegram/test
curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert
curl http://localhost:3000/api/v1/projects/zepto/alerts
```

## Smoke tests
- Core smoke: `npm run smoke`
- Live smoke: `npm run smoke:live`
- Project create smoke: `npm run smoke:create`
- Telegram smoke: `npm run smoke:telegram`
