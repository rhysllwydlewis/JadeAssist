# Supplier Discovery Pre-Merge Checklist

Use this checklist before merging changes that affect Jade supplier discovery.

## Behaviour checklist

- [ ] EventFlow-owned results are preferred first: MongoDB supplier profiles, then the EventFlow catalog API.
- [ ] Owned supplier and venue results include a profile URL that the widget can render as a card.
- [ ] External discovery providers are optional and never block boot if keys are absent.
- [ ] If provider keys are configured, discovery runs before generated fallback links.
- [ ] If provider keys are missing or providers fail, Jade still returns generated UK-wide discovery links.
- [ ] Queries for arbitrary UK categories and locations work, for example:
  - `find me a florist in Bolton`
  - `find me a musician in Plymouth`
  - `find me a venue in North Wales`
  - `find me a hotel near Cardiff`
- [ ] Jade does not imply online fallback results are verified, available, priced, or endorsed.
- [ ] Widget cards label the result source clearly (`EventFlow profile`, `Google Places`, `Google Maps`, `Web search`, or `Online fallback`).

## Optional provider configuration

The backend can use these optional keys when available:

- `GOOGLE_PLACES_API_KEY` for Google Places Text Search.
- `SERPAPI_API_KEY` for SerpApi Google Maps local results.
- `BRAVE_SEARCH_API_KEY` for Brave Search web results.

None of these are required for local development or Railway boot; the final generated fallback links still work without keys.

## Required checks

Run these before merging supplier discovery changes:

```bash
npm run build:shared && npm run test --workspace=packages/backend
npm run typecheck
npm run build:widget
```

## Manual smoke checks

After deployment, test the public widget with:

1. `find me a venue in North Wales`
2. `find me a florist in Bolton`
3. `find me a musician in Plymouth`
4. `find me a hotel near Cardiff`

Confirm each response includes clickable result cards and a concise next step.
