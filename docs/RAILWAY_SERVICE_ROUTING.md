# Railway service routing

JadeAssist is designed to run as two separate Railway services:

| Service               | Root directory                               | Purpose                                 | Public routes                                                 |
| --------------------- | -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `@jadeassist/backend` | `.` repo root                                | Express API and OpenAI-backed assistant | `/api/widget/chat`, `/api/chat`, `/api/v1/assist`, `/healthz` |
| `@jadeassist/widget`  | Static/CDN hosting of `packages/widget/dist` | Static widget bundle hosting            | `/jade-widget.js`                                             |

## Confirmed failure mode

If the EventFlow widget calls:

```text
https://jadeassistbackend-production.up.railway.app/api/widget/chat
```

and Railway returns:

```text
POST /api/widget/chat -> 421
response body: { "error": { "code": "WRONG_SERVICE" }, "currentService": "jadeassist-widget-static" }
```

then the domain is not serving the backend Express API. The widget static server returns this diagnostic when API traffic reaches the static bundle host. The backend API returns `204` for preflight and structured chat JSON for POST requests.

This usually means one of the following:

1. the backend Railway service root directory is wrong;
2. the backend service is using the widget build/start config;
3. EventFlow is pointing `apiBaseUrl` at the widget service domain rather than the backend service domain;
4. the backend deployment did not run after the merge.

## Required backend service settings

In Railway, the backend service should be configured as:

```text
Service name: @jadeassist/backend
Root Directory: .
Builder: Nixpacks
Build command: npm run build --workspace=packages/backend
Start command: npm run start --workspace=packages/backend
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
Service type: Static (recommended)
Build command: npm ci && npm run build --workspace=packages/widget
Output directory: packages/widget/dist
Healthcheck path: not required for Static sites
```

The widget host should not receive `/api/widget/chat` traffic. If it does, the Node static fallback returns a `WRONG_SERVICE` diagnostic JSON response with CORS headers for EventFlow origins, and the browser widget now surfaces that diagnostic instead of a generic `API error: 421`.

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
