import { describe, expect, it } from "vitest";
import { raceLine } from "./describe";
import type { Candidate, Race } from "./model";

const cand = (name: string, party: Candidate["party"], votes: number, winner = false): Candidate => ({
  name,
  party,
  partyName: party === "D" ? "Democratic" : "Republican",
  votes,
  percent: 0,
  winner,
  advanced: false,
  incumbent: false,
});

const race = (over: Partial<Race>): Race => ({
  key: "ga",
  state: "ga",
  label: "Georgia",
  electionId: 1,
  reporting: 34,
  totalVotes: 1000,
  candidates: [cand("Jon Ossoff", "D", 600), cand("Mike Collins", "R", 400)],
  status: "leading",
  party: "D",
  margin: 20,
  ...over,
});

describe("raceLine", () => {
  it("names the leader, the margin and the share counted", () => {
    expect(raceLine(race({}))).toBe("Ossoff (D) leads by 20.0 pts, 34% in");
  });

  it("says early count when votes exist but the API reports 0% expected", () => {
    expect(raceLine(race({ reporting: 0 }))).toBe("Ossoff (D) leads by 20.0 pts, early count");
  });

  it("names the winner only for a called race", () => {
    const r = race({ status: "called", candidates: [cand("Jon Ossoff", "D", 600, true), cand("Mike Collins", "R", 400)] });
    expect(raceLine(r)).toBe("Ossoff (D) wins");
  });

  it("is plain about races with no votes", () => {
    expect(raceLine(race({ status: "waiting", totalVotes: 0, reporting: 0, party: null }))).toBe("No votes counted yet");
  });
});
