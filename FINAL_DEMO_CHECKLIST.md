# FINAL DEMO CHECKLIST

## Before demo
1. `npm run build`
2. `npm run dev`
3. `npm run smoke`
4. `npm run smoke:live`
5. `npm run smoke:create`
6. `npm run smoke:telegram`
7. Open `http://localhost:3000/live-tracking`
8. Send Telegram test alert:
   - `curl -X POST http://localhost:3000/api/telegram/test`
9. Open `http://localhost:3000/compare`
10. Open `http://localhost:3000/projects/zepto` or `http://localhost:3000/projects/live-zepto`

## Demo script highlights
1. Show Dashboard (`/`) and explain alert-first workflow.
2. Show Live Tracking (`/live-tracking`) for Zepto/Blinkit.
3. Run refresh-and-alert command and show Telegram message.
4. Open project page and alert history.
5. Open compare page and recommended actions.

## Fallback statement
If Anakin credits are insufficient, demo-stable fallback still shows the full alert flow and insights reliably.
