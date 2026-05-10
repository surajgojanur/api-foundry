# ANAKIN Setup Guide

## 1. Configure environment

Create `.env.local` in project root:

```bash
ANAKIN_API_KEY=your_anakin_api_key_here
```

## 2. Start app

```bash
npm run dev
```

## 3. Verify integration health

Fast check:

- `http://localhost:3000/api/anakin/health`

Live credential validation:

- `http://localhost:3000/api/anakin/health?validate=true`

## 4. Live mode vs fallback mode

- Live mode: key is configured and accepted by Anakin (`configured:true`, `valid:true`).
- Fallback mode: missing/invalid key or upstream issues; demo-stable extraction still works.

## 5. Troubleshooting

### Case 1: `configured:false`

Meaning: key is missing.

Fix:

1. Create `.env.local`
2. Add `ANAKIN_API_KEY=...`
3. Restart dev server

### Case 2: `configured:true` but `valid:false`

Meaning: key is loaded but Anakin rejected it.

Fix:

1. Open `https://anakin.io/account#developer`
2. Generate/copy an active API key
3. Ensure `.env.local` has no quotes/spaces
4. Restart `npm run dev`
5. Test `GET /api/anakin/health?validate=true`

### Case 3: Direct API says `unauthorized`

Meaning: the issue is key/account state, not app code.

Direct validation command:

```bash
export ANAKIN_API_KEY="$(grep '^ANAKIN_API_KEY=' .env.local | cut -d '=' -f2- | tr -d '\"' | tr -d "'" | xargs)"

curl -sS -X POST https://api.anakin.io/v1/map \
  -H "X-API-Key: $ANAKIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","includeSubdomains":false,"limit":1,"useBrowser":false}'
```

## 6. Security and reliability notes

- API Foundry never exposes full `ANAKIN_API_KEY` in API/UI.
- If validation/extraction fails, fallback mode keeps core flows working.
- Generated `/feed`, `/changes`, `/schema`, `/insights` APIs remain functional.
