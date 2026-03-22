# Deploying JadeAssist on Railway

This guide walks you through deploying the **JadeAssist backend API** as a live service on [Railway](https://railway.app).

---

## ⚠️ Critical: set the Root Directory for each Railway service

JadeAssist is a **monorepo** with two separate Railway services.  Each service
**must** have its **Root Directory** set correctly in the Railway dashboard so
that it reads the right `railway.toml` and runs the right workspace.

| Railway service      | Root Directory     | Reads                              |
|----------------------|--------------------|------------------------------------|
| `@jadeassist/backend`| `packages/backend` | `packages/backend/railway.toml`    |
| `@jadeassist/widget` | `packages/widget`  | `packages/widget/railway.toml`     |

**Where to set it in Railway:**  
Service → **Settings** → **Source** → **Root Directory**

> If the widget service Root Directory is left blank (repo root `/`), it will
> read the root `railway.toml` which contains backend commands and will attempt
> to start `@jadeassist/backend`.  This causes an
> `❌ Invalid environment variables: OPENAI_API_KEY Required` crash in the
> widget service — even though the widget itself does not need `OPENAI_API_KEY`.

### Why the widget build/start commands run from the monorepo root

This repository uses **npm workspaces** with a single `package-lock.json` at
the repo root.  When Railway sets the widget service Root Directory to
`packages/widget`, Nixpacks runs all commands from inside that directory.
Running `npm ci` from `packages/widget` fails with `EUSAGE` because there is no
`package-lock.json` there.

`packages/widget/railway.toml` therefore prefixes every command with
`cd ../..` to move back to the repo root before running:

```
buildCommand = "cd ../.. && npm ci && npm run build --workspace=packages/widget"
startCommand = "cd ../.. && npm run start --workspace=packages/widget"
```

You **do not** need to override the build or start command in the Railway UI —
the committed `railway.toml` handles this automatically once the Root Directory
is set to `packages/widget`.

### Required environment variables per service

| Variable        | `@jadeassist/backend` | `@jadeassist/widget` |
|-----------------|-----------------------|----------------------|
| `OPENAI_API_KEY`| ✅ Required            | ❌ Do NOT set        |
| `JWT_SECRET`    | ✅ Required            | ❌ Do NOT set        |
| `MONGODB_URL`   | ✅ Required            | ❌ Do NOT set        |
| `LLM_MODEL`     | Recommended (`gpt-4o-mini`) | ❌ Do NOT set |
| `NODE_ENV`      | `production`          | *(not needed)*       |
| `CORS_ORIGIN`   | Recommended           | *(not needed)*       |

The widget service serves a **static JavaScript bundle** — it has no server-side
secrets and must not have `OPENAI_API_KEY` set.

---

## Overview

JadeAssist is a stateless HTTP API built with Node.js + Express + TypeScript.  
Once deployed, Railway will give you a public URL that EventFlow (or any other client) can call.

---

## Deployment modes

JadeAssist supports two operating modes to make Railway deployment as smooth as possible.

### Strict mode (default — recommended for production)

The server **requires** `MONGODB_URL`, `OPENAI_API_KEY`, and `JWT_SECRET` at startup.  
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
| `LLM_MODEL` | `gpt-4-turbo` | OpenAI model to use. **Recommended: set to `gpt-4o-mini`** — `gpt-4-turbo` may not be available on all API keys |
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
      "database (MONGODB_URL not set)",
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
    "message": "This endpoint requires MONGODB_URL, OPENAI_API_KEY, and JWT_SECRET. Configure the missing variables and set JADEASSIST_MINIMAL_MODE=false (or remove it) to enable full functionality.",
    "missingVars": ["MONGODB_URL", "OPENAI_API_KEY", "JWT_SECRET"]
  }
}
```

---

## Widget deployment on Railway

The JadeAssist widget (`@jadeassist/widget`) is a single-file JavaScript bundle
(`packages/widget/dist/jade-widget.js`) produced by Vite.  **Never deploy it
using the dev server** (`npm run dev` / `vite`) — that starts a hot-reload
development server on port 5173 which is not suitable for production.

### Why `npm run dev` is wrong in production

When Railway auto-detects the monorepo it may fall back to
`npm run dev --workspace=@jadeassist/widget`, which starts the Vite dev server.
The Vite dev server:

- Does **not** serve an optimised, bundled file.
- Listens on `localhost:5173` (not Railway's dynamic `PORT`).
- May not accept external connections at all.
- Prints `Local: http://localhost:5173/` in the logs — a clear sign it is running
  in dev mode.

The `railway.toml` committed to this repository prevents this by declaring the
correct build and start commands explicitly.

---

### Option A — Railway Static site (recommended)

A Static site is the simplest and most efficient way to serve the widget bundle.
Railway builds it once and serves the files from its edge CDN; no Node process
is needed.

#### Settings (Railway dashboard → widget service → Settings)

| Setting | Value |
|---|---|
| Service type | **Static** |
| Build command | `npm ci && npm run build --workspace=packages/widget` |
| Output directory | `packages/widget/dist` |
| Health check | *(not required for Static sites)* |

After deploying, Railway will expose `jade-widget.js` at the root of the
service domain, e.g.:

```
https://widget.up.railway.app/jade-widget.js
```

---

### Option B — Node static server

If you prefer a Node service (e.g. to keep a uniform service type or to add
custom headers), the widget package ships with a minimal production-safe static
server at `packages/widget/server.js`.

The server:
- Serves every file in `packages/widget/dist/` over HTTP.
- Listens on `process.env.PORT` (Railway sets this automatically).
- Responds `200 { "ok": true }` at `GET /healthz` for Railway health probes.
- Sends sensible `Cache-Control` headers (immutable for hashed assets, 1-hour
  max-age for `jade-widget.js`).
- Uses no third-party dependencies — only Node built-ins.

#### Railway service settings for Option B

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build --workspace=packages/widget` |
| Start command | `npm run start --workspace=packages/widget` |
| Health check path | `/healthz` |

Alternatively, set the service root directory to `packages/widget` and Railway
will pick up `packages/widget/railway.toml` automatically (no dashboard
overrides needed).

---

### How to embed the widget on your site

Whichever option you choose, the widget URL will be the public Railway domain
for that service with `/jade-widget.js` appended:

```html
<!-- Replace the src URL with your Railway widget service domain -->
<script src="https://<widget-service-domain>/jade-widget.js"></script>
<script>
  window.JadeWidget.init({
    apiBaseUrl: 'https://<backend-service-domain>',
    assistantName: 'Jade',
    primaryColor: '#8B5CF6',
  });
</script>
```

> The `apiBaseUrl` must be the **public** Railway URL of the backend service —
> never a `*.railway.internal` hostname, which is only reachable within Railway's
> private network.

---

### How to test after deploying the widget

1. **Fetch the bundle** — confirm it exists and is JavaScript:

   ```bash
   curl -I https://<widget-service-domain>/jade-widget.js
   # Expected: HTTP/2 200, Content-Type: application/javascript
   ```

2. **Inspect the first line** — it should be an IIFE, not YAML or HTML:

   ```bash
   curl -s https://<widget-service-domain>/jade-widget.js | head -c 20
   # Expected output starts with: (function(
   ```

3. **Health check** (Node server option only):

   ```bash
   curl https://<widget-service-domain>/healthz
   # Expected: {"ok":true}
   ```

4. **End-to-end widget test** in a browser:

   ```html
   <!DOCTYPE html>
   <html>
   <body>
   <script src="https://<widget-service-domain>/jade-widget.js"></script>
   <script>
     window.JadeWidget.init({
       apiBaseUrl: 'https://<backend-service-domain>',
     });
   </script>
   </body>
   </html>
   ```

   Open the page, click the chat bubble, and send a message.  
   In the browser Network panel you should see a successful `POST /api/widget/chat`.

---

### Required backend environment variables (summary)

The widget itself has no environment variables — it is a static file.  
The **backend** service that the widget talks to requires:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URL` | Yes | MongoDB connection string (`${{ MongoDB.MONGO_URL }}` on Railway) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `JWT_SECRET` | Yes | Long random secret for JWT signing |
| `CORS_ORIGIN` | Recommended | Comma-separated list of origins allowed to call the API, e.g. `https://event-flow.co.uk` |

> See [Environment variable reference](#environment-variable-reference) above for the full list.

---

### Multi-service Railway project summary

| Service | Type | Build command | Start / Output |
|---|---|---|---|
| `@jadeassist/backend` | Node | `npm ci && npm run build --workspace=packages/backend` | `npm run start --workspace=packages/backend` |
| `@jadeassist/widget` (Static) | Static | `npm ci && npm run build --workspace=packages/widget` | Output dir: `packages/widget/dist` |
| `@jadeassist/widget` (Node) | Node | `npm ci && npm run build --workspace=packages/widget` | `npm run start --workspace=packages/widget` |

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

