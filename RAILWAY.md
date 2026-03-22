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

### Step 2 — Add a MongoDB database

1. Inside your Railway project, click **+ New** → **Database** → **MongoDB**.
2. Once the MongoDB service is ready, click **Connect** on the MongoDB service card.
3. In the **Private Network** tab, copy the variable reference shown:
   `${{ MongoDB.MONGO_URL }}`
4. In your **`@jadeassist/backend`** service → **Variables** tab, create a new variable:
   - **Name**: `MONGODB_URL`
   - **Value**: `${{ MongoDB.MONGO_URL }}`
5. Railway automatically resolves the reference at runtime — no connection string to copy manually.

> **No schema migration needed.** MongoDB creates collections automatically on first use.
> Sample suppliers are seeded into the database the first time the backend starts.

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
| `MONGODB_URL` | MongoDB connection string. On Railway, set this to `${{ MongoDB.MONGO_URL }}` (private network). |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `JWT_SECRET` | A long random secret for JWT signing (32+ chars) |

> **Legacy alias:** `DATABASE_URL` is also accepted if you have it already set. `MONGODB_URL` takes precedence when both are present.

### Always optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | auto-set by Railway | Railway injects this automatically — do not set manually |
| `NODE_ENV` | `development` | Set to `production` on Railway |
| `JADEASSIST_MINIMAL_MODE` | `false` | Set to `true` to start without DB / OpenAI / JWT |
| `LLM_MODEL` | `gpt-4-turbo` | OpenAI model to use |
| `LLM_TOKEN_LIMIT` | `4000` | Max tokens per LLM request |
| `AUTH_PROVIDER` | `jwt` | `jwt` \| `eventflow` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s). `*` allows all. Use a comma-separated list to restrict, e.g. `https://event-flow.co.uk` |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `EVENTFLOW_API_URL` | — | EventFlow base URL (optional, for callback integrations) |
| `EVENTFLOW_API_KEY` | — | EventFlow API key (optional) |
| `API_URL` | `http://localhost:3001` | Public base URL of this service |

---

## Configuring CORS for EventFlow

When JadeAssist runs as a standalone Railway service and the EventFlow website
(`event-flow.co.uk`) embeds the widget, the JadeAssist backend must explicitly
allow cross-origin requests from EventFlow's domain.

### Recommended production setting

In your Railway service **Variables** tab, set:

| Variable | Value |
|---|---|
| `CORS_ORIGIN` | `https://event-flow.co.uk,https://www.event-flow.co.uk` |

This tells the backend to:

- Accept fetch/XHR requests from `https://event-flow.co.uk` and `https://www.event-flow.co.uk`.
- Return `Access-Control-Allow-Credentials: true` (automatically enabled when specific origins are listed).
- Handle `OPTIONS` preflight requests automatically (the `cors` package manages this).

> **Note:** Do **not** use `*` together with credentials — the browser will reject such responses.
> The backend already handles this correctly: `credentials` is only set to `true` when a specific
> origin list is provided.

### Development / staging

For local development, the default `CORS_ORIGIN=*` allows all origins (including `localhost`).
For a staging environment you can add extra origins to the comma-separated list, e.g.:

```
CORS_ORIGIN=https://event-flow.co.uk,https://www.event-flow.co.uk,https://staging.event-flow.co.uk,http://localhost:3000
```

### How EventFlow should configure the widget

Add the following snippet to every public page on EventFlow (replace the `apiBaseUrl` value with
the Railway-generated domain for your JadeAssist backend service):

```html
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@main/packages/widget/dist/jade-widget.js"></script>
<script>
  window.JadeWidget.init({
    apiBaseUrl: 'https://jadeassistbackend-production.up.railway.app',
    assistantName: 'Jade',
    primaryColor: '#8B5CF6',
  });
</script>
```

> The `apiBaseUrl` must be the **public** Railway URL for the backend service — never a
> `*.railway.internal` hostname, as that is only reachable within the Railway private network.

### Rate limiting

The backend applies a global rate limit (see `RATE_LIMITS.DEFAULT` in
`packages/backend/src/utils/constants.ts`).  Each visitor's IP address is counted
independently, so normal EventFlow traffic is unlikely to be affected.  If you experience
unexpected 429 responses from high-traffic pages, consider raising the limit via a
dedicated environment variable (not currently configurable without a code change — open an
issue if needed).

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
| `POST` | `/api/widget/chat` | Embedded widget endpoint (no auth required) |
| `POST` | `/api/chat` | Conversational chat (JWT authenticated) |
| `POST` | `/api/planning/plans` | Create event plans (authenticated) |

### POST /api/widget/chat

The endpoint used by the embedded JadeAssist widget on public sites (e.g. event-flow.co.uk).
No JWT token is required — anonymous visitors can chat without logging in.
A stricter per-IP rate limiter (10 requests/minute) is applied as abuse protection.

**Request body:**
```json
{
  "message": "Help me plan a birthday party for 50 guests",
  "conversationId": "optional-session-id",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "message": {
      "id": "uuid",
      "content": "Here are my suggestions for your birthday party...",
      "role": "assistant",
      "createdAt": "2024-01-01T12:00:00Z"
    },
    "suggestions": ["What is your budget?", "Which city?"]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**In minimal mode** (before secrets are configured) this returns `503` — same as the other feature routes.

> **Note:** Use this endpoint for the widget bundle embedded on EventFlow pages.
> Use `/api/chat` only for authenticated (JWT) server-side or admin integrations.

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
- The service is stateless; all state lives in MongoDB.
- Graceful shutdown handles `SIGTERM` from Railway.
- Strict fail-fast (the default) means misconfiguration is caught at startup — not silently at request time.

---

## Production setup

### No schema migration required

JadeAssist uses **MongoDB** — collections are created automatically on first write.
The sample supplier data is seeded into the database the first time the backend starts up,
so there is nothing you need to run manually to initialise the database.

After adding the MongoDB service and setting `MONGODB_URL` (see Step 2 above), simply
deploy or restart the `@jadeassist/backend` service. On first boot it will:
1. Connect to MongoDB via `MONGODB_URL`.
2. Seed the suppliers collection if it is empty.
3. Serve all API endpoints normally.

### Verify the database is connected

Hit the health endpoint:

```bash
curl https://<your-backend-domain>/health
```

You should see `"status": "healthy"` with `services.database: "up"`.

### Trust proxy (already applied in code)

Railway routes traffic through a proxy that sets the `X-Forwarded-For` header.
The backend calls `app.set('trust proxy', 1)` at startup so that
`express-rate-limit` reads the correct client IP.  **No manual configuration is
needed** — this is included in the deployed code and eliminates the
`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` warning from the logs.

