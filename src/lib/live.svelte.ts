import { POLL_MS, SUMMARY_IDS, type Chamber } from "./config";
import { newlyCalled, toRaces, type Race, type RawRace } from "./model";

export interface CalledItem {
  chamber: Chamber;
  race: Race;
  at: Date;
}

const CHAMBER_LIST: Chamber[] = ["senate", "house", "governor"];

/**
 * Polls the three summary races every POLL_MS while the tab is visible. A failed poll
 * keeps the last good data on screen and only changes the freshness line.
 */
class Live {
  races = $state<Record<Chamber, Race[] | null>>({ senate: null, house: null, governor: null });
  apiUpdated = $state<Record<Chamber, string | null>>({ senate: null, house: null, governor: null });
  closings = $state<Record<string, string>>({});
  called = $state<CalledItem[]>([]);
  lastOk = $state<number | null>(null);
  failing = $state(false);
  stale = $state(false);
  loading = $state(true);
  now = $state(Date.now());

  #timer: ReturnType<typeof setTimeout> | undefined;
  #inflight = false;

  start() {
    this.poll();
    this.loadClosings();
    setInterval(() => (this.now = Date.now()), 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.poll();
      else clearTimeout(this.#timer);
    });
  }

  async poll() {
    if (this.#inflight) return;
    this.#inflight = true;
    clearTimeout(this.#timer);
    try {
      let ok = 0;
      let stale = false;
      // Each chamber renders as soon as it lands: the House summary is much larger and slower.
      const results = await Promise.allSettled(
        CHAMBER_LIST.map(async (chamber) => {
          const res = await getJson<RawRace>(`/api/race/${SUMMARY_IDS[chamber]}`);
          const next = toRaces(res.body);
          const before = this.races[chamber];
          if (before) {
            const at = new Date();
            const fresh = newlyCalled(before, next).map((race) => ({ chamber, race, at }));
            if (fresh.length) this.called = [...fresh, ...this.called].slice(0, 30);
          }
          this.races[chamber] = next;
          this.apiUpdated[chamber] = res.body.last_updated ?? null;
          stale ||= res.stale;
          ok += 1;
          this.lastOk = Date.now();
          this.loading = false;
        }),
      );
      this.failing = ok < results.length;
      this.stale = stale;
    } finally {
      this.loading = false;
      this.#inflight = false;
      if (document.visibilityState === "visible") this.#timer = setTimeout(() => this.poll(), POLL_MS);
    }
  }

  async loadClosings() {
    const merged: Record<string, string> = {};
    for (const id of [SUMMARY_IDS.senate, SUMMARY_IDS.governor]) {
      try {
        const { body } = await getJson<Record<string, string>>(`/api/closings/${id}`);
        for (const [state, at] of Object.entries(body)) if (!merged[state] || at < merged[state]) merged[state] = at;
      } catch {
        // Closing times are a nicety; the map works without them.
      }
    }
    this.closings = merged;
  }
}

async function getJson<T>(path: string): Promise<{ body: T; stale: boolean }> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return { body: (await res.json()) as T, stale: res.headers.get("x-stale") === "1" };
}

export const live = new Live();
