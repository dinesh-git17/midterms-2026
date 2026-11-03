import { describe, expect, it } from "vitest";
import { byState, districtLabel, newlyCalled, partyOf, secured, tally, toRace, type RawRegion } from "./model";

const region = (cands: [string, string, number, boolean?][], reporting = 50, id = 1): RawRegion => ({
  name: "x",
  type: "State",
  election_id: id,
  percent_reporting: reporting,
  candidates: cands.map(([name, party, votes, winner]) => ({
    name,
    party,
    votes,
    percent: 0,
    winner: Boolean(winner),
    advanced: false,
    incumbent: false,
  })),
});

describe("toRace", () => {
  it("waits when no votes are in", () => {
    const r = toRace("ga", region([["A", "Democratic", 0], ["B", "Republican", 0]], 0));
    expect(r.status).toBe("waiting");
    expect(r.party).toBeNull();
  });

  it("marks the leader and the margin from votes, not the API's percent", () => {
    const r = toRace("ga", region([["A", "Democratic", 600], ["B", "Republican", 400]]));
    expect(r.status).toBe("leading");
    expect(r.party).toBe("D");
    expect(r.margin).toBeCloseTo(20);
    expect(r.candidates[0].percent + r.candidates[1].percent).toBeCloseTo(100);
  });

  it("only calls a race when the API says winner", () => {
    const r = toRace("ga", region([["A", "Democratic", 100], ["B", "Republican", 900, true]]));
    expect(r.status).toBe("called");
    expect(r.party).toBe("R");
  });

  it("treats an exact tie as tied", () => {
    expect(toRace("ga", region([["A", "Democratic", 5], ["B", "Republican", 5]])).status).toBe("tied");
  });
});

describe("tally", () => {
  it("adds holdovers to called seats and keeps leads apart", () => {
    const races = [
      toRace("ga", region([["A", "Democratic", 1, true]])),
      toRace("tx", region([["B", "Republican", 9], ["C", "Democratic", 1]])),
      toRace("me", region([["D", "Republican", 0]], 0)),
    ];
    const t = tally("senate", races);
    expect(secured(t, "D")).toBe(35);
    expect(secured(t, "R")).toBe(31);
    expect(t.leading.R).toBe(1);
    expect(t.uncalled).toBe(2);
  });

  it("covers the whole Senate: 65 holdovers plus 35 races is 100", () => {
    const t = tally("senate", []);
    expect(t.holdover.D + t.holdover.R + 35).toBe(100);
    expect(tally("governor", []).holdover.D + tally("governor", []).holdover.R + 36).toBe(50);
  });
});

describe("byState", () => {
  it("rolls House districts up into a state with seat counts", () => {
    const races = [
      toRace("nh-01", region([["A", "Democratic", 1, true]])),
      toRace("nh-02", region([["B", "Republican", 5], ["C", "Democratic", 3]])),
    ];
    const nh = byState("house", races).get("nh")!;
    expect(nh.seats?.called.D).toBe(1);
    expect(nh.seats?.leading.R).toBe(1);
    expect(nh.status).toBe("tied");
  });
});

describe("helpers", () => {
  it("maps party names", () => {
    expect(partyOf("Democratic")).toBe("D");
    expect(partyOf("Republican")).toBe("R");
    expect(partyOf("Independent")).toBe("O");
  });

  it("labels districts", () => {
    expect(districtLabel("tx-28")).toBe("Texas 28");
    expect(districtLabel("ak-al")).toBe("Alaska at-large");
  });

  it("finds races that were called since the last poll", () => {
    const before = [toRace("ga", region([["A", "Democratic", 5], ["B", "Republican", 3]]))];
    const after = [toRace("ga", region([["A", "Democratic", 5, true], ["B", "Republican", 3]]))];
    expect(newlyCalled(before, after).map((r) => r.key)).toEqual(["ga"]);
    expect(newlyCalled(after, after)).toEqual([]);
  });
});
