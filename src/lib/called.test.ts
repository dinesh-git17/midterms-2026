import { describe, expect, it } from "vitest";
import { mergeCalled, type CalledItem } from "./called";
import type { Race } from "./model";

const item = (chamber: CalledItem["chamber"], key: string, at: number): CalledItem => ({
  chamber,
  race: { key, state: key.slice(0, 2) } as Race,
  at: new Date(at),
});

describe("mergeCalled", () => {
  it("puts new calls first", () => {
    const out = mergeCalled([item("senate", "ga", 1)], [item("senate", "mi", 2)]);
    expect(out.map((c) => c.race.key)).toEqual(["mi", "ga"]);
  });

  it("replaces a race that was called again instead of listing it twice", () => {
    const out = mergeCalled([item("senate", "ga", 1), item("senate", "mi", 1)], [item("senate", "ga", 2)]);
    expect(out.map((c) => [c.race.key, c.at.getTime()])).toEqual([["ga", 2], ["mi", 1]]);
  });

  it("keeps the same state in another chamber", () => {
    const out = mergeCalled([item("governor", "ga", 1)], [item("senate", "ga", 2)]);
    expect(out).toHaveLength(2);
  });

  it("keeps at most 30", () => {
    const prev = Array.from({ length: 30 }, (_, i) => item("house", `tx-${i}`, 1));
    expect(mergeCalled(prev, [item("senate", "ga", 2)])).toHaveLength(30);
  });
});
