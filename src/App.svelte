<script lang="ts">
  import wordmarkRaw from "./assets/wordmark.svg?raw";
  import sealRaw from "./assets/seal.svg?raw";
  import BalanceBar from "./components/BalanceBar.svelte";
  import USMap from "./components/USMap.svelte";
  import StatePanel from "./components/StatePanel.svelte";
  import RaceTable from "./components/RaceTable.svelte";
  import Watchlist from "./components/Watchlist.svelte";
  import CalledFeed from "./components/CalledFeed.svelte";
  import { CHAMBERS, STATES, type Chamber } from "./lib/config";
  import { byState, secured, tally } from "./lib/model";
  import { partyVar } from "./lib/colors";
  import { live } from "./lib/live.svelte";
  import { route } from "./lib/route.svelte";

  const wordmark = wordmarkRaw
    .replaceAll('fill="#12181C"', 'style="fill:var(--ink)"')
    .replaceAll('fill="#0F6B6B"', 'style="fill:var(--accent)"');
  const seal = sealRaw
    .replace('fill="#F4F1EA"', 'style="fill:var(--surface)"')
    .replace('stroke="#12181C"', 'style="stroke:var(--ink)"');

  const chamber = $derived(route.chamber);
  const races = $derived(live.races[chamber]);
  const results = $derived(races ? byState(chamber, races) : null);
  const t = $derived(races ? tally(chamber, races) : null);
  const selected = $derived(route.state && results?.has(route.state) ? route.state : null);
  const selectedResult = $derived(selected ? results!.get(selected)! : null);

  const calledSoFar = $derived((["senate", "house", "governor"] as Chamber[]).reduce((n, c) => n + (live.races[c]?.filter((r) => r.status === "called").length ?? 0), 0));
  const anyVotes = $derived((["senate", "house", "governor"] as Chamber[]).some((c) => live.races[c]?.some((r) => r.totalVotes > 0)));

  const et = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";

  /** The one line under the title: the next closings before results, the race for control after. */
  const finding = $derived.by(() => {
    if (!t) return "Loading the latest results.";
    const meta = CHAMBERS[chamber];
    const d = secured(t, "D");
    const r = secured(t, "R");
    const racesUp = t.total - t.holdover.D - t.holdover.R - t.holdover.O;
    const calledN = racesUp - t.uncalled;
    if (d >= meta.majority) return `Democrats have won ${chamber === "governor" ? "a majority of governorships" : `control of the ${meta.label}`} with ${d} ${meta.unit}.`;
    if (r >= meta.majority) return `Republicans have won ${chamber === "governor" ? "a majority of governorships" : `control of the ${meta.label}`} with ${r} ${meta.unit}.`;

    const upcoming = Object.entries(live.closings)
      .filter(([, at]) => new Date(at).getTime() > live.now)
      .sort(([, a], [, b]) => a.localeCompare(b));
    if (!anyVotes && upcoming.length) {
      const at = upcoming[0][1];
      const names = upcoming.filter(([, x]) => x === at).map(([s]) => STATES[s]?.name ?? s);
      const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(names.length === 2 ? " and " : ", ").replace(/, ([^,]*)$/, " and $1");
      return `First polls close at ${et(at)} in ${list}. No races called yet.`;
    }
    const need = (n: number) => meta.majority - n;
    return `Democrats need ${need(d)} more ${meta.unit} for ${chamber === "governor" ? "a majority" : "control"}, Republicans ${need(r)}. ${calledN} of ${racesUp} races called.`;
  });

  // Freshness line: honest about failures, never a full-screen error.
  const freshness = $derived.by(() => {
    if (live.loading && !live.lastOk) return "Connecting";
    if (!live.lastOk) return "Can't reach results, retrying";
    const s = Math.max(0, Math.round((live.now - live.lastOk) / 1000));
    const ago = s < 5 ? "just now" : s < 60 ? `${s} s ago` : `${Math.floor(s / 60)} min ago`;
    if (live.failing) return `Reconnecting, last updated ${ago}`;
    return `Updated ${ago}`;
  });

  const tabs: { id: Chamber; label: string }[] = [
    { id: "senate", label: "Senate" },
    { id: "house", label: "House" },
    { id: "governor", label: "Governors" },
  ];

  let wide = $state(true);
  $effect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    wide = mq.matches;
    const on = () => (wide = mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  });

  // States called in the last few seconds on this chamber pulse once on the map.
  const flash = $derived(
    live.called
      .filter((c) => c.chamber === chamber && live.now - c.at.getTime() < 6000)
      .map((c) => ({ key: c.chamber + c.race.key + c.at.getTime(), state: c.race.state, color: c.race.party ? partyVar[c.race.party] : "var(--ink)" })),
  );

  let sheet: HTMLDialogElement | undefined = $state();
  // The sheet keeps showing the last state while it slides away, instead of emptying first.
  let sheetResult = $state<typeof selectedResult>(null);
  $effect(() => {
    if (selectedResult) sheetResult = selectedResult;
  });
  $effect(() => {
    if (!sheet) return;
    if (selectedResult && !wide && !sheet.open) sheet.showModal();
    if ((!selectedResult || wide) && sheet.open) sheet.close();
  });

  // Swipe the sheet down to close it: far enough, or a quick flick, either one dismisses.
  let drag: { y: number; t: number; dy: number } | null = null;
  function dragStart(e: PointerEvent) {
    if (drag || !sheet) return;
    drag = { y: e.clientY, t: performance.now(), dy: 0 };
    sheet.style.transition = "none";
    // Capture can throw when the pointer is already gone (a cancelled touch); the drag still works without it.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }
  function dragMove(e: PointerEvent) {
    if (!drag || !sheet) return;
    const raw = e.clientY - drag.y;
    // Pulling up past the top meets friction instead of a wall.
    drag.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 2;
    sheet.style.transform = `translateY(${drag.dy}px)`;
  }
  function dragEnd() {
    if (!drag || !sheet) return;
    const { dy, t } = drag;
    const velocity = dy / (performance.now() - t);
    drag = null;
    // Clearing the inline styles lets the stylesheet transition carry on from where the finger left it.
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (dy > 120 || (dy > 12 && velocity > 0.11)) close();
  }

  const select = (s: string) => route.go(chamber, s);
  const close = () => route.close();

  $effect(() => {
    document.title = selectedResult ? `${selectedResult.name} ${CHAMBERS[chamber].label} · Midterms 2026 live` : "Midterms 2026 · Live results";
  });

  function onTabKey(e: KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    route.go(next.id, null);
    document.getElementById(`tab-${next.id}`)?.focus();
  }
</script>

<header class="bar">
  <div class="col bar-inner">
    <a class="brand" href="https://dins.dev" aria-label="dins, home">{@html wordmark}</a>
    <span class="product">Midterms 2026</span>
    <p class="fresh" class:warn={live.failing || !live.lastOk} aria-live="polite">
      <span class="dot" class:off={live.failing || !live.lastOk} aria-hidden="true">
        {#key live.lastOk}{#if live.lastOk && !live.failing}<span class="ping"></span>{/if}{/key}
      </span>{freshness}
    </p>
  </div>
</header>

<main class="col">
  <div class="title">
    <h1>Midterm results, live</h1>
    <p class="finding">{finding}</p>
  </div>

  <div class="tabs" role="tablist" aria-label="Choose a chamber">
    {#each tabs as tab, i (tab.id)}
      <button
        id="tab-{tab.id}"
        role="tab"
        class="press"
        aria-selected={chamber === tab.id}
        aria-controls="view"
        tabindex={chamber === tab.id ? 0 : -1}
        onclick={() => route.go(tab.id, null)}
        onkeydown={(e) => onTabKey(e, i)}
      >
        {tab.label}
        {#if live.races[tab.id]}<span class="count num">{live.races[tab.id]!.length}</span>{/if}
      </button>
    {/each}
  </div>

  <div id="view" role="tabpanel" aria-labelledby="tab-{chamber}">
    <div class="card balance-card">
      <BalanceBar {chamber} {t} />
    </div>

    <div class="grid">
      <section class="card map-card" aria-labelledby="map-title">
        <div class="map-head">
          <h2 id="map-title">{chamber === "house" ? "House seats by state" : `${CHAMBERS[chamber].label} races by state`}</h2>
          <ul class="legend" aria-label="Map key">
            <li><span class="sw won"><i class="d"></i><i class="r"></i></span>Called</li>
            <li><span class="sw lead"><i class="d"></i><i class="r"></i></span>Leading</li>
            <li><svg class="sw" viewBox="0 0 18 10" aria-hidden="true"><rect width="18" height="10" fill="url(#hatch)" /></svg>Tied or runoff</li>
            <li><span class="sw wait"></span>Counting not started</li>
            <li><span class="sw none"></span>No race</li>
          </ul>
        </div>
        <USMap {chamber} {results} {selected} {flash} onselect={select} />
        {#if chamber === "house"}<p class="note">States are shaded by which party is ahead in more of their districts. Open a state for every district.</p>{/if}
      </section>

      {#if wide}
        <aside class="card rail" aria-label={selectedResult ? `${selectedResult.name} results` : "Races to watch and recent calls"}>
          <div class="rail-body">
            {#key selected ?? chamber}
              <div class="swap">
                {#if selectedResult}
                  <StatePanel {chamber} result={selectedResult} closing={live.closings[selectedResult.state]} now={live.now} onclose={close} />
                {:else}
                  <Watchlist {chamber} {results} houseRaces={chamber === "house" ? races : null} onselect={select} />
                  <div class="rail-gap"></div>
                  <CalledFeed items={live.called} {calledSoFar} onselect={(i) => route.go(i.chamber, i.race.state)} />
                {/if}
              </div>
            {/key}
          </div>
        </aside>
      {:else}
        <div class="phone-extras">
          <div class="card"><Watchlist {chamber} {results} houseRaces={chamber === "house" ? races : null} onselect={select} /></div>
          <div class="card"><CalledFeed items={live.called} {calledSoFar} onselect={(i) => route.go(i.chamber, i.race.state)} /></div>
        </div>
      {/if}
    </div>

    <div class="card">
      <RaceTable {chamber} {results} {selected} onselect={select} />
    </div>
  </div>
</main>

<dialog class="sheet" bind:this={sheet} onclose={() => route.state && close()} onclick={(e) => e.target === sheet && close()} aria-label={selectedResult ? `${selectedResult.name} results` : "Results"}>
  {#if sheetResult && !wide}
    <div class="sheet-body">
      <div class="grip-zone" aria-hidden="true" onpointerdown={dragStart} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd}>
        <span class="grip"></span>
      </div>
      <StatePanel {chamber} result={sheetResult} closing={live.closings[sheetResult.state]} now={live.now} onclose={close} />
    </div>
  {/if}
</dialog>

<footer class="col foot">
  <span class="seal" aria-hidden="true">{@html seal}</span>
  <div>
    <p>
      Results from <a href="https://civicapi.org">civicAPI</a>, refreshed every 30 seconds. Calls are civicAPI's; this page never calls a race
      itself. Seats not up this year: Senate 34 D (including two independents who caucus with Democrats) and 31 R; governors 6 D and 8 R. At
      50 to 50 in the Senate, the Republican vice president breaks ties.
    </p>
    <p>Made by <a href="https://dins.dev">dins</a>. Unofficial results. States certify their own counts in the weeks after election day.</p>
  </div>
</footer>

<style>
  .col { width: 100%; max-width: calc(var(--col) + 2 * var(--pad)); margin: 0 auto; padding: 0 var(--pad); }

  .bar { position: sticky; top: 0; z-index: 5; background: var(--ground); box-shadow: 0 1px 0 var(--border); }
  .bar-inner { display: flex; align-items: center; gap: 12px; height: 52px; }
  .brand { display: inline-flex; color: inherit; }
  .brand :global(svg) { height: 22px; width: auto; display: block; }
  .product { font-size: 14px; font-weight: 600; color: var(--muted); padding-left: 12px; box-shadow: inset 1px 0 0 var(--border); }
  .fresh { margin: 0 0 0 auto; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); white-space: nowrap; }
  .fresh.warn { color: var(--notice-ink); }
  .dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .dot.off { background: var(--muted); }
  /* One ping each time fresh data lands, so the motion means "new numbers", not decoration. */
  .ping { position: absolute; inset: 0; border-radius: 50%; background: var(--accent); opacity: 0; animation: ping 900ms var(--ease-out); }
  @keyframes ping { from { opacity: 0.6; transform: scale(1); } to { opacity: 0; transform: scale(2.6); } }

  .title { padding: 28px 0 16px; }
  h1 { margin: 0; font-family: var(--font-display); font-size: 32px; font-weight: 550; line-height: 1.1; letter-spacing: -0.02em; font-variation-settings: "SOFT" 50, "WONK" 0; }
  .finding { margin: 8px 0 0; font-size: 16px; max-width: 70ch; }

  .tabs { display: flex; gap: 24px; margin-bottom: 16px; box-shadow: inset 0 -1px 0 var(--border); overflow-x: auto; scrollbar-width: none; }
  .tabs button { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0; border: 0; background: none; color: var(--muted); font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  .tabs button[aria-selected="true"] { color: var(--ink); }
  .tabs button[aria-selected="true"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--ink); }
  .tabs .count { font-size: 12px; font-weight: 500; color: var(--muted); }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
  .balance-card { margin-bottom: var(--gap); }
  /* 1208 = 800 map + 24 gap + 384 rail. */
  .grid { display: grid; grid-template-columns: minmax(0, 1fr) 384px; gap: var(--gap); margin-bottom: var(--gap); }
  /* The map card sets the row height; the rail matches it and scrolls inside, so both cards share a bottom edge. */
  .rail { position: relative; padding: 0; min-height: 320px; }
  .rail-body { position: absolute; inset: 0; overflow-y: auto; padding: 20px; overscroll-behavior: contain; }
  .rail-gap { height: 24px; }
  /* Swapping the rail between the list and a state: a short settle, quick enough for repeated clicks. */
  .swap { animation: swap-in 180ms var(--ease-out); }
  @keyframes swap-in { from { opacity: 0; transform: translateY(4px); } }
  .map-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 12px; }
  h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--muted); }
  .legend li { display: inline-flex; align-items: center; gap: 6px; }
  .sw { display: inline-flex; width: 18px; height: 10px; border-radius: 2px; overflow: hidden; }
  .sw i { flex: 1; }
  .sw.won .d { background: var(--dem); }
  .sw.won .r { background: var(--rep); }
  .sw.lead .d { background: var(--dem-lead); }
  .sw.lead .r { background: var(--rep-lead); }
  .sw.wait { background: var(--map-waiting); }
  .sw.none { background: var(--map-none); box-shadow: inset 0 0 0 1px var(--border); }
  .note { margin: 8px 0 0; font-size: 12px; color: var(--muted); }

  .phone-extras { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }

  /* A drawer: slides up on the iOS sheet curve, leaves faster than it arrives. */
  .sheet {
    width: 100%; max-width: 100%; max-height: 88dvh; margin: auto 0 0; padding: 0; border: 0; border-radius: 16px 16px 0 0;
    background: var(--surface); color: var(--ink); box-shadow: 0 -8px 30px rgb(0 0 0 / 0.18);
    transform: translateY(100%);
    transition: transform 240ms var(--ease-out), overlay 240ms allow-discrete, display 240ms allow-discrete;
  }
  .sheet[open] { transform: translateY(0); transition-duration: 420ms; transition-timing-function: var(--ease-drawer); }
  @starting-style { .sheet[open] { transform: translateY(100%); } }
  .sheet::backdrop { background: rgb(18 24 28 / 0); transition: background 240ms ease, overlay 240ms allow-discrete, display 240ms allow-discrete; }
  .sheet[open]::backdrop { background: rgb(18 24 28 / 0.4); }
  @starting-style { .sheet[open]::backdrop { background: rgb(18 24 28 / 0); } }
  .sheet-body { padding: 0 16px calc(24px + env(safe-area-inset-bottom)); }
  .grip-zone { display: grid; place-items: center; height: 28px; margin: 0 -16px 4px; touch-action: none; cursor: grab; }
  .grip { display: block; width: 36px; height: 4px; border-radius: 2px; background: var(--active); }

  .foot { display: flex; gap: 16px; align-items: start; padding-top: 16px; padding-bottom: 48px; font-size: 13px; color: var(--muted); }
  .foot p { margin: 0 0 8px; max-width: 80ch; }
  .foot a { color: var(--ink); }
  .seal { flex: none; width: 44px; }
  .seal :global(svg) { width: 44px; height: 44px; display: block; }

  @media (max-width: 1023px) {
    .grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 640px) {
    :global(:root) { --pad: 16px; --gap: 16px; }
    .card { padding: 16px; }
    .map-card { padding: 12px 8px; }
    .map-head { padding: 4px 8px 0; }
    .title { padding: 20px 0 12px; }
    h1 { font-size: 24px; }
    .finding { font-size: 15px; }
    .product { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ping { animation: none; }
    .swap { animation-name: fade-in; }
    @keyframes fade-in { from { opacity: 0; } }
    .sheet { transform: none; opacity: 0; transition: opacity 200ms ease, overlay 200ms allow-discrete, display 200ms allow-discrete; }
    .sheet[open] { transform: none; opacity: 1; }
    @starting-style { .sheet[open] { transform: none; opacity: 0; } }
  }
</style>
