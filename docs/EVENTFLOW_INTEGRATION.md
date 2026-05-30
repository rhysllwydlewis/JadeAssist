# EventFlow Integration

This document defines the production contract between EventFlow and JadeAssist.

## Live services

EventFlow should embed the JadeAssist widget on public pages and point it at the JadeAssist backend API.

Current production backend URL used by the live widget:

```text
https://jadeassistbackend-production.up.railway.app
```

The public widget endpoint is:

```text
POST /api/widget/chat
```

The browser must also be able to preflight the same endpoint:

```text
OPTIONS /api/widget/chat
```

## Required CORS behaviour

The JadeAssist backend must allow both EventFlow production origins:

```text
https://event-flow.co.uk
https://www.event-flow.co.uk
```

For the embedded widget to work, the backend must return CORS headers for both preflight and real requests:

```text
Access-Control-Allow-Origin: https://event-flow.co.uk
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With
```

The live failure this document protects against was:

```text
OPTIONS /api/widget/chat returned 404 and no Access-Control-Allow-Origin header
```

## Railway environment

The backend Railway service should be running the backend package and have these variables configured for full production mode:

```text
NODE_ENV=production
MONGODB_URL=<mongo connection string>
OPENAI_API_KEY=<openai key>
JWT_SECRET=<strong secret>
JADEASSIST_MINIMAL_MODE=false
CORS_ORIGIN=https://event-flow.co.uk,https://www.event-flow.co.uk
```

If `CORS_ORIGIN` is omitted in production, the backend falls back to the two EventFlow origins above. Explicitly setting `CORS_ORIGIN` is still recommended so the deployed configuration is obvious.

## EventFlow embed snippet

The EventFlow site should initialise the widget in one traceable place rather than scattering inline snippets across pages.

Recommended configuration:

```html
<script src="https://cdn.jsdelivr.net/gh/rhysllwydlewis/JadeAssist@<pinned-commit-or-release>/packages/widget/dist/jade-widget.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', function () {
    if (!window.JadeWidget) return;
    window.JadeWidget.init({
      apiBaseUrl: 'https://jadeassistbackend-production.up.railway.app',
      assistantName: 'Jade',
      primaryColor: '#0B8073',
      accentColor: '#13B6A2',
      debug: false,
      offsetBottom: '80px',
      offsetRight: '24px'
    });
  });
</script>
```

Use a pinned release or commit instead of `@main` for production so EventFlow does not receive unreviewed widget changes automatically.

## Manual production smoke test

After deploying JadeAssist, test from a browser on EventFlow:

1. Open `https://event-flow.co.uk`.
2. Open the Jade widget.
3. Send `Yes please`.
4. In DevTools Network, confirm `OPTIONS /api/widget/chat` is not 404.
5. Confirm the response includes `Access-Control-Allow-Origin: https://event-flow.co.uk`.
6. Confirm `POST /api/widget/chat` returns either a successful assistant response or a controlled JSON error with CORS headers.
7. Confirm the widget does not show a misleading online state if the backend is unavailable.

## Related tests

The backend regression test is:

```bash
npm run test --workspace=@jadeassist/backend
```

It includes `src/tests/widgetCors.validation.ts`, which specifically protects the EventFlow widget preflight path.
