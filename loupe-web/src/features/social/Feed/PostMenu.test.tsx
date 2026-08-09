import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Post } from "@loupe/core";
import { PostMenu } from "./PostMenu";

/**
 * What the ⋯ menu offers is the SERVER's decision, carried on `canEdit` /
 * `canDelete`. The case that matters is staff: a moderator may remove a
 * post but must never rewrite one under someone else's byline, and
 * re-deriving that rule per client is how one client gets it wrong.
 */
function post(over: Partial<Post> = {}): Post {
  return {
    id: "p1",
    author: {
      userId: "u1",
      username: "ash",
      displayName: null,
      avatarUrl: null,
      isPro: false,
      isAdmin: false,
      relationship: "none",
    },
    body: "hi",
    media: [],
    card: null,
    createdAt: new Date().toISOString(),
    editedAt: null,
    likeCount: 0,
    commentCount: 0,
    viewerHasLiked: false,
    hashtags: [],
    mentions: [],
    canDelete: false,
    canEdit: false,
    ...over,
  };
}

function open(p: Post, onReport?: (post: Post) => void) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PostMenu post={p} onEdit={vi.fn()} onReport={onReport} />
    </QueryClientProvider>,
  );
  const trigger = screen.queryByRole("button", { name: "Post options" });
  if (trigger) fireEvent.click(trigger);
  return trigger;
}

describe("PostMenu", () => {
  it("offers edit and delete on your own post", () => {
    open(
      post({
        canEdit: true,
        canDelete: true,
        author: { ...post().author, relationship: "self" },
      }),
    );
    expect(screen.getByText("Edit caption")).toBeInTheDocument();
    expect(screen.getByText("Delete post")).toBeInTheDocument();
    // Reporting your own post is noise in the moderation queue.
    expect(screen.queryByText("Report post")).not.toBeInTheDocument();
  });

  it("lets staff delete but NOT edit someone else's post", () => {
    open(post({ canEdit: false, canDelete: true }), vi.fn());
    expect(screen.queryByText("Edit caption")).not.toBeInTheDocument();
    expect(screen.getByText("Delete post")).toBeInTheDocument();
    expect(screen.getByText("Report post")).toBeInTheDocument();
  });

  it("offers only report on a stranger's post", () => {
    open(post(), vi.fn());
    expect(screen.getByText("Report post")).toBeInTheDocument();
    expect(screen.queryByText("Edit caption")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete post")).not.toBeInTheDocument();
  });

  it("renders no trigger at all when there is nothing to offer", () => {
    // An options button that opens an empty menu is worse than no button.
    expect(open(post())).toBeNull();
  });

  it("asks twice before deleting", () => {
    open(post({ canDelete: true, canEdit: true }), vi.fn());
    fireEvent.click(screen.getByText("Delete post"));
    // Irreversible, and it takes other people's replies with it.
    expect(
      screen.getByText("Delete this post and its comments?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});
