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

- Deploy to midterms.dins.dev (needs a route or custom domain in `wrangler.jsonc`).
- OG share card via Antigravity (needs Din's OK before generating).
- Phase 2 list in `docs/TASKS.md`.
