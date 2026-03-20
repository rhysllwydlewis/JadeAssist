# Deploying JadeAssist on Railway

This guide walks you through deploying the **JadeAssist backend API** as a live service on [Railway](https://railway.app).

---

## Overview

JadeAssist is a stateless HTTP API built with Node.js + Express + TypeScript.  
Once deployed, Railway will give you a public URL that EventFlow (or any other client) can call.

---

## Prerequisites

- A [Railway](https://railway.app) account
- A PostgreSQL database (Railway Postgres add-on, or Supabase)
- An OpenAI API key

---

## Quick Deploy

### 1. Create a new Railway project

1. Log in to Railway → **New Project** → **Deploy from GitHub repo**.
2. Connect this repository (`rhysllwydlewis/JadeAssist`).
3. Railway auto-detects Node.js. Confirm the build and start commands:
   - **Build command:** `npm run build`
   - **Start command:** `npm start`

### 2. Provision a PostgreSQL database (optional)

If you are not using Supabase:
1. Inside your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. After it provisions, copy the `DATABASE_URL` from the "Connect" tab.

### 3. Set environment variables

In your Railway service **Variables** tab set **at minimum**:

| Variable | Required | Description |
|---|---|---|
| `PORT` | auto-set by Railway | Railway injects this automatically |
| `NODE_ENV` | ✅ | `production` |
| `DATABASE_URL` | ✅ | Full PostgreSQL connection string |
| `OPENAI_API_KEY` | ✅ | Your OpenAI API key |
| `JWT_SECRET` | ✅ | A long random string for JWT signing |

#### Optional variables

| Variable | Default | Description |
|---|---|---|
| `LLM_MODEL` | `gpt-4-turbo` | OpenAI model to use |
| `LLM_TOKEN_LIMIT` | `4000` | Max tokens per LLM request |
| `AUTH_PROVIDER` | `jwt` | `jwt` \| `supabase` \| `eventflow` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s). `*` allows all. Use a comma-separated list to restrict, e.g. `https://event-flow.co.uk` |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `SUPABASE_URL` | — | Only required when `AUTH_PROVIDER=supabase` |
| `SUPABASE_ANON_KEY` | — | Only required when `AUTH_PROVIDER=supabase` |
| `EVENTFLOW_API_URL` | — | EventFlow base URL (optional, for callback integrations) |
| `EVENTFLOW_API_KEY` | — | EventFlow API key (optional) |

### 4. Generate a public domain

1. Go to your Railway service → **Settings** → **Networking** → **Generate Domain**.
2. Copy the generated URL (e.g. `https://jadeassist-production.up.railway.app`).
3. That URL is your `JADEASSIST_URL` for EventFlow.

---

## Health checks

Railway uses `/healthz` to determine if the service is healthy.

Configure it in **Settings → Health Check Path**: `/healthz`

It returns:
```json
{ "ok": true }
```

A more detailed health check (includes database and LLM status) is available at `/health`.

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

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in env vars
cp .env.example .env

# 3. Build TypeScript
npm run build

# 4. Start production server
npm start

# — OR — run in dev mode with hot-reload
npm run dev
```

---

## Notes

- Railway injects `PORT` automatically — JadeAssist reads it from `process.env.PORT`.
- The service is stateless; all state lives in PostgreSQL.
- Graceful shutdown handles `SIGTERM` from Railway.
