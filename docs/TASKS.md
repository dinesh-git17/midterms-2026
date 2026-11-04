# Tasks

Status: planned, done (implemented), verified (checked automatically or in the browser),
accepted (Din signed off).

## Phase 1

| Task | Status |
| --- | --- |
| Scaffold Vite, Svelte, Worker, launch configs | verified |
| Worker proxy with fresh and stale cache, closings endpoint | verified (manual curl, browser) |
| Model and tallies, with unit tests | verified (14 tests) |
| Live polling, per-chamber render, visibility pause | verified (browser) |
| Balance bar | verified (browser, light and dark) |
| State map with legend and hatch | verified (browser) |
| State panel and House district list | verified (browser) |
| Race list with sorts | verified (browser) |
| Races to watch and called feed | verified (browser; feed not yet seen with a real call) |
| Phone layout and bottom sheet, Back closes | verified (375 px emulation) |
| svelte-check, tests, taste lint and inspector | verified (0 errors, 14 pass, 0 FAIL) |
| Docs, AGENTS.md, first commit | done |
| Deploy to midterms.dins.dev | verified live (Din approved deploy) |

## Phase 2

| Task | Status |
| --- | --- |
| County map in state panel | planned |
| "Just called" map highlight | verified (browser, injected call) |
| Rail scroll hint when content overflows the map height | planned |
| Motion pass (emil-design-eng) | verified (browser; tween frames limited by a hidden pane) |
| impeccable review, web-design-guidelines check | planned |
| OG share card via Antigravity | done (Din approved; renders with `og/render.sh`) |
| Called feed dedupe (`each_key_duplicate` when a call is withdrawn and made again) | verified (4 tests) |
| Poll at most every 30 s when the tab regains focus | verified (3 tests, browser: polls at 0, 31, 61 s) |
| Load motion and skeleton polish | verified (browser at 375 and 1440, dark and light) |
| Redeploy with phase 2 work | approved by Din ("then deploy") |
| Worker tests (`trimRace`, retry, stale fallback) | planned |
