import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Delta } from "./Delta";

describe("<Delta />", () => {
  it("renders a positive change with a leading plus", () => {
    render(<Delta percent={3.42} />);
    expect(screen.getByText("+3.42%")).toBeInTheDocument();
  });

  it("renders a negative change with a real minus glyph", () => {
    render(<Delta percent={-1.1} />);
    expect(screen.getByText("−1.10%")).toBeInTheDocument();
  });

  it("shows an accompanying money delta when provided", () => {
    render(<Delta percent={5} money={{ amount: 12.5, currency: "USD" }} />);
    expect(screen.getByText("+$12.50")).toBeInTheDocument();
    expect(screen.getByText("+5.00%")).toBeInTheDocument();
  });
});
