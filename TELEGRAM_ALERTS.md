# Telegram Alerts in PricePulse

## What Telegram alerts do
PricePulse tracks competitor changes and sends simple Telegram alerts for important updates like price drops, offers, stock changes, and announcements.

## Required env vars
Add to `.env.local`:

```env
TELEGRAM_BOT_TOKEN=regenerated_token_here
TELEGRAM_CHAT_ID=8779239912
```

Do not hardcode tokens in code.

## How to get chat id
1. Create or open your bot with `@BotFather`.
2. Send `/start` to your bot from your Telegram account.
3. Call:

```bash
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

4. Find your chat ID in the response.
5. Put it in `TELEGRAM_CHAT_ID`.

## How to test
```bash
curl http://localhost:3000/api/telegram/health
curl -X POST http://localhost:3000/api/telegram/test
```

## Alert trigger endpoints
```bash
curl -X POST http://localhost:3000/api/v1/projects/zepto/alerts/send
curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert
curl http://localhost:3000/api/v1/projects/zepto/alerts
```

## Demo flow
1. Start app.
2. Check Telegram health.
3. Send Telegram test message.
4. Run refresh-and-alert on a tracked competitor.
5. Show Telegram message received.
6. Show alert history in dashboard/project page.

## Troubleshooting
- Bot token leaked: regenerate token in BotFather and update `.env.local`.
- Chat id missing: call `getUpdates` after sending `/start` to the bot.
- User did not send `/start`: bot cannot message user until `/start` is sent.
- Telegram not configured: `/api/telegram/health` returns `not-configured`.
- Alert endpoint returns failed delivery: check token/chat id and bot permissions, then retry.
