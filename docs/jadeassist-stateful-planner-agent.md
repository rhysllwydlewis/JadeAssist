# JadeAssist stateful planner agent upgrade

This PR implements the first production-safety and state-management stage from the JadeAssist/EventFlow integration research report.

## Problems addressed

- The local fallback behaved like a canned planning guide and could repeat generic advice.
- Appended `[Known context]` and `[Relevant EventFlow search results]` could be treated as if they were the user's actual question.
- Budget ranges such as `£5k–£10k` were normalised into a single number, which broke trust and downstream matching.
- The assistant did not reliably carry structured state across turns to acknowledge event type, date/timeframe, guest count, budget and location.
- Widget demo mode could appear like live intelligence when `apiBaseUrl` was not configured.
- Upstream retries were not explicit.

## What changed

- Added planner-safe input sanitisation that preserves planning semantics such as currency symbols, ranges, dates and counts.
- Added budget range parsing for exact, range, under, over, plus and around cases.
- Reworked the transparent degraded-mode fallback so it uses current planner state, ignores appended context when classifying the user question, asks clarifying questions for fragments, and makes degraded mode explicit.
- Added provider retry/backoff with jitter for retryable upstream failures, while avoiding retries for insufficient-quota errors.
- Added shared `PlannerState`, `BudgetRange`, `AssistantResponse`, `StatePatch` and `UiAction` style contracts in `packages/shared/src/types/planner.ts`.
- Updated the planning engine so responses always include a structured `assistantResponse` alongside the legacy text response.
- Updated the widget API client so structured assistant metadata and degraded-mode status are available to the front end.
- Made widget demo mode honest on production-like hosts by warning and returning explicit degraded demo copy rather than silent fake intelligence.
- Added regression coverage for budget ranges, fragment handling, context-noise issues and provider backoff.

## Backward compatibility

The existing chat response shape remains intact. `assistantResponse` is additive. Existing consumers can continue reading `data.message.content`; newer integrations can read `data.assistantResponse` to persist state patches or show degraded-mode UI.

## EventFlow integration contract

EventFlow should treat its planner model as authoritative and use JadeAssist as the specialised planning service.

Recommended website path:

1. Browser sends chat traffic to EventFlow.
2. EventFlow authenticates where possible, applies rate limits and hydrates current plan state.
3. EventFlow calls JadeAssist with the latest message and current planner context.
4. JadeAssist returns `message.content` plus `assistantResponse`.
5. EventFlow validates `assistantResponse`, persists the state patch into plan/budget/timeline data, and returns the user-facing message.

## Rollout notes

- Keep existing endpoints stable.
- Roll out `assistantResponse` behind an EventFlow feature flag if needed.
- Monitor degraded-mode responses and rate limits in production.
- Never allow production to silently fall back to demo mode without a user-visible degraded-mode message.
