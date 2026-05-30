# Railway service routing

JadeAssist is designed to run as two separate Railway services:

| Service | Root directory | Purpose | Public routes |
|---|---|---|---|
| `@jadeassist/backend` | `packages/backend` | Express API and OpenAI-backed assistant | `/api/widget/chat`, `/api/chat`, `/api/v1/assist`, `/healthz` |
| `@jadeassist/widget` | `.` repo root | Static widget bundle hosting | `/jade-widget.js`, `/healthz` |

## Confirmed failure mode

If the EventFlow widget calls:

```text
https://jadeassistbackend-production.up.railway.app/api/widget/chat
```

and Railway returns:

```text
OPTIONS /api/widget/chat -> 404
response body: Not Found
```

then the domain is not serving the backend Express API. The widget static server historically returned a plain text `Not Found` response, which is 9 bytes. The backend API returns structured JSON errors, not a 9-byte body.

This usually means one of the following:

1. the backend Railway service root directory is wrong;
2. the backend service is using the widget build/start config;
3. EventFlow is pointing `apiBaseUrl` at the widget service domain rather than the backend service domain;
4. the backend deployment did not run after the merge.

## Required backend service settings

In Railway, the backend service should be configured as:

```text
Service name: @jadeassist/backend
Root Directory: packages/backend
Builder: Nixpacks
Build command: npm run build
Start command: npm run start
Healthcheck path: /healthz
```

Required variables:

```text
NODE_ENV=production
MONGODB_URL=<mongo connection string>
OPENAI_API_KEY=<openai key>
JWT_SECRET=<strong secret>
JADEASSIST_MINIMAL_MODE=false
CORS_ORIGIN=https://event-flow.co.uk,https://www.event-flow.co.uk
```

## Required widget service settings

The widget service should be configured as:

```text
Service name: @jadeassist/widget
Root Directory: .
Builder: Dockerfile
Dockerfile path: packages/widget/Dockerfile
Start command: node server.js
Healthcheck path: /healthz
```

The widget service should not receive `/api/widget/chat` traffic. If it does, the service now returns a `WRONG_SERVICE` diagnostic JSON response with CORS headers for EventFlow origins.

## Smoke tests after deploy

From a terminal or browser network panel, test:

```bash
curl -i https://jadeassistbackend-production.up.railway.app/healthz
curl -i -X OPTIONS https://jadeassistbackend-production.up.railway.app/api/widget/chat \
  -H 'Origin: https://event-flow.co.uk' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type'
```

Expected backend preflight result:

```text
HTTP/2 204
access-control-allow-origin: https://event-flow.co.uk
access-control-allow-credentials: true
```

If the response body says `WRONG_SERVICE`, EventFlow is still pointing at the widget static service instead of the backend API service.
