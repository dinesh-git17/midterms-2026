<script lang="ts">
  import { CHAMBERS } from "../lib/config";
  import { partyVar } from "../lib/colors";
  import { raceLine } from "../lib/describe";
  import type { CalledItem } from "../lib/live.svelte";

  let { items, calledSoFar, onselect }: { items: CalledItem[]; calledSoFar: number; onselect: (i: CalledItem) => void } = $props();

  const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
</script>

<section aria-labelledby="feed-title">
  <h2 id="feed-title">Called since you opened this page</h2>
  {#if items.length === 0}
    <p class="empty">None yet. {calledSoFar === 0 ? "No races have been called tonight." : `${calledSoFar} ${calledSoFar === 1 ? "race was" : "races were"} called before you arrived; they are on the map.`}</p>
  {:else}
    <ul aria-live="polite">
      {#each items as item (item.chamber + item.race.key)}
        <li>
          <button onclick={() => onselect(item)}>
            <span class="mark" style:background={item.race.party ? partyVar[item.race.party] : "var(--muted)"} aria-hidden="true"></span>
            <span class="what"><strong>{item.race.label}</strong> {CHAMBERS[item.chamber].label === "Governors" ? "governor" : CHAMBERS[item.chamber].label}</span>
            <span class="time num">{time(item.at)}</span>
            <span class="line">{raceLine(item.race)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  h2 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
  ul { margin: 0; padding: 0; list-style: none; max-height: 320px; overflow-y: auto; }
  li + li { border-top: 1px solid var(--rule); }
  li { animation: arrive var(--motion-slow) var(--motion-ease); }
  button { display: grid; grid-template-columns: 10px 1fr auto; gap: 2px 10px; align-items: center; width: 100%; padding: 10px 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  button:hover { background: var(--raised); }
  .mark { width: 10px; height: 10px; border-radius: 2px; }
  .what { font-size: 14px; }
  .time { font-size: 12px; color: var(--muted); }
  .line { grid-column: 2 / 4; font-size: 13px; color: var(--muted); }
  .empty { margin: 0; font-size: 13px; color: var(--muted); }
  @keyframes arrive { from { opacity: 0; transform: translateY(-6px); } }
  @media (prefers-reduced-motion: reduce) { li { animation: none; } }
</style>
