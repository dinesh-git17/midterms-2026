import type { Chamber } from "./config";

const CHAMBERS: Chamber[] = ["senate", "house", "governor"];

/** The view lives in the hash (#senate/ga) so links open a state and Back closes it. */
class Route {
  chamber = $state<Chamber>("senate");
  state = $state<string | null>(null);
  #pushed = false;

  constructor() {
    this.read();
    window.addEventListener("hashchange", () => this.read());
  }

  read() {
    if (!location.hash.includes("/")) this.#pushed = false;
    const [c, s] = location.hash.replace(/^#\/?/, "").toLowerCase().split("/");
    this.chamber = CHAMBERS.includes(c as Chamber) ? (c as Chamber) : "senate";
    this.state = s && /^[a-z]{2}$/.test(s) ? s : null;
  }

  go(chamber: Chamber, state: string | null = null) {
    const next = `#${chamber}${state ? `/${state}` : ""}`;
    if (location.hash === next) return;
    // Opening a state pushes history so Back closes it; switching chambers replaces.
    if (state && !this.state) {
      history.pushState(null, "", next);
      this.#pushed = true;
    } else history.replaceState(null, "", next);
    this.read();
  }

  close() {
    if (!this.state) return;
    // Only step back through history we added; a shared link opened directly has none.
    if (this.#pushed) {
      this.#pushed = false;
      history.back();
    } else this.go(this.chamber, null);
  }
}

export const route = new Route();
