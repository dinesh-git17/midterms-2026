# Midterms 2026 · Live results

A live results page for the November 3, 2026 US midterm elections: Senate, House and
governors, with a state map, the race for control and state by state breakdowns.

Live at **[midterms.dins.dev](https://midterms.dins.dev)**.

![Share card: Midterm results, live](public/og.jpg)

## How it works

- The page polls three summary races (Senate, House, governors) every 30 seconds while
  the tab is visible, and renders each chamber as soon as its data lands.
- A small Cloudflare Worker serves the static build and proxies `/api/*` to
  [civicAPI](https://civicapi.org), caching responses and keeping a stale copy for when
  the upstream is slow or down.
- A race counts as called only when civicAPI marks a winner. The page never infers a
  call from margins.

## Stack

- Svelte 5 (runes), Vite 8, TypeScript 6
- Cloudflare Workers with static assets and the Cache API
- d3-geo and topojson-client on the pre-projected `us-atlas` Albers map
- Vitest for the model, text and polling logic

## Run it

```bash
npm install
npm run dev      # http://127.0.0.1:5189, Worker included
npm test
npm run check    # svelte-check and the Worker typecheck
npm run preview  # production build on port 5190
```

Deploying (`npm run deploy`) needs your own Cloudflare account; change the route in
`wrangler.jsonc` to a domain you control.

## Layout

```
src/            Svelte app (components, model, polling, routing)
worker/         Cloudflare Worker: static assets and the civicAPI proxy
og/             Share card source and render script
docs/           PRD, plan, tasks and the work ledger
```

## Credits

Results from [civicAPI](https://civicapi.org). Unofficial; states certify their own
counts in the weeks after election day. Made by [dins](https://dins.dev).
