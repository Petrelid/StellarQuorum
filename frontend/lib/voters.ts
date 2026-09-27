import type { Vote } from "./types";

/**
 * Voters shown before the list has to be paged. Ten rows is a screenful of the
 * detail page; past that a proposal with a few hundred voters would push the
 * vote button out of reach and send a large payload with it.
 */
export const VOTERS_PER_PAGE = 10;

const LEAD = 4;
const TAIL = 4;

/**
 * `GABC...3XZK` — the form every address in the fixture already takes, so a
 * table never mixes two truncation styles.
 *
 * A value no longer than the result is returned untouched. That is what keeps
 * the fixture's already-shortened addresses intact, and it is also the honest
 * answer for a short id: truncating "CCAB" to "CCAB" would be noise.
 */
export function truncateAddress(address: string, lead = LEAD, tail = TAIL): string {
  if (address.length <= lead + tail + 3) return address;
  return `${address.slice(0, lead)}...${address.slice(-tail)}`;
}

/**
 * The page of a vote list a reader can reach by pressing "show more" `page`
 * times, clamped to the number of pages that exist. Clamping matters because
 * a vote that lands between renders can shrink the list out from under the
 * control.
 */
export function visibleVotes(votes: readonly Vote[], page: number, perPage = VOTERS_PER_PAGE): Vote[] {
  const pages = Math.max(1, Math.ceil(votes.length / perPage));
  const safePage = Math.min(Math.max(1, Math.floor(page)), pages);
  return votes.slice(0, safePage * perPage);
}

/** How many voters are still hidden behind the "show more" control. */
export function hiddenCount(votes: readonly Vote[], shown: number): number {
  return Math.max(0, votes.length - shown);
}
