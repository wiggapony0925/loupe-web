import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PostCaption } from "./PostCaption";

/**
 * The rules under test:
 *
 * 1. A `#tag` always READS as a tag — it wears the chip whether or not the
 *    server indexed it, because a hashtag that renders as plain grey text
 *    doesn't look like the tag the author clearly typed.
 * 2. But a word is only LINKED when the server says it resolves: only an
 *    indexed tag gets a page link, and only a resolved @handle gets a
 *    profile link. Linking everything the regex finds produces tag pages
 *    with nothing on them, profiles that don't exist, and — worst — turns
 *    an email address in a caption into a broken mention.
 */
function renderCaption(props: Parameters<typeof PostCaption>[0]) {
  return render(
    <MemoryRouter>
      <PostCaption {...props} />
    </MemoryRouter>,
  );
}

describe("PostCaption", () => {
  it("links a hashtag the server indexed", () => {
    renderCaption({ body: "grail #charizard", hashtags: ["charizard"], mentions: [] });
    expect(screen.getByText("#charizard").closest("a")).toHaveAttribute(
      "href",
      "/app/community/tag/charizard",
    );
  });

  it("still shows a tag chip when the server did NOT index it, but not a link", () => {
    renderCaption({ body: "grail #charizard", hashtags: [], mentions: [] });
    // No page link (the tag didn't earn a page)…
    expect(screen.queryByRole("link", { name: "#charizard" })).toBeNull();
    // …but it's still a chip, not bare text — so it reads as a tag.
    const chip = screen.getByText("#charizard");
    expect(chip.tagName).toBe("SPAN");
    expect(chip.className).toMatch(/tag/);
  });

  it("links a mention that resolves to a real account", () => {
    renderCaption({ body: "ta @mistyx", hashtags: [], mentions: ["mistyx"] });
    expect(screen.getByText("@mistyx").closest("a")).toHaveAttribute(
      "href",
      "/app/u/mistyx",
    );
  });

  it("does not turn an email address into a mention", () => {
    const { container } = renderCaption({
      body: "mail me at a@b.com",
      hashtags: [],
      mentions: [],
    });
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("matches a mention even when the sentence puts a full stop on it", () => {
    // The server trims trailing dots when it resolves; the renderer trims
    // the same way, or the highlight and the index disagree.
    renderCaption({ body: "thanks @ash.", hashtags: [], mentions: ["ash"] });
    expect(screen.getByText("@ash.").closest("a")).toHaveAttribute(
      "href",
      "/app/u/ash",
    );
  });
});
