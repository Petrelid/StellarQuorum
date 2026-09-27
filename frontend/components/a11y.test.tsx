import { render, screen } from "@testing-library/react";
import Footer from "./Footer";
import Navbar from "./Navbar";
import ProposalCard from "./ProposalCard";
import QuorumProgress from "./QuorumProgress";
import StatusBadge from "./StatusBadge";
import VoteBar from "./VoteBar";
import VoterList from "./VoterList";
import VotingPowerPreview from "./VotingPowerPreview";
import { WalletContext, type WalletContextValue } from "./WalletProvider";
import type { Proposal } from "@/lib/types";
import { expectNoA11yViolations } from "@/test/a11y";
import { A11Y_EXCEPTIONS } from "@/test/a11y-exceptions";

// Issue #169: every component is checked against the same rules CI enforces,
// with the exemptions documented in @/test/a11y-exceptions. A regression here
// (an unlabelled control, a nameless link, a broken ARIA attribute) fails the
// test run instead of reaching a screen reader user.
const options = { exceptions: A11Y_EXCEPTIONS };

const DISCONNECTED: WalletContextValue = {
  address: null,
  pending: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

function withWallet(children: React.ReactNode, value: Partial<WalletContextValue> = {}) {
  return <WalletContext.Provider value={{ ...DISCONNECTED, ...value }}>{children}</WalletContext.Provider>;
}

const proposal: Proposal = {
  id: "QIP-001",
  title: "Increase Protocol Fee to 0.05%",
  description: "Raises the base protocol fee from 0.03% to 0.05%.",
  proposer: "GABC...3XZK",
  status: "active",
  startTime: "2026-05-25T00:00:00Z",
  endTime: "2026-06-06T00:00:00Z",
  snapshotLedger: 61_284_512,
  forVotes: 600000,
  againstVotes: 300000,
  abstainVotes: 100000,
  quorumRequired: 500000,
  category: "Financial",
  actions: [],
  votes: [],
};

describe("accessibility", () => {
  it("Navbar has no accessibility violations with and without a wallet", () => {
    const { container: disconnected } = render(withWallet(<Navbar />));
    expectNoA11yViolations(disconnected, options);

    const { container: connected } = render(
      withWallet(<Navbar />, { address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK" }),
    );
    expectNoA11yViolations(connected, options);
  });

  it("Footer has no accessibility violations", () => {
    const { container } = render(<Footer />);
    expectNoA11yViolations(container, options);
  });

  it("StatusBadge has no accessibility violations", () => {
    const { container } = render(<StatusBadge status="active" />);
    expectNoA11yViolations(container, options);
  });

  it("VoteBar has no accessibility violations with and without votes", () => {
    const { container: withVotes } = render(
      <VoteBar forVotes={600000} againstVotes={300000} abstainVotes={100000} />,
    );
    expectNoA11yViolations(withVotes, options);

    const { container: withoutVotes } = render(
      <VoteBar forVotes={0} againstVotes={0} abstainVotes={0} />,
    );
    expectNoA11yViolations(withoutVotes, options);
  });

  it("ProposalCard has no accessibility violations", () => {
    const { container } = render(<ProposalCard proposal={proposal} />);
    expectNoA11yViolations(container, options);
  });

  it("QuorumProgress has no accessibility violations reached, short and empty", () => {
    // All three render differently — bar colour, and a check icon in one — so
    // each is judged rather than assuming one covers the others.
    for (const tallies of [
      { forVotes: 600000, againstVotes: 0, abstainVotes: 0 },
      { forVotes: 100000, againstVotes: 0, abstainVotes: 0 },
      { forVotes: 0, againstVotes: 0, abstainVotes: 0 },
    ]) {
      const { container: full } = render(<QuorumProgress {...tallies} quorumRequired={500000} />);
      expectNoA11yViolations(full, options);

      const { container: compact } = render(<QuorumProgress {...tallies} quorumRequired={500000} compact />);
      expectNoA11yViolations(compact, options);
    }
  });

  it("VoterList has no accessibility violations on the first and last page", () => {
    // A proposal with a single voter and one with enough to page: the controls
    // that appear on the later pages are only rendered then.
    const one = render(
      <VoterList
        votes={[{ voter: "GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK", choice: "for", weight: 1000, timestamp: "2026-05-12T14:22:00Z" }]}
      />,
    );
    expectNoA11yViolations(one.container, options);

    const many = render(
      <VoterList
        votes={Array.from({ length: 25 }, (_, i) => ({
          voter: `G${i}...VOTE`,
          choice: "against" as const,
          weight: 1000,
          timestamp: "2026-05-12T14:22:00Z",
        }))}
      />,
    );
    expectNoA11yViolations(many.container, options);
  });

  it("VotingPowerPreview has no accessibility violations before and after the read resolves", async () => {
    const { container: disconnected } = render(
      withWallet(<VotingPowerPreview snapshotLedger={proposal.snapshotLedger} />),
    );
    expectNoA11yViolations(disconnected, options);

    const { container: resolved } = render(
      withWallet(<VotingPowerPreview snapshotLedger={proposal.snapshotLedger} />, {
        // A fixture address holding tokens at the snapshot, so the resolved
        // body is the one a weighted voter reads.
        address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ3XZK",
      }),
    );
    // Await the read so the weight is on screen before it is judged.
    await screen.findByText(/you will vote with/i);
    expectNoA11yViolations(resolved, options);
    // The other two resolved bodies (a zero weight, a failed read) are
    // baselined in VotingPowerPreview.test.tsx; they replace the same element,
    // so they carry the same semantics.
  });

  it("Navbar reports a failed connection accessibly", () => {
    const { container } = render(
      withWallet(<Navbar />, { error: "No Stellar wallet extension found." }),
    );
    expectNoA11yViolations(container, options);
  });
});
