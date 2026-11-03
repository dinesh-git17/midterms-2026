# PRD: Midterms 2026 · Live results

## Goal

A single page where anyone can follow the November 3, 2026 US midterm results live:
who controls each chamber, what is still open, and how each state is counting, on a
phone or a desktop. Built and shipped on election night, polished afterwards.

## Users

People following the night casually or closely, mostly on phones, often glancing
between other things. They want the control picture in one look, then a state on tap.

## Requirements

Data
- Source: civicAPI v2 (`/race/{id}`), free, no key, attribution required. Summary
  races: Senate 87528, House 87524, Governors 87535.
- Poll every 30 seconds while the tab is visible; pause when hidden; refresh on return.
- A same-origin Worker proxies and caches `/api/*` (20 s fresh, 3 day stale fallback).
- A race is called only when civicAPI marks a winner ("Called by civicAPI"). Runoff
  only when a candidate is marked `advanced`. The page never calls races itself.
- Control counts include seats not up this year (Senate 34 D incl. 2 independents,
  31 R; governors 6 D, 8 R).

Screens
- Chambers as tabs: Senate (first), House, Governors.
- Balance bar per chamber: secured seats per party, leading, majority line, plain
  finding sentence ("Democrats need 17 more seats for control, Republicans 20").
- Geographic Albers state map. Called = solid party colour, leading = tint by margin
  and count, tied or runoff = hatch, counting not started = blank, no race = faded.
- House: states shaded by which party leads more districts; the state panel lists
  every district.
- State panel: candidates with votes, share and a bar; % of expected vote in;
  "Polls close X ET" before results.
- Races to watch (rated toss-ups) and a "Called since you opened this page" feed.
- Every race in a sortable list (A to Z, Closest, Most counted).
- Desktop: map with a right rail; selected state replaces the rail. Phone: stacked,
  full-width map, state opens in a bottom sheet.
- Deep links `#chamber/state`; Back closes the panel.
- Freshness line: "Updated N s ago", "Reconnecting, last updated ..." on failure.

Look
- dins brand tokens; achromatic chrome, colour only on data; colour-blind-safe party
  colours; light and dark follow the system.
- Fraunces for the page title, panel title and wordmark; Instrument Sans for the rest.
- Subtle motion only, none under reduced motion.

Accessibility
- Every state is keyboard reachable with a full aria-label; a hidden table mirrors the
  map; tabs and sort controls use proper roles; colour is never the only signal.

## Non-goals (v1)

- District-shape House map, county maps (first polish item), projections or our own
  race calls, historical comparisons, ballot measures, notifications.

## Acceptance criteria

1. The page shows all three chambers from live civicAPI data, refreshing every 30 s.
2. Control figures equal holdovers plus civicAPI-called seats.
3. A state can be opened from the map, the list and the watchlist, on desktop and
   phone; Back closes it; `#senate/ga` opens Georgia directly.
4. Works at 375 px wide with no horizontal scroll; works in light and dark.
5. A failed poll keeps the last data and says it is reconnecting.
6. `npm run check` clean, tests pass, taste-skill inspector 0 FAIL.
7. Deployed to midterms.dins.dev after Din's OK, with civicAPI credited.
