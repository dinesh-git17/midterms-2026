<script lang="ts">
  import { CHAMBERS, type Chamber } from "../lib/config";
  import { fillFor } from "../lib/colors";
  import { stateLine } from "../lib/describe";
  import { fmt, type StateResult } from "../lib/model";
  import { flip } from "svelte/animate";
  import { cubicInOut } from "svelte/easing";
  import { prefersReducedMotion } from "svelte/motion";

  let {
    chamber,
    results,
    selected,
    onselect,
  }: { chamber: Chamber; results: Map<string, StateResult> | null; selected: string | null; onselect: (s: string) => void } = $props();

  type Sort = "name" | "close" | "counted";
  let sort = $state<Sort>("name");

  const closeness = (s: StateResult) => {
    if (s.status === "called") return 1000;
    if (s.seats) return s.status === "waiting" ? 900 : 100 * (1 - s.strength);
    const r = s.races[0];
    return r.status === "leading" || r.status === "tied" ? r.margin : 900;
  };

  const rows = $derived.by(() => {
    const list = [...(results?.values() ?? [])];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "counted") list.sort((a, b) => b.reporting - a.reporting || a.name.localeCompare(b.name));
    if (sort === "close") list.sort((a, b) => closeness(a) - closeness(b) || a.name.localeCompare(b.name));
    return list;
  });

  const sorts: [Sort, string][] = [
    ["name", "A to Z"],
    ["close", "Closest"],
    ["counted", "Most counted"],
  ];
</script>

<section class="list" aria-labelledby="list-title">
  <div class="head">
    <h2 id="list-title">Every {CHAMBERS[chamber].label === "Governors" ? "governor's" : CHAMBERS[chamber].label} race{chamber === "house" ? ", by state" : ""}</h2>
    <div class="sorts" role="radiogroup" aria-label="Sort races">
      {#each sorts as [key, text] (key)}
        <button role="radio" aria-checked={sort === key} class="press" class:on={sort === key} onclick={() => (sort = key)}>{text}</button>
      {/each}
    </div>
  </div>

  {#if !results}
    <ul class="rows">
      {#each Array(8) as _, i (i)}<li class="skel"><span></span><span></span></li>{/each}
    </ul>
  {:else}
    <ul class="rows">
      <!-- When a poll reorders "Closest" or "Most counted", rows glide to their new places instead of jumping. -->
      {#each rows as s (s.state)}
        <li animate:flip={{ duration: prefersReducedMotion.current ? 0 : 300, easing: cubicInOut }}>
          <button class:active={selected === s.state} onclick={() => onselect(s.state)}>
            <span class="sw" style:background={fillFor(s)} aria-hidden="true"></span>
            <span class="name">{s.name}</span>
            <span class="line">{stateLine(s)}</span>
            <span class="pct num">{fmt.reporting(s.reporting)} <span class="unit">in</span></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .sorts { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--raised); }
  .sorts button { height: 30px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }
  .sorts button.on { background: var(--surface); color: var(--ink); font-weight: 600; box-shadow: 0 0 0 1px var(--border); }

  .rows { margin: 0; padding: 0; list-style: none; columns: 2; column-gap: 32px; }
  .rows li { break-inside: avoid; border-top: 1px solid var(--rule); }
  .rows button {
    display: grid;
    grid-template-columns: 14px 132px 1fr auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 6px 4px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
  }
  .rows button:active { background: var(--active); }
  @media (hover: hover) and (pointer: fine) {
    .rows button:hover { background: var(--raised); }
  }
  .rows button.active { background: var(--active); }
  .sw { width: 14px; height: 14px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--border); }
  .name { font-size: 14px; font-weight: 600; }
  .line { font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pct { font-size: 13px; text-align: right; min-width: 52px; }
  .unit { color: var(--muted); }
  .skel { height: 44px; display: flex; align-items: center; gap: 12px; }
  .skel span { height: 12px; width: 120px; border-radius: 4px; background: var(--skeleton); }
  .skel span + span { width: 40%; }

  @media (max-width: 860px) {
    .rows { columns: 1; }
  }
  @media (max-width: 480px) {
    .rows button { grid-template-columns: 14px 1fr auto; grid-template-rows: auto auto; row-gap: 0; }
    .name { grid-column: 2; }
    .pct { grid-column: 3; grid-row: 1; }
    .line { grid-column: 2 / 4; grid-row: 2; white-space: normal; }
  }
</style>
