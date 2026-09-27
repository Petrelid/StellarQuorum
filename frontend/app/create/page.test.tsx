import { fireEvent, render, screen } from "@testing-library/react";
import CreatePage from "./page";

describe("CreatePage review step", () => {
  it("reviews details and returns to editing without losing values", () => {
    render(<CreatePage />);
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Fund the SDK" } });
    fireEvent.change(screen.getByLabelText("Description *"), { target: { value: "Ship a documented SDK." } });
    fireEvent.click(screen.getByRole("button", { name: "Review proposal" }));
    expect(screen.getByRole("heading", { name: "Fund the SDK", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("5% of circulating QUORUM supply")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign and submit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit proposal" }));
    expect(screen.getByLabelText("Title *")).toHaveValue("Fund the SDK");
    expect(screen.getByLabelText("Description *")).toHaveValue("Ship a documented SDK.");
  });
});
