import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PriceAlert } from "@loupe/core";
import { NotificationsBell } from "./NotificationsBell";

const mocks = vi.hoisted(() => ({
  useAlerts: vi.fn(),
}));

vi.mock("@loupe/core", () => ({
  useAlerts: mocks.useAlerts,
}));

const SEEN_KEY = "loupe.alerts.seen";

function alert(over: Partial<PriceAlert>): PriceAlert {
  return {
    id: "a1",
    cardId: "pokemontcg:sv3-125",
    condition: "above",
    thresholdUsd: 100,
    note: null,
    createdAt: "2026-06-01T00:00:00Z",
    triggeredAt: null,
    triggeredPriceUsd: null,
    cardName: "Charizard ex",
    cardImageUrl: null,
    ...over,
  };
}

function renderBell(alerts: PriceAlert[]) {
  mocks.useAlerts.mockReturnValue({ data: alerts });
  return render(
    <MemoryRouter>
      <NotificationsBell />
    </MemoryRouter>,
  );
}

/** The unread dot is an aria-hidden span inside the trigger. */
function dot() {
  return screen
    .getByRole("button", { name: /alerts/i })
    .querySelector("span[aria-hidden]");
}

describe("NotificationsBell", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useAlerts.mockReset();
  });

  it("shows the unread dot for an alert fired since last seen", () => {
    localStorage.setItem(SEEN_KEY, String(Date.parse("2026-06-01T00:00:00Z")));
    renderBell([
      alert({ triggeredAt: "2026-06-02T00:00:00Z", triggeredPriceUsd: 120 }),
    ]);
    expect(dot()).not.toBeNull();
  });

  it("shows no dot when every fired alert predates last seen", () => {
    localStorage.setItem(SEEN_KEY, String(Date.parse("2026-06-03T00:00:00Z")));
    renderBell([
      alert({ triggeredAt: "2026-06-02T00:00:00Z", triggeredPriceUsd: 120 }),
    ]);
    expect(dot()).toBeNull();
  });

  it("pending (unfired) alerts never light the dot", () => {
    renderBell([alert({ triggeredAt: null })]);
    expect(dot()).toBeNull();
  });

  it("opening the bell marks everything seen and clears the dot", () => {
    renderBell([
      alert({ triggeredAt: "2026-06-02T00:00:00Z", triggeredPriceUsd: 120 }),
    ]);
    expect(dot()).not.toBeNull();

    const trigger = screen.getByRole("button", { name: /alerts/i });
    // Radix ignores jsdom's synthetic pointer events — open via keyboard.
    // (While the menu is open Radix aria-hides the trigger, so assert on the
    // captured node rather than re-querying by role.)
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(trigger.querySelector("span[aria-hidden]")).toBeNull();
    expect(Number(localStorage.getItem(SEEN_KEY))).toBeGreaterThan(
      Date.parse("2026-06-02T00:00:00Z"),
    );
  });
});
