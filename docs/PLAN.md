# Plan

## Phase 1: live tonight (v1)

Approach: a static Svelte 5 app plus one Cloudflare Worker that serves it and caches
civicAPI. Keep the client dumb about the network (same-origin `/api/race/:id`) so a
slow or flaky upstream never reaches the browser directly.

1. Scaffold: Vite 8, Svelte 5, Worker with static assets and `run_worker_first`.
2. Worker proxy: trim payloads, fresh and stale caches, closings endpoint.
3. Model: civicAPI race to `Race`, tallies, per-state roll-up, House seat counts. Tests.
4. Live store: 30 s polling, visibility pause, per-chamber rendering, called feed.
5. UI: balance bar, map, state panel, race list, watchlist, feed, sheet, tabs, routes.
6. Verify: desktop and phone, light and dark, svelte-check, tests, taste-skill gate.
7. Docs and commit. Deploy to midterms.dins.dev after Din's OK.

Verification: acceptance criteria 1 to 6 in the PRD before the deploy question.

## Phase 2: polish

1. County map inside the state panel (us-atlas counties, matched by name to FIPS).
2. "Just called" highlight on the map.
3. Motion pass (emil-design-eng), then impeccable and web-design-guidelines reviews.
4. OG share card (Antigravity image generation, with Din's OK).
5. Worker tests for `trimRace` and the cache fallback.

## Dependencies

- civicAPI availability and its race IDs; attribution on the page.
- Cloudflare account with the dins.dev zone for the custom domain.
