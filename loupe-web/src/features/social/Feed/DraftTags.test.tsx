import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DraftTags } from "./DraftTags";

describe("DraftTags", () => {
  it("shows each typed #tag as a chip", () => {
    render(<DraftTags body="grail #charizard and #evolvingskies" />);
    const chip = screen.getByText("#charizard");
    expect(chip.tagName).toBe("SPAN");
    expect(chip.className).toMatch(/tag/);
    expect(screen.getByText("#evolvingskies")).toBeTruthy();
  });

  it("dedupes repeats and lowercases", () => {
    render(<DraftTags body="#Pokemon #pokemon #POKEMON" />);
    expect(screen.getAllByText("#pokemon")).toHaveLength(1);
  });

  it("renders nothing when there are no tags", () => {
    const { container } = render(<DraftTags body="just a normal caption" />);
    expect(container.querySelector("[aria-label='Tags in this post']")).toBeNull();
  });
});
