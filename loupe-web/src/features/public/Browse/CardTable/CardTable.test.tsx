import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CardSummary } from "@loupe/core";
import { CardTable } from "./CardTable";

const usd = (amount: number) => ({ amount, currency: "USD" as const });

const cards: CardSummary[] = [
  { id: "a", name: "Charizard", setName: "Base", number: "4", rarity: "Rare", imageUrl: "", price: usd(100) },
  { id: "b", name: "Abra", setName: "Base", number: "43", rarity: "Common", imageUrl: "", price: usd(2) },
  { id: "c", name: "Blastoise", setName: "Base", number: "2", rarity: "Rare", imageUrl: "", price: usd(50) },
];

/** Data rows (skip the header row). */
function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("CardTable", () => {
  it("defaults to sorting by collector number ascending", () => {
    render(<CardTable cards={cards} onOpen={() => {}} />);
    const rows = bodyRows();
    expect(rows[0]).toHaveTextContent("Blastoise"); // #2
    expect(rows[1]).toHaveTextContent("Charizard"); // #4
    expect(rows[2]).toHaveTextContent("Abra"); // #43
  });

  it("sorts by market price (desc) when that header is clicked", () => {
    render(<CardTable cards={cards} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /sort by market price/i }));
    const rows = bodyRows();
    expect(rows[0]).toHaveTextContent("Charizard"); // $100
    expect(rows[1]).toHaveTextContent("Blastoise"); // $50
    expect(rows[2]).toHaveTextContent("Abra"); // $2
  });

  it("toggles sort direction on a second click of the same header", () => {
    render(<CardTable cards={cards} onOpen={() => {}} />);
    const nameHeader = screen.getByRole("button", { name: /sort by product name/i });
    fireEvent.click(nameHeader); // name asc
    expect(bodyRows()[0]).toHaveTextContent("Abra");
    fireEvent.click(nameHeader); // name desc
    expect(bodyRows()[0]).toHaveTextContent("Charizard");
  });

  it("filters rows with the search box (name, number, or rarity)", () => {
    render(<CardTable cards={cards} onOpen={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "abra" } });
    const rows = bodyRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Abra");
  });

  it("opens a card when its row is clicked", () => {
    const onOpen = vi.fn();
    render(<CardTable cards={cards} onOpen={onOpen} />);
    fireEvent.click(screen.getByText("Blastoise"));
    expect(onOpen).toHaveBeenCalledWith("c");
  });
});
