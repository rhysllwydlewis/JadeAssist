# Deploying JadeAssist on Railway

This guide walks you through deploying the **JadeAssist backend API** as a live service on [Railway](https://railway.app).

---

## Overview

JadeAssist is a stateless HTTP API built with Node.js + Express + TypeScript.  
Once deployed, Railway will give you a public URL that EventFlow (or any other client) can call.

---

## Deployment modes

JadeAssist supports two operating modes to make Railway deployment as smooth as possible.

### Strict mode (default — recommended for production)

The server **requires** `DATABASE_URL`, `OPENAI_API_KEY`, and `JWT_SECRET` at startup.  
If any are missing the process exits with a clear error message.  
This is the safe default: misconfiguration is surfaced immediately rather than silently.

### Minimal mode (opt-in — for first-time Railway setup)

Activated by setting `JADEASSIST_MINIMAL_MODE=true`.

In minimal mode:
- The server **always starts** and binds to `PORT` so Railway health checks pass.
- `/healthz` returns `{ "ok": true, "minimalMode": true }`.
- `/health` returns status `"degraded"` (HTTP 200) and lists which checks were skipped.
- Feature routes (`/api/chat`, `/api/planning`, `/api/v1/assist`) return **HTTP 503** with a clear message explaining which variables are missing.
- A warning is printed to the log listing missing variables.

Use minimal mode during initial setup, then disable it once all secrets are configured.

---

## Recommended Railway setup sequence

Follow these steps for a smooth first deploy:

### Step 1 — Deploy with minimal mode enabled

In your Railway service **Variables** tab, set:

| Variable | Value |
|---|---|
| `JADEASSIST_MINIMAL_MODE` | `true` |
| `NODE_ENV` | `production` |

Deploy. The service should start and stay healthy (Railway health check passes).

### Step 2 — Add a PostgreSQL database

1. Inside your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. Railway automatically injects `DATABASE_URL` into your backend service.

### Step 3 — Set the remaining secrets

In your Railway service **Variables** tab, add:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (starts with `sk-…`) |
| `JWT_SECRET` | A long random string — generate one with `openssl rand -base64 48` |

### Step 4 — Disable minimal mode

Remove `JADEASSIST_MINIMAL_MODE` (or set it to `false`).  
Railway redeploys automatically. The service now runs in strict mode with all features enabled.

### Step 5 — Generate a public domain

1. Go to your Railway service → **Settings** → **Networking** → **Generate Domain**.
2. Copy the generated URL (e.g. `https://jadeassist-production.up.railway.app`).
3. That URL is your `JADEASSIST_URL` for EventFlow.

---

## Environment variable reference

### Required in strict mode (the production default)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full PostgreSQL connection string (auto-set when using Railway Postgres plugin) |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `JWT_SECRET` | A long random secret for JWT signing (32+ chars) |

### Always optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | auto-set by Railway | Railway injects this automatically — do not set manually |
| `NODE_ENV` | `development` | Set to `production` on Railway |
| `JADEASSIST_MINIMAL_MODE` | `false` | Set to `true` to start without DB / OpenAI / JWT |
| `LLM_MODEL` | `gpt-4-turbo` | OpenAI model to use |
| `LLM_TOKEN_LIMIT` | `4000` | Max tokens per LLM request |
| `AUTH_PROVIDER` | `jwt` | `jwt` \| `supabase` \| `eventflow` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s). `*` allows all. Use a comma-separated list to restrict, e.g. `https://event-flow.co.uk` |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `SUPABASE_URL` | — | Only required when `AUTH_PROVIDER=supabase` |
| `SUPABASE_ANON_KEY` | — | Only required when `AUTH_PROVIDER=supabase` |
| `EVENTFLOW_API_URL` | — | EventFlow base URL (optional, for callback integrations) |
| `EVENTFLOW_API_KEY` | — | EventFlow API key (optional) |
| `API_URL` | `http://localhost:3001` | Public base URL of this service |

---

## Health checks

Configure the Railway health check in **Settings → Health Check Path**: `/healthz`

### `/healthz` — lightweight probe (always up)

```json
{ "ok": true, "minimalMode": false }
```

In minimal mode:
```json
{ "ok": true, "minimalMode": true }
```

### `/health` — detailed check

In full (strict) mode returns `"healthy"` or `"unhealthy"` (HTTP 503 when unhealthy).

In minimal mode returns `"degraded"` (HTTP 200 always, so Railway does not restart the container):

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "minimalMode": true,
    "skippedChecks": [
      "database (DATABASE_URL not set)",
      "llm (OPENAI_API_KEY not set)"
    ],
    "services": { "database": "down", "llm": "down" },
    "uptime": 12.3,
    "version": "1.0.0",
    "timestamp": "2026-03-20T15:00:00.000Z"
  },
  "timestamp": "2026-03-20T15:00:00.000Z"
}
```

---

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Lightweight health probe (Railway) |
| `GET` | `/health` | Full health check (DB + LLM status) |
| `POST` | `/api/v1/assist` | Primary EventFlow integration endpoint |
| `POST` | `/api/chat` | Conversational chat (authenticated) |
| `POST` | `/api/planning/plans` | Create event plans (authenticated) |

### POST /api/v1/assist

The main endpoint for EventFlow to call.

**Request body:**
```json
{
  "event": "Plan a wedding for 80 guests in London",
  "context": {
    "userId": "user-123",
    "conversationId": "conv-abc",
    "eventType": "wedding",
    "budget": 20000,
    "guestCount": 80,
    "location": "London"
  },
  "idempotencyKey": "evt-xyz-001"
}
```

**Response:**
```json
{
  "result": "Here is a recommended plan for your London wedding...",
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "idempotencyKey": "evt-xyz-001",
    "conversationId": "conv-abc",
    "suggestions": ["Book venue 12 months in advance", "..."],
    "requiresMoreInfo": false
  }
}
```

**In minimal mode** (before secrets are configured) this returns:
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_NOT_CONFIGURED",
    "message": "This endpoint requires DATABASE_URL, OPENAI_API_KEY, and JWT_SECRET. Configure the missing variables and set JADEASSIST_MINIMAL_MODE=false (or remove it) to enable full functionality.",
    "missingVars": ["DATABASE_URL", "OPENAI_API_KEY", "JWT_SECRET"]
  }
}
```

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in env vars
cp .env.example .env

# 3. (Optional) start in minimal mode without secrets
#    JADEASSIST_MINIMAL_MODE=true npm run dev

# 4. Build TypeScript
npm run build

# 5. Start production server
npm start

# — OR — run in dev mode with hot-reload
npm run dev
```

---

## Notes

- Railway injects `PORT` automatically — JadeAssist reads it from `process.env.PORT`. No start command changes are needed.
- The service is stateless; all state lives in PostgreSQL.
- Graceful shutdown handles `SIGTERM` from Railway.
- Strict fail-fast (the default) means misconfiguration is caught at startup — not silently at request time.
