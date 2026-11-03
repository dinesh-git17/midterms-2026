import { CHAMBERS, HOLDOVERS, STATES, type Chamber } from "./config";

export type Party = "D" | "R" | "O";
export type Status = "called" | "runoff" | "leading" | "tied" | "waiting";

export interface Candidate {
  name: string;
  party: Party;
  partyName: string;
  votes: number;
  percent: number;
  winner: boolean;
  advanced: boolean;
  incumbent: boolean;
}

export interface Race {
  key: string; // "ga" for a state race, "tx-28" for a House district
  state: string;
  label: string;
  electionId: number;
  reporting: number;
  totalVotes: number;
  candidates: Candidate[];
  status: Status;
  /** The winner's party when called, the leader's while counting, null otherwise. */
  party: Party | null;
  /** Leader's share minus the runner-up's, in percentage points. */
  margin: number;
}

export interface Tally {
  holdover: Record<Party, number>;
  called: Record<Party, number>;
  leading: Record<Party, number>;
  uncalled: number;
  total: number;
  majority: number;
}

export interface StateResult {
  state: string;
  name: string;
  races: Race[];
  status: Status;
  party: Party | null;
  /** 0 to 1. How firmly the state leans to `party`, used for the map tint. */
  strength: number;
  reporting: number;
  /** House only: seats by party. */
  seats?: { called: Record<Party, number>; leading: Record<Party, number>; total: number };
}

// Raw shapes from the Worker (already trimmed).
export interface RawCandidate {
  name: string;
  party: string;
  votes: number;
  percent: number;
  winner: boolean;
  advanced: boolean;
  incumbent: boolean;
}
export interface RawRegion {
  name: string;
  type: string;
  election_id: number;
  percent_reporting: number;
  candidates: RawCandidate[];
}
export interface RawRace {
  election_name: string;
  percent_reporting: number;
  polls_close: string | null;
  last_updated: string;
  candidates: RawCandidate[];
  region_results: Record<string, RawRegion>;
}

export function partyOf(name: string): Party {
  const p = name.toLowerCase();
  if (p.startsWith("democrat")) return "D";
  if (p.startsWith("republican")) return "R";
  return "O";
}

const empty = (): Record<Party, number> => ({ D: 0, R: 0, O: 0 });

export function toRace(key: string, region: RawRegion): Race {
  const candidates: Candidate[] = (region.candidates ?? [])
    .map((c) => ({
      name: c.name.replace(/\s+/g, " ").trim(),
      party: partyOf(c.party),
      partyName: c.party,
      votes: c.votes ?? 0,
      percent: c.percent ?? 0,
      winner: c.winner,
      advanced: c.advanced,
      incumbent: c.incumbent,
    }))
    .sort((a, b) => b.votes - a.votes || Number(b.incumbent) - Number(a.incumbent));

  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  for (const c of candidates) c.percent = totalVotes ? (c.votes / totalVotes) * 100 : 0;

  const winner = candidates.find((c) => c.winner);
  const [first, second] = candidates;
  const margin = first && second ? first.percent - second.percent : first ? first.percent : 0;

  let status: Status;
  let party: Party | null = null;
  if (winner) {
    status = "called";
    party = winner.party;
  } else if (candidates.some((c) => c.advanced)) {
    status = "runoff";
  } else if (totalVotes === 0) {
    status = "waiting";
  } else if (second && first.votes === second.votes) {
    status = "tied";
  } else {
    status = "leading";
    party = first.party;
  }

  const state = key.slice(0, 2);
  return {
    key,
    state,
    label: key.includes("-") ? districtLabel(key) : (STATES[state]?.name ?? region.name),
    electionId: region.election_id,
    reporting: region.percent_reporting ?? 0,
    totalVotes,
    candidates,
    status,
    party,
    margin,
  };
}

export function districtLabel(key: string): string {
  const [state, district] = key.split("-");
  const name = STATES[state]?.name ?? state.toUpperCase();
  if (district === "al") return `${name} at-large`;
  return `${name} ${String(Number(district))}`;
}

export function toRaces(raw: RawRace): Race[] {
  return Object.entries(raw.region_results ?? {}).map(([key, region]) => toRace(key, region));
}

export function tally(chamber: Chamber, races: Race[]): Tally {
  const called = empty();
  const leading = empty();
  let uncalled = 0;
  for (const r of races) {
    if (r.status === "called" && r.party) called[r.party] += 1;
    else {
      uncalled += 1;
      if (r.status === "leading" && r.party) leading[r.party] += 1;
    }
  }
  const holdover = { ...empty(), ...HOLDOVERS[chamber] };
  return { holdover, called, leading, uncalled, total: CHAMBERS[chamber].total, majority: CHAMBERS[chamber].majority };
}

/** Seats a party has for certain: not up this year plus called tonight. */
export const secured = (t: Tally, p: Party) => t.holdover[p] + t.called[p];

/** Groups races by state and decides each state's map colour. */
export function byState(chamber: Chamber, races: Race[]): Map<string, StateResult> {
  const groups = new Map<string, Race[]>();
  for (const r of races) groups.set(r.state, [...(groups.get(r.state) ?? []), r]);

  const out = new Map<string, StateResult>();
  for (const [state, list] of groups) {
    list.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
    const name = STATES[state]?.name ?? state.toUpperCase();
    const reporting = list.reduce((s, r) => s + r.reporting, 0) / list.length;

    if (chamber !== "house" && list.length === 1) {
      const r = list[0];
      out.set(state, { state, name, races: list, status: r.status, party: r.party, strength: leanStrength(r), reporting });
      continue;
    }

    // Several races in one state: House delegations, or a Senate special alongside a regular seat.
    const called = empty();
    const leading = empty();
    for (const r of list) {
      if (r.status === "called" && r.party) called[r.party] += 1;
      else if (r.status === "leading" && r.party) leading[r.party] += 1;
    }
    const total = list.length;
    const ahead = (["D", "R", "O"] as Party[])
      .map((p) => ({ p, n: called[p] + leading[p] }))
      .sort((a, b) => b.n - a.n);
    const allCalled = called.D + called.R + called.O === total;
    let status: Status = "waiting";
    let party: Party | null = null;
    let strength = 0;
    if (ahead[0].n > 0 && ahead[0].n === ahead[1].n) status = "tied";
    else if (ahead[0].n > 0) {
      party = ahead[0].p;
      status = allCalled ? "called" : "leading";
      strength = (ahead[0].n - ahead[1].n) / total;
    } else if (list.some((r) => r.status === "runoff")) status = "runoff";
    out.set(state, {
      state,
      name,
      races: list,
      status,
      party,
      strength: allCalled ? 1 : Math.min(1, strength),
      reporting,
      seats: { called, leading, total },
    });
  }
  return out;
}

/** 0.25 to 1 while counting: wider margins and more of the count in read as firmer. */
function leanStrength(r: Race): number {
  if (r.status === "called") return 1;
  if (r.status !== "leading") return 0;
  const byMargin = Math.min(1, r.margin / 20);
  const byCount = Math.min(1, r.reporting / 100);
  return 0.25 + 0.5 * byMargin * (0.4 + 0.6 * byCount);
}

/** Races that became called between two polls, for the "Just called" feed. */
export function newlyCalled(before: Race[], after: Race[]): Race[] {
  const was = new Map(before.map((r) => [r.key, r.status]));
  return after.filter((r) => r.status === "called" && was.has(r.key) && was.get(r.key) !== "called");
}

export const fmt = {
  votes: (n: number) => n.toLocaleString("en-US"),
  pct: (n: number, digits = 1) => `${n.toFixed(digits)}%`,
  reporting: (n: number) => (n >= 99.5 && n < 100 ? ">99%" : n > 0 && n < 1 ? "<1%" : `${Math.round(n)}%`),
};
