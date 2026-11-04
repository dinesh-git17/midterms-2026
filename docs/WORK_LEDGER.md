# Work ledger

## 2026-11-03: v1 build

### Decisions (all agreed with Din in three grilling rounds)

- v1 tonight, polish later. Senate first, then House and Governors.
- Albers state map; House shaded by state with a district list, no district shapes.
- Calls only from civicAPI's `winner` flag; Runoff from `advanced`.
- Control includes seats not up this year. Sources: Senate 2026 class and current
  membership (34 D incl. King and Sanders, 31 R not up); governors not up in 2026
  (6 D, 8 R).
- Races to watch from published ratings (Cook Political Report and NPR toss-up
  lists as of Oct 30, 2026): Senate NC, MI, OH, ME, GA, TX, IA, AK, KS; governor
  MI, WI, AZ, GA, NV. House uses the six closest races with votes in.
- Look: taste-skill app-screen draw "achromatic-ledger" (seed 1432208646), mapped onto
  dins brand tokens. Fraunces only for title, panel title and wordmark.
- Deploy target midterms.dins.dev as a static Worker; deploy waits for Din's OK.

### Implementation notes

- civicAPI sometimes returns 200 with an empty body and the House summary is ~310 KB
  and up to ~8 s on a miss. The Worker validates the body, keeps a 3 day stale copy and
  marks stale responses with `x-stale: 1`.
- The client renders each chamber as soon as its response lands, so a slow House
  summary no longer holds the Senate at "Connecting".
- civicAPI can report 0% expected vote while early ballots are counted; race lines
  say "early count" instead of "0% in".
- The rail matches the map card's height and scrolls inside, so both cards share a
  bottom edge.
- Hairline tokens are solid colours (the inspector misread alpha borders as near-ink).
- The live dot uses the accent, not red, so it never reads as a party.

### Verification (automatic and in-browser, not yet accepted by Din)

- `npm run check`: 0 errors, 0 warnings. `npm test`: 14 passed.
- Taste lint: 0 FAIL, 12 WARN (FIPS strings read as numbering; 1px inset hairlines
  and the sheet and tooltip shadows, which are real overlays).
- Inspector on the production preview, `--app`: 0 FAIL, 1 WARN (dins paper tone read
  as cream; it is the brand ground, kept).
- Browser: 1440 and 375 px, light and dark. Opened Kentucky (sheet on phone, panel on
  desktop), Back closes and restores `#senate`. Live counts moved between polls.
  Indiana House panel lists districts.
- Not yet seen: a real call arriving in the feed, the Reconnecting state against a
  real outage, the deployed Worker on Cloudflare.

### Open items

- OG share card via Antigravity (needs Din's OK before generating).
- Phase 2 list in `docs/TASKS.md`.

## 2026-11-03: first deploy

- Approval: Din said "Yes, deploy it".
- `wrangler.jsonc` gained the custom domain route `midterms.dins.dev`. Deployed as
  Worker `dins-midterms-2026`; current version after the fix below is
  ba79094b-5b06-4be3-9cee-f3082ff94e76.
- Found on the first live requests: House and Governors returned 502 once each (one
  fast empty answer, one 8 s timeout). Cloudflare's cache is per data center, so the
  first visitor in a region has no stale copy. Fix: the Worker retries a fast upstream
  failure once (not a timeout). Redeployed.
- Found while fixing: `worker/` was never typechecked (svelte-check only covers `src`)
  and its tsconfig pulled in the DOM lib, hiding `caches.default`. Set `lib` to ES2022
  and added `tsc -p worker` to `npm run check`.
- Verified live: page 200 with CSP, nosniff and referrer headers; all three race
  endpoints 200, cache hits at about 0.2 s; closings 200; a bad id returns 404. In the
  browser: `#senate/ky` deep link opens the sheet with live counts, Close returns to
  `#senate` on the site, fonts load, no console errors.
- Seen once: a browser in a cold data center sat on "Connecting" for several seconds
  until civicAPI answered; it then filled in without a reload.

## 2026-11-03: share card and motion pass

- Approval: Din said "Yes make the card! Also use the available motion skills to add
  better UX to the page". Redeploying this work still needs a separate OK.

### Share card

- Art: Antigravity `agy` (gemini-3.8-flash-high), a text-free riso Capitol dome,
  saved as `og/capitol-art.png`. Type is set in HTML (`og/card.html`), never in the
  generated image, so it stays sharp and spelled right.
- `og/render.sh` renders the card with headless Chrome to `public/og.jpg` (1200 x 630,
  JPEG 85, about 377 KB). `index.html` carries the `og:image` and `twitter:card` tags.

### Motion decisions (emil-design-eng)

| Element | Motion | Why |
| --- | --- | --- |
| Tabs, sort buttons, close | none on switch; 0.97 press scale | Used constantly, so instant; the press confirms the tap |
| Balance figures | count up over 600 ms on a call; instant on chamber switch | A call is the news; switching is user-driven and frequent |
| Balance bar segments | flex-basis 600 ms ease-in-out, reset on chamber switch | Shows seats moving between columns |
| Map | newly called state rings twice (2.4 s); fill fades 600 ms | Points at the change without a permanent pulse |
| Called feed | 280 ms arrive, 2.4 s tint, 50 ms stagger only within one poll | New items read as new; old ones never re-animate |
| Race list | 300 ms FLIP on re-sort | Rows keep their identity when order changes |
| Live dot | one 900 ms ping per successful poll, no endless pulse | Means "data arrived", not decoration |
| Phone sheet | 420 ms drawer curve in, 240 ms out; swipe down, flick at 0.11 px/ms; friction upward | Exit faster than enter; flick feels native |
| Tooltip | 125 ms in, stays mounted between states | No flicker crossing state borders |
| Reduced motion | movement removed, opacity and colour fades kept | Still shows that something changed |

### Bugs found and fixed

- `each_key_duplicate` in the called feed when civicAPI withdraws a call and makes it
  again (latent in the deployed v1). `mergeCalled` drops the older entry and keys carry
  the call time.
- Every return to a visible tab polled at once, so quick tab flips fired a request
  each (seen as polls every 2 s in a pane that flickers visible). `dueIn` now waits out
  the rest of the 30 s interval.
- The balance figures sat 18 px apart when only one side had a "+N leading" line. The
  sub-line reserves two lines on both sides, which also stops the bar shifting when a
  lead appears.
- The sheet drag set `transition: none` after pointer capture, so a capture failure
  skipped it. Order swapped and capture guarded.

### Verification

- `npm run check`: 0 errors, 0 warnings. `npm test`: 21 passed.
- Taste lint: 0 FAIL, 12 WARN (unchanged). Inspector on the production preview: 0 FAIL,
  1 WARN (paper tone, kept). Screenshots at 1440 and 390 looked right after the
  alignment fix.
- Browser (dev, 375 and 1440): a flick closes the sheet and restores `#senate`, a slow
  60 px drag snaps back, pulling up 80 px moves it 18 px, content stays during the exit.
  An injected call rings the state and staggers the feed (0 to 250 ms). Tab switch shows
  the other chamber's figures at once. Six reduced-motion rules present.
- Limit: the in-app browser pane was hidden most of the time, which throttles animation
  frames, so the count-up was seen starting and landing but not frame by frame. Worth
  a look on a real phone.

## 2026-11-03: load motion and skeleton polish

- Request: Din said "looks good! Also add some motion on load and polish the skeleton
  then deploy". That covers this deploy.

### Load sequence (plays once per visit)

- Sections settle in reading order: title, tabs, balance, map, rail, list. 520 ms
  ease-out rise of 10 px with 60 ms steps. Fill mode `backwards`, so no transform stays
  behind to break the tooltip or the sticky header.
- When the first data lands: the big figures count up from zero (900 ms), the balance
  bar grows in from both edges (the "open" segment stays as a filler so each party
  grows from its own side), and the map states take their colours in a 420 ms
  west-to-east sweep. Later polls and tab switches do none of this.
- Reduced motion: sections fade only, no sweep, no grow, figures set at once.

### Skeleton

- Shapes match the real content: two figure blocks with sub-lines, the bar track,
  the key count, the finding line, the tab counts, map shapes in the skeleton tone
  without labels, watchlist rows (name and line), race rows (swatch, name, line,
  figure), one feed line. One shared 1.1 s pulse; static under reduced motion.
- Fixed while doing it: during loading the map painted every state as "No race", the
  feed said "No races have been called tonight" before it knew, the watchlist said
  "Loading races." in plain text, and "Connecting" used the warning colour.
- Real content replaces the skeleton with a short fade.

### Bug found

- Inline `style:flex-basis` and `style:transform` outrank `@starting-style`, so the
  StatePanel bars from the motion pass never grew in. Sizes now come in as CSS
  variables (`--w`, `--x`) and the stylesheet sets the property. Checked by inserting a
  segment: it starts at 0 px with the intro on and at its full width without.

### Verification

- `npm run check`: 0 errors. `npm test`: 21 passed. Taste lint: 0 FAIL, 12 WARN.
- Inspector: 0 FAIL. One run caught the cold local Worker mid-load and added a
  "no data hue" WARN because the Senate was still on its skeleton; the other runs had
  the usual single paper-tone WARN.
- Browser: skeleton at 1440 light and 375 dark with `?hold`, then the reveal; no
  Svelte errors. The pane only renders frames on screenshots, so the sequence was
  checked at its start and end states, not watched frame by frame.

### Deploy

- Deployed with Din's OK, version dfe129c9-295b-4f1d-b772-e82cf7282b22 (commit 7e514a6
  plus this note). Live checks: page 200, `og.jpg` 200 (377 KB JPEG), all three race
  endpoints 200 under 1 s, dev `__live` hook absent from the bundle, no console errors.
  Browser: the entrance played and settled on the full page.
- Seen live: one Senate request took 8 s on a cache miss in this data center, and the
  Senate sat on its skeleton meanwhile. The Worker waits on civicAPI before it falls
  back to its stale copy. Serving stale at once and refreshing in the background
  (stale-while-revalidate) would remove that wait. Not done yet.
