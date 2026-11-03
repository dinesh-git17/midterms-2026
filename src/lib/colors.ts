import type { Party, StateResult } from "./model";

export const partyVar: Record<Party, string> = { D: "var(--dem)", R: "var(--rep)", O: "var(--ind)" };
export const partyName: Record<Party, string> = { D: "Democrats", R: "Republicans", O: "Independents and others" };
export const partyShort: Record<Party, string> = { D: "Dem", R: "Rep", O: "Ind" };

/** Map fill. Called is the full party colour; a lead is only ever a tint of it. */
export function fillFor(r: StateResult | undefined): string {
  if (!r) return "var(--map-none)";
  if (r.status === "called" && r.party) return partyVar[r.party];
  if (r.status === "leading" && r.party) {
    const mix = Math.round(18 + 42 * Math.min(1, r.strength / 0.75));
    return `color-mix(in oklab, ${partyVar[r.party]} ${mix}%, var(--map-waiting))`;
  }
  if (r.status === "tied" || r.status === "runoff") return "url(#hatch)";
  return "var(--map-waiting)";
}
