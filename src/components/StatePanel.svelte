<script lang="ts">
  import { CHAMBERS, type Chamber } from "../lib/config";
  import { partyVar } from "../lib/colors";
  import { raceLine } from "../lib/describe";
  import { fmt, type Race, type StateResult } from "../lib/model";

  let {
    chamber,
    result,
    closing,
    now,
    onclose,
  }: { chamber: Chamber; result: StateResult; closing?: string; now: number; onclose: () => void } = $props();

  const et = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
  const pollsOpen = $derived(closing ? new Date(closing).getTime() > now : false);

  function statusText(r: Race): string {
    if (r.status === "called") return "Called by civicAPI";
    if (r.status === "runoff") return "Runoff";
    if (r.status === "waiting") return closing ? (pollsOpen ? `Polls close ${et(closing)}` : `Polls closed ${et(closing)}`) : "No votes counted yet";
    return "Counting";
  }
</script>

<article class="panel" aria-labelledby="panel-title">
  <header>
    <div>
      <h2 id="panel-title">{result.name}</h2>
      <p class="meta">{CHAMBERS[chamber].label}{result.seats ? ` · ${result.seats.total} ${result.seats.total === 1 ? "seat" : "seats"}` : ""}</p>
    </div>
    <button class="close press" onclick={onclose} aria-label="Close {result.name}">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
    </button>
  </header>

  {#if result.seats}
    {@const s = result.seats}
    <dl class="seats">
      <div><dt>Democrats</dt><dd class="num">{s.called.D} <span>won</span>{#if s.leading.D} <em>+{s.leading.D} ahead</em>{/if}</dd></div>
      <div><dt>Republicans</dt><dd class="num">{s.called.R} <span>won</span>{#if s.leading.R} <em>+{s.leading.R} ahead</em>{/if}</dd></div>
      {#if s.called.O || s.leading.O}<div><dt>Others</dt><dd class="num">{s.called.O} <span>won</span></dd></div>{/if}
    </dl>
    {#if result.status === "waiting" && closing}<p class="when">{pollsOpen ? `Polls close ${et(closing)}` : "Polls closed, waiting for results"}</p>{/if}
    <ol class="districts">
      {#each result.races as r (r.key)}
        {@const lead = r.candidates[0]}
        <li>
          <details>
            <summary>
              <span class="mark" style:background={r.party ? partyVar[r.party] : "var(--map-waiting)"} class:tint={r.status !== "called"}></span>
              <span class="dname">{r.label.replace(result.name, "District").replace("District at-large", "At-large")}</span>
              <span class="dline">{raceLine(r)}</span>
              {#if r.status === "called"}<span class="pill">Called</span>{/if}
            </summary>
            {@render candidates(r)}
          </details>
        </li>
      {/each}
    </ol>
  {:else}
    {#each result.races as r (r.key)}
      <div class="status">
        <span class="pill" class:called={r.status === "called"} class:runoff={r.status === "runoff"}>{statusText(r)}</span>
        <span class="num reporting">{fmt.reporting(r.reporting)} of expected votes in</span>
      </div>
      <div class="meter" aria-hidden="true"><span style:--x={Math.min(100, r.reporting) / 100}></span></div>
      {@render candidates(r)}
      {#if r.totalVotes > 0}<p class="total num">{fmt.votes(r.totalVotes)} votes counted</p>{/if}
    {/each}
  {/if}
</article>

{#snippet candidates(r: Race)}
  {@const shown = r.candidates.filter((c, i) => i < 4 || c.votes > 0)}
  <table class="cands">
    <caption class="sr-only">{r.label} candidates</caption>
    <thead class="sr-only"><tr><th>Candidate</th><th>Votes</th><th>Share</th></tr></thead>
    <tbody>
      {#each shown as c (c.name)}
        <tr class:winner={c.winner}>
          <th scope="row">
            <span class="cname">
              <span class="chip" style:background={partyVar[c.party]} aria-hidden="true"></span>
              {c.name}
              {#if c.winner}<svg class="check" viewBox="0 0 16 16" width="14" height="14" aria-label="Winner"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>{/if}
            </span>
            <span class="party">{c.partyName}{c.incumbent ? " · Incumbent" : ""}</span>
            <span class="share" aria-hidden="true"><span style:--x={c.percent / 100} style:background={partyVar[c.party]}></span></span>
          </th>
          <td class="num">{fmt.votes(c.votes)}</td>
          <td class="num pct">{r.totalVotes ? fmt.pct(c.percent) : "-"}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/snippet}

<style>
  .panel { display: grid; gap: 16px; }
  header { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
  h2 { margin: 0; font-family: var(--font-display); font-size: 26px; font-weight: 550; letter-spacing: -0.015em; line-height: 1.1; font-variation-settings: "SOFT" 50, "WONK" 0; }
  .meta { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
  .close { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 999px; background: var(--raised); color: var(--ink); cursor: pointer; flex: none; }
  @media (hover: hover) and (pointer: fine) {
    .close:hover { background: var(--active); }
  }

  .status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  .pill { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--raised); color: var(--ink); }
  .pill.called { background: var(--ink); color: var(--ground); }
  .pill.runoff { background: var(--notice-bg); color: var(--notice-ink); }
  .reporting { font-size: 13px; color: var(--muted); }
  .meter { height: 4px; border-radius: 2px; background: var(--raised); overflow: hidden; margin-top: -8px; }
  /* Bars grow from their axis when the panel opens, then glide as counts come in. */
  /* Scale comes in as --x so @starting-style (scaleX(0)) can win on open; an inline transform would outrank it. */
  .meter span, .share span { display: block; height: 100%; transform: scaleX(var(--x)); transform-origin: left; transition: transform var(--dur-data) var(--ease-in-out); }
  .meter span { background: var(--ink); }
  @starting-style { .meter span, .share span { transform: scaleX(0); } }

  .cands { width: 100%; border-collapse: collapse; }
  .cands th, .cands td { padding: 10px 0; border-top: 1px solid var(--rule); vertical-align: top; text-align: left; font-weight: 400; }
  .cands tr:first-child th, .cands tr:first-child td { border-top: 0; }
  .cands td { text-align: right; padding-left: 12px; font-size: 14px; white-space: nowrap; }
  .cands td.pct { font-weight: 600; min-width: 52px; }
  .cname { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
  .chip { width: 10px; height: 10px; border-radius: 2px; flex: none; }
  .check { color: var(--ink); flex: none; }
  .party { display: block; margin: 2px 0 6px 18px; font-size: 12px; color: var(--muted); }
  .share { display: block; height: 6px; margin-left: 18px; border-radius: 3px; background: var(--raised); overflow: hidden; }
  .total { margin: -6px 0 0; font-size: 12px; color: var(--muted); }

  .seats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0; margin: 0; border: 1px solid var(--border); border-radius: 8px; }
  .seats div { padding: 10px 12px; }
  .seats div + div { border-left: 1px solid var(--border); }
  .seats dt { font-size: 12px; color: var(--muted); }
  .seats dd { margin: 2px 0 0; font-size: 22px; font-weight: 600; }
  .seats dd span { font-size: 13px; font-weight: 400; color: var(--muted); }
  .seats dd em { display: block; font-style: normal; font-size: 12px; font-weight: 400; color: var(--muted); }
  .when { margin: 0; font-size: 13px; color: var(--muted); }

  .districts { margin: 0; padding: 0; list-style: none; }
  .districts li { border-top: 1px solid var(--rule); }
  .districts summary { display: grid; grid-template-columns: 10px auto 1fr auto; align-items: center; gap: 4px 10px; padding: 10px 0; cursor: pointer; list-style: none; font-size: 14px; }
  .districts summary::-webkit-details-marker { display: none; }
  .districts summary:hover .dname { text-decoration: underline; }
  .districts details[open] summary { padding-bottom: 4px; }
  .districts details[open] { padding-bottom: 8px; }
  .mark { width: 10px; height: 10px; border-radius: 2px; }
  .mark.tint { opacity: 0.45; }
  .dname { font-weight: 600; white-space: nowrap; }
  .dline { color: var(--muted); font-size: 13px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .districts .pill { height: 20px; font-size: 11px; }
  @media (prefers-reduced-motion: reduce) {
    .meter span, .share span { transition: none; }
  }
</style>
