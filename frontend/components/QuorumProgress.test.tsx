import { render, screen } from "@testing-library/react";
import QuorumProgress from "./QuorumProgress";
import { describeVisual } from "@/test/visual";

// Issue #147: quorum progress. The number that matters is the one the contract
// compares in finalize() — For + Against + Abstain against quorum_required —
// so an abstention has to count towards turnout here too, or the bar would
// tell a reader a proposal is further from passing than it is.

const fillWidth = () =>
  (screen.getByRole("progressbar").firstElementChild as HTMLElement).style.width;

describe("QuorumProgress", () => {
  it("counts abstentions towards the total, as finalize() does", () => {
    // 200k for + 100k against + 100k abstain = 400k of a 500k quorum: short.
    render(<QuorumProgress forVotes={200000} againstVotes={100000} abstainVotes={100000} quorumRequired={500000} />);

    expect(fillWidth()).toBe("80%");
    expect(screen.getByText("100,000 short of quorum")).toBeInTheDocument();
  });

  it("reads as reached once the total clears the requirement", () => {
    render(<QuorumProgress forVotes={300000} againstVotes={100000} abstainVotes={100000} quorumRequired={500000} />);

    expect(screen.getByText("Quorum reached")).toBeInTheDocument();
    expect(screen.queryByText(/short of quorum/)).not.toBeInTheDocument();
  });

  it("treats exactly meeting the quorum as reached", () => {
    render(<QuorumProgress forVotes={500000} againstVotes={0} abstainVotes={0} quorumRequired={500000} />);

    expect(screen.getByText("Quorum reached")).toBeInTheDocument();
  });

  it("clamps an overshoot rather than overflowing the track", () => {
    render(<QuorumProgress forVotes={900000} againstVotes={0} abstainVotes={0} quorumRequired={500000} />);

    expect(fillWidth()).toBe("100%");
  });

  it("distinguishes the two states in words, not only in colour", () => {
    // The card's compact form leads with the percentage, the detail page's
    // with the shortfall; either way the state is spelled out.
    const { unmount } = render(
      <QuorumProgress forVotes={100000} againstVotes={0} abstainVotes={0} quorumRequired={500000} compact />,
    );
    expect(screen.getByText("20% of quorum")).toBeInTheDocument();
    unmount();

    const full = render(
      <QuorumProgress forVotes={100000} againstVotes={0} abstainVotes={0} quorumRequired={500000} />,
    );
    expect(screen.getByText("400,000 short of quorum")).toBeInTheDocument();
    expect(full.container.querySelector('[role="progressbar"]')).toHaveAttribute(
      "aria-valuetext",
      "400,000 short of quorum",
    );
    full.unmount();

    render(<QuorumProgress forVotes={500000} againstVotes={0} abstainVotes={0} quorumRequired={500000} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Quorum reached");
  });

  it("announces itself as a progress bar over the required weight", () => {
    render(<QuorumProgress forVotes={250000} againstVotes={0} abstainVotes={0} quorumRequired={500000} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-label", "Quorum");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "500000");
    expect(bar).toHaveAttribute("aria-valuenow", "250000");
  });

  it("shows a proposal with no votes as empty, not as zero percent of nothing", () => {
    render(<QuorumProgress forVotes={0} againstVotes={0} abstainVotes={0} quorumRequired={500000} />);

    expect(fillWidth()).toBe("0%");
    expect(screen.getByText("500,000 short of quorum")).toBeInTheDocument();
  });

  it("survives a zero quorum requirement instead of dividing by zero", () => {
    render(<QuorumProgress forVotes={0} againstVotes={0} abstainVotes={0} quorumRequired={0} />);

    expect(fillWidth()).toBe("100%");
    expect(screen.getByText("Quorum reached")).toBeInTheDocument();
  });

  it("shows the tallies alongside the bar in the full variant", () => {
    render(<QuorumProgress forVotes={250000} againstVotes={10000} abstainVotes={0} quorumRequired={500000} />);

    expect(screen.getByText("260,000 / 500,000 required")).toBeInTheDocument();
  });

  it("matches the visual baseline, reached and short", () => {
    const { container: short } = render(
      <QuorumProgress forVotes={200000} againstVotes={100000} abstainVotes={100000} quorumRequired={500000} />,
    );
    expect(describeVisual(short.firstChild)).toMatchSnapshot();

    const { container: reached } = render(
      <QuorumProgress forVotes={600000} againstVotes={100000} abstainVotes={0} quorumRequired={500000} />,
    );
    expect(describeVisual(reached.firstChild)).toMatchSnapshot();
  });
});
