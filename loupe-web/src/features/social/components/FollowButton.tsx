import { useSocialFollowMutation, type SocialRelationship } from "@loupe/core";
import { Button } from "@/components";

export interface FollowButtonProps {
  username: string;
  relationship: SocialRelationship;
  size?: "sm" | "md";
  block?: boolean;
  /** Called when the server refuses because the viewer hasn't claimed a
   *  username yet (409) — open the claim sheet. */
  onRequiresProfile?: () => void;
}

const LABELS: Record<Exclude<SocialRelationship, "self">, string> = {
  none: "Follow",
  following: "Following",
  requested: "Requested",
};

/**
 * The one follow control. Instagram semantics: Follow → Following on public
 * profiles, Follow → Requested on private ones; tapping Following/Requested
 * undoes it directly (house rule: no confirm popups).
 */
export function FollowButton({
  username,
  relationship,
  size = "sm",
  block,
  onRequiresProfile,
}: FollowButtonProps) {
  const mutation = useSocialFollowMutation({
    onError: (err) => {
      if (err.status === 409) onRequiresProfile?.();
    },
  });
  if (relationship === "self") return null;

  const engaged = relationship !== "none";
  return (
    <Button
      variant={engaged ? "secondary" : "primary"}
      size={size}
      block={block}
      disabled={mutation.isPending}
      onClick={(e) => {
        // Rows wrap the button in a profile link — don't navigate too.
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate({ username, action: engaged ? "unfollow" : "follow" });
      }}
    >
      {LABELS[relationship]}
    </Button>
  );
}
