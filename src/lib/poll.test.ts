import { describe, expect, it } from "vitest";
import { dueIn } from "./poll";

describe("dueIn", () => {
  it("is due at once before the first poll", () => expect(dueIn(0, 1_000_000, 30_000)).toBe(0));
  it("waits out the rest of the interval after a recent poll", () => expect(dueIn(100_000, 106_000, 30_000)).toBe(24_000));
  it("is due once the interval has passed", () => expect(dueIn(100_000, 140_000, 30_000)).toBe(0));
});
