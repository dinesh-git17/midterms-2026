<script lang="ts">
  import { CHAMBERS, type Chamber } from "../lib/config";
  import { secured, type Party, type Tally } from "../lib/model";
  import { partyName } from "../lib/colors";
  import { Tween, prefersReducedMotion } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  let { chamber, t }: { chamber: Chamber; t: Tally | null } = $props();

  const meta = $derived(CHAMBERS[chamber]);
  const pct = (n: number) => `${(n / (t?.total ?? 1)) * 100}%`;

  // Left to right: Democrats from the outside in, the uncalled middle, Republicans from the inside out.
  const segments = $derived.by(() => {
    if (!t) return [];
    const others = t.holdover.O + t.called.O;
    return [
      { key: "d-hold", n: t.holdover.D, cls: "hold d", label: "Democrats not up this year" },
      { key: "d-won", n: t.called.D, cls: "won d", label: "Democrats won tonight" },
      { key: "d-lead", n: t.leading.D, cls: "lead d", label: "Democrats leading" },
      { key: "open", n: t.uncalled - t.leading.D - t.leading.R, cls: "open", label: "Not called, no clear leader" },
      { key: "o", n: others + t.leading.O, cls: "won o", label: "Independents and others" },
      { key: "r-lead", n: t.leading.R, cls: "lead r", label: "Republicans leading" },
      { key: "r-won", n: t.called.R, cls: "won r", label: "Republicans won tonight" },
      { key: "r-hold", n: t.holdover.R, cls: "hold r", label: "Republicans not up this year" },
      // "open" stays even at zero: it grows to fill the gap, so on first load each party grows from its own edge.
    ].filter((s) => s.n > 0 || s.key === "open");
  });

  const side = (p: Party) => (t ? { have: secured(t, p), lead: t.leading[p], need: Math.max(0, t.majority - secured(t, p)) } : null);
  const d = $derived(side("D"));
  const r = $derived(side("R"));
  const o = $derived(t ? secured(t, "O") : 0);

  // The big figures count to a new value when a race is called (rare, and the change is the news).
  // Switching chambers is frequent and user-driven, so it jumps straight to the other chamber's figures.
  const dShown = new Tween(0, { duration: 600, easing: cubicOut });
  const rShown = new Tween(0, { duration: 600, easing: cubicOut });
  let lastChamber: Chamber | null = null;
  $effect(() => {
    if (!d || !r) return;
    // First numbers of the visit count up from zero, a little slower; that happens once.
    const first = lastChamber === null;
    const instant = (!first && chamber !== lastChamber) || prefersReducedMotion.current;
    lastChamber = chamber;
    const opts = instant ? { duration: 0 } : first ? { duration: 900 } : undefined;
    dShown.set(d.have, opts);
    rShown.set(r.have, opts);
  });

  // The bar grows in from both edges once, when the first data lands; later chamber switches stay instant.
  let intro = $state(true);
  $effect(() => {
    if (t && intro) setTimeout(() => (intro = false), 1200);
  });
</script>

<section class="balance" aria-labelledby="balance-title">
  <h2 id="balance-title" class="sr-only">{meta.label} control</h2>
  <div class="figures">
    <div class="side">
      <span class="who"><span class="chip d" aria-hidden="true"></span>{partyName.D}</span>
      <span class="big num" class:sk={!d}>{d ? Math.round(dShown.current) : ""}</span>
      <span class="sub">
        {#if d}<span>{d.need > 0 ? `${d.need} short of ${meta.majority}` : "Control won"}</span>{#if d.lead > 0}<span>+{d.lead} leading</span>{/if}{:else}<span class="sk sub-sk"></span>{/if}
      </span>
    </div>
    <div class="mid">
      <span class="target num">{meta.majority}</span>
      <span class="sub">{chamber === "governor" ? "for a majority of governors" : "for control"}</span>
    </div>
    <div class="side right">
      <span class="who">{partyName.R}<span class="chip r" aria-hidden="true"></span></span>
      <span class="big num" class:sk={!r}>{r ? Math.round(rShown.current) : ""}</span>
      <span class="sub">
        {#if r}<span>{r.need > 0 ? `${r.need} short of ${meta.majority}` : "Control won"}</span>{#if r.lead > 0}<span>+{r.lead} leading</span>{/if}{:else}<span class="sk sub-sk"></span>{/if}
      </span>
    </div>
  </div>

  <div class="bar" class:sk={!t} class:intro role="img" aria-label={t ? `${partyName.D} ${d?.have}, ${partyName.R} ${r?.have}${o ? `, others ${o}` : ""}, ${t.uncalled} not called, of ${t.total} ${meta.unit}` : "Loading"}>
    {#key chamber}
      {#each segments as s (s.key)}
        <span class="seg {s.cls}" style:--w={pct(s.n)} title="{s.label}: {s.n}"></span>
      {/each}
    {/key}
    <span class="line" style:left={pct(meta.majority - 0.5)} aria-hidden="true"></span>
  </div>

  <ul class="key" aria-label="Key">
    {#if t ? t.holdover.D + t.holdover.R + t.holdover.O > 0 : chamber !== "house"}<li><span class="sw hold"><i class="d"></i><i class="r"></i></span>Not up this year</li>{/if}
    <li><span class="sw won"><i class="d"></i><i class="r"></i></span>Won tonight</li>
    <li><span class="sw lead"><i class="d"></i><i class="r"></i></span>Leading, not called</li>
    <li><span class="sw open"></span>Not called</li>
    {#if !t}<li class="count"><span class="sk key-sk"></span></li>{/if}
    {#if t}<li class="count num">{t.total - t.uncalled - t.holdover.D - t.holdover.R - t.holdover.O} of {t.total - t.holdover.D - t.holdover.R - t.holdover.O} races called</li>{/if}
  </ul>
</section>

<style>
  .balance { display: grid; gap: 14px; }
  .figures { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 16px; }
  .side { display: grid; gap: 2px; justify-items: start; }
  .side.right { justify-items: end; text-align: right; }
  .who { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  .chip { width: 10px; height: 10px; border-radius: 2px; }
  .chip.d { background: var(--dem); }
  .chip.r { background: var(--rep); }
  .big { font-size: 36px; line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; min-height: 38px; }
  .big.sk { width: 56px; height: 34px; min-height: 0; margin: 2px 0; }
  .sub-sk { width: 84px; height: 10px; margin-top: 5px; }
  .key-sk { width: 96px; height: 10px; }
  /* Two lines reserved so a "+N leading" line arriving mid-night never shifts the figures. */
  .sub { display: grid; align-content: start; min-height: 2lh; font-size: 13px; color: var(--muted); }
  .mid { display: grid; justify-items: center; text-align: center; gap: 2px; padding-bottom: 2px; }
  .target { font-size: 20px; font-weight: 600; }

  .bar { position: relative; display: flex; height: 28px; border-radius: 4px; overflow: hidden; background: var(--map-waiting); }
  /* Widths come in as a variable: an inline flex-basis would outrank @starting-style and skip the grow-in. */
  .seg { flex-grow: 0; flex-shrink: 0; flex-basis: var(--w); transition: flex-basis var(--dur-data) var(--ease-in-out); }
  .seg + .seg { box-shadow: inset 1px 0 0 var(--surface); }
  .seg.d.won { background: var(--dem); }
  .seg.r.won { background: var(--rep); }
  .seg.o.won { background: var(--ind); }
  .seg.d.hold { background: var(--dem-hold); }
  .seg.r.hold { background: var(--rep-hold); }
  .seg.d.lead { background: var(--dem-lead); }
  .seg.r.lead { background: var(--rep-lead); }
  .seg.open { flex-grow: 1; background: var(--map-waiting); }
  .intro .seg { transition-duration: 900ms; transition-timing-function: var(--ease-out); }
  .intro .seg:not(.open) { @starting-style { flex-basis: 0; } }
  .line { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; background: var(--ink); }

  .key { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--muted); }
  .key li { display: inline-flex; align-items: center; gap: 6px; }
  .key .count { margin-left: auto; color: var(--ink); }
  .sw { display: inline-flex; width: 18px; height: 10px; border-radius: 2px; overflow: hidden; }
  .sw i { flex: 1; }
  .sw.won .d { background: var(--dem); }
  .sw.won .r { background: var(--rep); }
  .sw.hold .d { background: var(--dem-hold); }
  .sw.hold .r { background: var(--rep-hold); }
  .sw.lead .d { background: var(--dem-lead); }
  .sw.lead .r { background: var(--rep-lead); }
  .sw.open { background: var(--map-waiting); }

  @media (prefers-reduced-motion: reduce) {
    .seg { transition: none; }
  }
  @media (max-width: 640px) {
    .big { font-size: 30px; min-height: 32px; }
    .figures { gap: 8px; }
    .sub { font-size: 12px; }
    .key .count { margin-left: 0; width: 100%; }
  }
</style>
