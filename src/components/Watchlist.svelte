<script lang="ts">
  import { KEY_RACES, type Chamber } from "../lib/config";
  import { partyVar } from "../lib/colors";
  import { raceLine } from "../lib/describe";
  import type { Race, StateResult } from "../lib/model";

  let {
    chamber,
    results,
    houseRaces,
    onselect,
  }: {
    chamber: Chamber;
    results: Map<string, StateResult> | null;
    houseRaces: Race[] | null;
    onselect: (state: string) => void;
  } = $props();

  // Senate and governors: the rated toss-ups. House: no fixed list, so the closest races with votes in.
  const items = $derived.by((): { race: Race; state: string }[] => {
    if (chamber === "house") {
      return (houseRaces ?? [])
        .filter((r) => r.status === "leading" || r.status === "tied")
        .sort((a, b) => a.margin - b.margin)
        .slice(0, 6)
        .map((race) => ({ race, state: race.state }));
    }
    return KEY_RACES.filter((k) => k.chamber === chamber)
      .map((k) => ({ race: results?.get(k.state)?.races[0], state: k.state }))
      .filter((x): x is { race: Race; state: string } => Boolean(x.race));
  });

  const title = $derived(chamber === "house" ? "Closest House races" : "Races to watch");
</script>

<section class="watch" aria-labelledby="watch-title">
  <h2 id="watch-title">{title}</h2>
  {#if !results}
    <ul aria-hidden="true">
      {#each [104, 72, 88, 64, 96] as w, i (i)}
        <li class="skel"><span class="sk" style:width="{w}px"></span><span class="sk" style:width="{w + 48}px"></span></li>
      {/each}
    </ul>
  {:else if items.length === 0}
    <p class="empty">{chamber === "house" ? "No House votes counted yet. The closest races show here once counting starts." : "No races to watch yet."}</p>
  {:else}
    <ul class="in">
      {#each items as { race, state } (race.key)}
        {@const [a, b] = race.candidates}
        <li>
          <button onclick={() => onselect(state)}>
            <span class="top">
              <span class="name">{race.label}</span>
              {#if race.status === "called"}<span class="pill">Called</span>{/if}
            </span>
            <span class="line">{raceLine(race)}</span>
            {#if a && b && race.totalVotes > 0}
              <span class="duel" aria-hidden="true">
                <span style:flex-grow={a.percent} style:background={partyVar[a.party]}></span>
                <span style:flex-grow={b.percent} style:background={partyVar[b.party]}></span>
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .watch { min-width: 0; }
  h2 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
  ul { margin: 0; padding: 0; list-style: none; }
  button {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 10px 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  button:active { background: var(--active); }
  @media (hover: hover) and (pointer: fine) {
    button:hover { background: var(--raised); }
  }
  li + li { border-top: 1px solid var(--rule); }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .name { font-size: 14px; font-weight: 600; }
  .line { font-size: 13px; color: var(--muted); }
  .pill { height: 20px; padding: 0 8px; border-radius: 999px; background: var(--ink); color: var(--ground); font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; }
  .duel { display: flex; gap: 2px; height: 4px; margin-top: 4px; border-radius: 2px; overflow: hidden; }
  .duel span { flex-basis: 0; opacity: 0.85; }
  .empty { margin: 0; font-size: 13px; color: var(--muted); }
  .in { animation: fade-in 280ms ease; }
  @keyframes fade-in { from { opacity: 0; } }
  .skel { display: grid; gap: 10px; padding: 14px 8px; }
  .skel .sk { height: 12px; }
  .skel .sk + .sk { height: 10px; }

</style>
