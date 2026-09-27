import { truncateAddress, visibleVotes, hiddenCount, VOTERS_PER_PAGE } from "./voters";
import type { Vote } from "./types";

const vote = (overrides: Partial<Vote> = {}): Vote => ({
  voter: "GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK",
  choice: "for",
  weight: 1000,
  timestamp: "2026-05-12T14:22:00Z",
  ...overrides,
});

describe("truncateAddress", () => {
  it("shortens a full address to the form the fixture already uses", () => {
    expect(truncateAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK")).toBe("GABC...3XZK");
  });

  it("leaves a value that is already short alone", () => {
    // The fixture's addresses arrive pre-shortened; re-truncating them would
    // produce nonsense like "GABC...XZK" of a value that was never longer.
    expect(truncateAddress("GABC...3XZK")).toBe("GABC...3XZK");
    expect(truncateAddress("CCAB")).toBe("CCAB");
  });

  it("never returns more than it was given", () => {
    for (const value of ["", "G", "GABC...3XZK", "GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK"]) {
      const shortened = truncateAddress(value);
      expect(shortened.length).toBeLessThanOrEqual(Math.max(value.length, 11));
      if (value.length > 11) {
        expect(value.startsWith(shortened.slice(0, 4))).toBe(true);
        expect(value.endsWith(shortened.slice(-4))).toBe(true);
      }
    }
  });
});

describe("visibleVotes", () => {
  const votes = Array.from({ length: 25 }, (_, i) => vote({ voter: `G${i}` }));

  it("caps the first page", () => {
    expect(visibleVotes(votes, 1)).toHaveLength(VOTERS_PER_PAGE);
  });

  it("reveals one more page at a time", () => {
    expect(visibleVotes(votes, 2)).toHaveLength(2 * VOTERS_PER_PAGE);
    expect(visibleVotes(votes, 3)).toHaveLength(25);
  });

  it("clamps a page past the end rather than showing nothing", () => {
    // A vote can land between renders and shrink the list, and a caller can
    // ask for a page that no longer exists.
    expect(visibleVotes(votes, 99)).toHaveLength(25);
    expect(visibleVotes(votes, 0)).toHaveLength(VOTERS_PER_PAGE);
    expect(visibleVotes(votes, -3)).toHaveLength(VOTERS_PER_PAGE);
  });

  it("handles an empty list", () => {
    expect(visibleVotes([], 1)).toEqual([]);
  });
});

describe("hiddenCount", () => {
  it("counts what is still behind the control", () => {
    const votes = Array.from({ length: 25 }, () => vote());

    expect(hiddenCount(votes, VOTERS_PER_PAGE)).toBe(15);
    expect(hiddenCount(votes, 25)).toBe(0);
    // A list that shrank underneath must not report a negative remainder.
    expect(hiddenCount(votes, 30)).toBe(0);
  });
});
