import type { Chamber } from "./config";
import type { Race } from "./model";

export interface CalledItem {
  chamber: Chamber;
  race: Race;
  at: Date;
}

/**
 * Newest calls first, at most 30. A call civicAPI withdrew and then made again replaces its
 * old entry rather than repeating it (a repeated key would also break the keyed feed list).
 */
export function mergeCalled(prev: CalledItem[], fresh: CalledItem[]): CalledItem[] {
  const again = new Set(fresh.map((f) => f.chamber + f.race.key));
  return [...fresh, ...prev.filter((c) => !again.has(c.chamber + c.race.key))].slice(0, 30);
}
