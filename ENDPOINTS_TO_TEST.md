# PricePulse Endpoint Tests

## Core project endpoints
1. `GET /api/v1/projects`
2. `GET /api/v1/projects/zepto/feed`
3. `GET /api/v1/projects/zepto/changes`
4. `GET /api/v1/projects/zepto/schema`
5. `GET /api/v1/projects/zepto/insights`
6. `GET /api/v1/projects/zepto/ai-analysis`
7. `GET /api/v1/projects/zepto/tracking-status`
8. `POST /api/v1/projects/zepto/refresh`

## Telegram endpoints
9. `GET /api/telegram/health`
10. `POST /api/telegram/test`
11. `GET /api/v1/projects/zepto/alerts`
12. `POST /api/v1/projects/zepto/alerts/send`
13. `POST /api/v1/projects/zepto/refresh-and-alert`

## Live/Anakin endpoints
14. `GET /api/anakin/health`
15. `GET /api/anakin/health?validate=true`
16. `POST /api/live/setup`
17. `POST /api/live/refresh-all`
18. `GET /api/live/compare`

## OpenAI endpoints
19. `GET /api/openai/health`
20. `GET /api/openai/health?validate=true`
21. `GET /api/v1/compare/ai-analysis?projects=blinkit,zepto,bigbasket`

## Curl examples
```bash
curl http://localhost:3000/api/telegram/health
curl -X POST http://localhost:3000/api/telegram/test
curl -X POST http://localhost:3000/api/v1/projects/zepto/alerts/send
curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert
curl http://localhost:3000/api/v1/projects/zepto/alerts

curl http://localhost:3000/api/v1/projects/zepto/feed
curl http://localhost:3000/api/v1/projects/zepto/changes
curl http://localhost:3000/api/v1/projects/zepto/schema
curl http://localhost:3000/api/v1/projects/zepto/insights
curl http://localhost:3000/api/v1/projects/zepto/ai-analysis
curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh

curl http://localhost:3000/api/anakin/health
curl http://localhost:3000/api/openai/health
curl -X POST http://localhost:3000/api/live/setup
curl -X POST http://localhost:3000/api/live/refresh-all
curl http://localhost:3000/api/live/compare
```
