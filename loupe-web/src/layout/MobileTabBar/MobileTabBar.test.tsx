import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { MobileTabBar } from "./MobileTabBar";

const mocks = vi.hoisted(() => ({
  usePublicFlags: vi.fn(),
}));

vi.mock("@loupe/core", () => ({
  usePublicFlags: mocks.usePublicFlags,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="path">{location.pathname}</output>;
}

function renderBar(flags: Record<string, boolean> | undefined = undefined) {
  mocks.usePublicFlags.mockReturnValue({ data: flags });
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <MobileTabBar />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MobileTabBar", () => {
  beforeEach(() => mocks.usePublicFlags.mockReset());

  it("shows two tabs either side of the raised scan button", () => {
    renderBar();
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const links = nav.querySelectorAll("a");
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveTextContent("Home");
    expect(links[1]).toHaveTextContent("Vault");
    expect(links[2]).toHaveTextContent("Markets");
    expect(links[3]).toHaveTextContent("Stats");
    expect(
      screen.getByRole("button", { name: /scan a card/i }),
    ).toBeInTheDocument();
  });

  it("hides flag-gated tabs when the flag is off and backfills the slot", () => {
    renderBar({ web_markets: false });
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const labels = [...nav.querySelectorAll("a")].map((a) => a.textContent);
    expect(labels).not.toContain("Markets");
    // The next flag-on item takes the freed slot, keeping 2+2 around the shutter.
    expect(labels).toEqual(["Home", "Vault", "Stats", "Watch"]);
  });

  it("treats missing flag data as flag-on (never an empty bar while loading)", () => {
    renderBar(undefined);
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav.querySelectorAll("a")).toHaveLength(4);
  });

  it("the center shutter navigates to the scanner", () => {
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /scan a card/i }));
    expect(screen.getByTestId("path")).toHaveTextContent("/scan");
  });
});
