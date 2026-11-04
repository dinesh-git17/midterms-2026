# Midterms 2026 · Live results

A live results page for the November 3, 2026 US midterms (Senate, House, Governors),
polling civicAPI through a small caching Cloudflare Worker. Target: midterms.dins.dev.

Read `docs/PRD.md`, `docs/PLAN.md`, `docs/TASKS.md` and `docs/WORK_LEDGER.md` before
starting or resuming work, and keep them current.

## Stack

- Svelte 5 (runes) + Vite 8, TypeScript 6 (svelte-check does not support TS 7 yet).
- One Cloudflare Worker (`worker/index.ts`) serves the static build and proxies
  `/api/*` to civicAPI with Cache API caching. `@cloudflare/vite-plugin` runs it in dev.
- Map: d3-geo + topojson-client on `us-atlas/states-albers-10m.json` (pre-projected).
- Versions are pinned exactly in `package.json`. Suggest upgrades, don't apply them unasked.

## Commands

- `npm run dev`: dev server on http://127.0.0.1:5189 (Worker included).
- `npm run preview`: production build served on port 5190.
- `npm test`: vitest (model, describe, called-feed and poll timing tests; the Worker has none yet).
- `npm run check`: svelte-check, must report 0 errors and 0 warnings.
- `npm run deploy`: build and `wrangler deploy`. Deploy only with Din's OK.
- Dev only: open `http://127.0.0.1:5189/?hold` to keep the page on its loading
  skeleton, then run `__live.start()` in the console to watch the first-load reveal.
- `sh og/render.sh`: re-render the share card (`og/card.html` over `og/capitol-art.png`)
  to `public/og.jpg`. Needs Google Chrome installed.

## Conventions

- Data rules: a race is "called" only when civicAPI sets `winner: true`. Never infer a
  call from margins. Runoff only when `advanced` is set.
- Chrome stays achromatic (ink on the dins paper ground); party colours appear only on
  data. Tokens live in `src/app.css`; components reference tokens only.
- No em dashes or en dashes as separators in UI text or docs.
- Every map colour has a text equivalent (aria-label, list row, sr-only table).
- Svelte 5 trims whitespace at the start and end of an element: put spaces outside
  inline spans (`{n} <span>won</span>`, not `{n}<span> won</span>`).

## Verify a change

1. `npm run check` and `npm test`.
2. Open the dev server (launch config `midterms-2026`) at 1440 and 375 wide, light and
   dark. Open a state, press Back, switch tabs.
3. For visual changes, run the taste-skill gate against the production preview
   (launch config `midterms-2026-prod`):
   `node ~/.claude/skills/design-taste-frontend/scripts/lint.mjs --app src` and
   `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:5190/ --app --out .taste-skill/inspect`.
   0 FAIL is required; look at the screenshots.
