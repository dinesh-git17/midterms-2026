<script lang="ts">
  import { geoPath } from "d3-geo";
  import { feature } from "topojson-client";
  import type { Feature, Geometry } from "geojson";
  import us from "us-atlas/states-albers-10m.json";
  import { FIPS_TO_STATE, STATES } from "../lib/config";
  import { fillFor } from "../lib/colors";
  import { stateLine } from "../lib/describe";
  import type { StateResult } from "../lib/model";

  let {
    chamber,
    results,
    selected,
    flash = [],
    onselect,
  }: {
    chamber: string;
    results: Map<string, StateResult> | null;
    selected: string | null;
    /** States called in the last few seconds, with the winning party colour, for a one-time pulse. */
    flash?: { key: string; state: string; color: string }[];
    onselect: (state: string) => void;
  } = $props();

  // us-atlas ships these shapes already projected to Albers USA on a 975 x 610 canvas.
  const topo = us as unknown as Parameters<typeof feature>[0];
  const path = geoPath();
  const shapes = (feature(topo, (topo as any).objects.states) as unknown as { features: Feature<Geometry>[] }).features
    .map((f) => {
      const code = FIPS_TO_STATE[String(f.id)];
      const d = path(f) ?? "";
      const [x, y] = path.centroid(f);
      return { code, d, x, y, area: path.area(f) };
    })
    .filter((s) => s.code && s.code !== "dc");

  // Label nudges for states whose centroid sits badly (Florida's is in the Gulf, Michigan's in the lake).
  const nudge: Record<string, [number, number]> = { fl: [10, -4], mi: [8, 14], la: [-8, 0], ky: [6, 2], ca: [-6, 0], id: [0, 12] };
  const labelled = shapes.filter((s) => s.area > 1400);

  let hover = $state<{ code: string; x: number; y: number } | null>(null);
  const hovered = $derived(hover ? results?.get(hover.code) : undefined);
  const byCode = new Map(shapes.map((s) => [s.code, s]));

  // Leaving one state for the next keeps the tooltip mounted, so it only fades in the first time.
  let leaveTimer: ReturnType<typeof setTimeout> | undefined;
  function move(e: PointerEvent, code: string) {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer);
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    hover = { code, x: e.clientX - box.left, y: e.clientY - box.top };
  }
  const leave = () => {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => (hover = null), 80);
  };

  const ink = (r: StateResult | undefined) => (r && (r.status === "called" || (r.status === "leading" && r.strength > 0.6)) ? "on-fill" : "");
  const label = (code: string) => {
    const r = results?.get(code);
    const name = STATES[code].name;
    return r ? `${name}: ${stateLine(r)}` : `${name}: no race this year`;
  };
</script>

<div class="map" role="group" aria-label="Map of results by state">
  <svg viewBox="0 0 975 610" aria-hidden="false">
    <defs>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="var(--map-waiting)" />
        <rect width="2" height="6" fill="var(--hatch)" />
      </pattern>
    </defs>
    <!-- Keyed by chamber: switching tabs repaints at once instead of cross-fading fifty states. -->
    {#key chamber}
    {#each shapes as s (s.code)}
      {@const r = results?.get(s.code)}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (the role is "button" whenever tabindex is set) -->
      <path
        d={s.d}
        class="state"
        class:none={!r}
        class:active={selected === s.code}
        style:fill={fillFor(r)}
        role={r ? "button" : "img"}
        tabindex={r ? 0 : undefined}
        aria-label={label(s.code)}
        onclick={() => r && onselect(s.code)}
        onkeydown={(e) => r && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onselect(s.code))}
        onpointermove={(e) => move(e, s.code)}
        onpointerleave={leave}
      />
    {/each}
    {/key}
    {#each flash as f (f.key)}
      {@const s = byCode.get(f.state)}
      {#if s}<path d={s.d} class="flash" style:stroke={f.color} />{/if}
    {/each}
    {#each shapes.filter((s) => s.code === selected) as s (s.code)}
      <path d={s.d} class="outline" />
    {/each}
    {#each labelled as s (s.code)}
      {@const [dx, dy] = nudge[s.code] ?? [0, 0]}
      <text x={s.x + dx} y={s.y + dy} class="abbr {ink(results?.get(s.code))}" aria-hidden="true">{s.code.toUpperCase()}</text>
    {/each}
  </svg>

  {#if hover}
    <div class="tip" style:left="{hover.x}px" style:top="{hover.y}px" aria-hidden="true">
      <strong>{STATES[hover.code].name}</strong>
      <span>{hovered ? stateLine(hovered) : "No race this year"}</span>
    </div>
  {/if}
</div>

<style>
  .map { position: relative; }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  .state {
    stroke: var(--map-stroke);
    stroke-width: 0.9;
    stroke-linejoin: round;
    cursor: pointer;
    transition: fill var(--dur-data) ease;
    outline: none;
  }
  .state.none { cursor: default; fill: var(--map-none); }
  @media (hover: hover) and (pointer: fine) {
    .state:not(.none):hover { filter: brightness(0.94); }
  }
  /* A newly called state: a ring in the winner's colour that pulses twice and fades. */
  .flash { fill: none; stroke-width: 3; stroke-linejoin: round; pointer-events: none; opacity: 0; animation: flash 2400ms ease-out; }
  @keyframes flash {
    0%, 100% { opacity: 0; }
    12%, 40% { opacity: 1; }
    26% { opacity: 0.35; }
  }
  .state:focus-visible { stroke: var(--focus); stroke-width: 3; }
  .outline { fill: none; stroke: var(--ink); stroke-width: 2.5; pointer-events: none; }
  .abbr {
    font-size: 11px;
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--ink);
    opacity: 0.72;
    pointer-events: none;
  }
  .abbr.on-fill { fill: var(--on-fill); opacity: 0.95; }
  .tip {
    position: absolute;
    transform: translate(12px, -50%);
    display: grid;
    gap: 2px;
    max-width: 260px;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--ink);
    color: var(--ground);
    font-size: 13px;
    pointer-events: none;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.12);
    transform-origin: left center;
    animation: tip-in 125ms var(--ease-out);
  }
  @keyframes tip-in { from { opacity: 0; transform: translate(12px, -50%) scale(0.97); } }
  @media (prefers-reduced-motion: reduce) {
    .tip { animation: none; }
  }
</style>
