import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PostMedia as PostMediaModel } from "@loupe/core";
import { PostMedia } from "./PostMedia";

/**
 * Two gestures share one target, and the rules that keep them apart are
 * the whole reason this component is worth testing:
 *
 *   single click → open the viewer, but only AFTER the double-click window
 *                  closes, or liking a photo also throws you full screen
 *   double click → like, and only ever LIKE, never un-like
 */
const photo = (id: string): PostMediaModel => ({
  id,
  url: `https://cdn.test/${id}.jpg`,
  position: 0,
  kind: "image",
  width: 1000,
  height: 1000,
});

const video = (id: string): PostMediaModel => ({
  ...photo(id),
  url: `https://cdn.test/${id}.mp4`,
  kind: "video",
});

function setup(props: Partial<Parameters<typeof PostMedia>[0]> = {}) {
  const onOpen = vi.fn();
  const onLike = vi.fn();
  render(
    <PostMedia media={[photo("a")]} onOpen={onOpen} onLike={onLike} {...props} />,
  );
  return { onOpen, onLike, image: screen.getAllByRole("presentation")[0]! };
}

describe("PostMedia gestures", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("opens the viewer on a single click — after the double-click window", () => {
    const { onOpen, image } = setup();

    fireEvent.click(image);
    // The bug this pins: firing immediately means the first half of every
    // double click also opens the viewer.
    expect(onOpen).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onOpen).toHaveBeenCalledWith(0);
  });

  it("likes on a double click and does NOT open the viewer", () => {
    const { onOpen, onLike, image } = setup();

    fireEvent.click(image);
    fireEvent.click(image);

    expect(onLike).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(400);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("never un-likes an already-liked post", () => {
    // A toggle would let an accidental repeat silently remove the like,
    // and the heart burst gives no clue which way it went.
    const { onLike, image } = setup({ liked: true });

    fireEvent.click(image);
    fireEvent.click(image);

    expect(onLike).not.toHaveBeenCalled();
  });

  it("still plays the burst when the post is already liked", () => {
    setup({ liked: true });
    const image = screen.getAllByRole("presentation")[0]!;
    fireEvent.click(image);
    fireEvent.click(image);
    // The heart is decorative and aria-hidden, so it's found by class,
    // not by role — the point is only that it mounted.
    expect(document.querySelector("svg[aria-hidden]")).toBeTruthy();
  });
});

describe("PostMedia video", () => {
  it("renders a playable player for kind=video, not a dead <img>", () => {
    // The white-box bug: a video URL inside <img> renders a blank frame
    // with nothing to click. kind comes from the server precisely so the
    // client never has to sniff the MIME type.
    render(<PostMedia media={[video("v")]} />);
    const player = document.querySelector("video");
    expect(player).toBeTruthy();
    expect(player!.getAttribute("src")).toBe("https://cdn.test/v.mp4");
    expect(player!.hasAttribute("controls")).toBe(true);
    // WKWebView (the app's community shell) fullscreens bare videos.
    expect(player!.hasAttribute("playsinline")).toBe(true);
    expect(document.querySelector("img")).toBeNull();
  });
});
