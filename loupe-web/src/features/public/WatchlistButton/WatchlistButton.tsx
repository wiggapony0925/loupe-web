import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Heart } from "lucide-react";
import { useAddToWatchlist, type CardSummary } from "@loupe/core";
import { Button, Modal } from "@/components";
import { useAuth } from "@/auth/AuthProvider";

/**
 * "Add to watchlist" — sign-in-gated. For guests it opens a sign-in modal;
 * for members it resolves the public card to a local id and pins it
 * (reuses /v1/cards/resolve + /v1/watchlist). Reusable on any card surface.
 */
export function WatchlistButton({ card, block = true }: { card: CardSummary; block?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signinOpen, setSigninOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const add = useAddToWatchlist({ onSuccess: () => setAdded(true) });

  const onClick = () => {
    if (!user) {
      setSigninOpen(true);
      return;
    }
    if (added || add.isPending) return;
    add.mutate(card.id);
  };

  return (
    <>
      <Button
        variant={added ? "secondary" : "primary"}
        block={block}
        onClick={onClick}
        disabled={add.isPending}
        leadingIcon={added ? <Check size={16} /> : <Heart size={16} />}
      >
        {added ? "On your watchlist" : add.isPending ? "Adding…" : "Add to watchlist"}
      </Button>
      {add.isError && (
        <p style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--down)", textAlign: "center" }}>
          Couldn't add right now — please try again.
        </p>
      )}

      <Modal
        open={signinOpen}
        onOpenChange={setSigninOpen}
        title="Track this card"
        description="Sign in to add cards to your watchlist, build your vault, and get price alerts."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSigninOpen(false)}>
              Maybe later
            </Button>
            <Button onClick={() => navigate("/login")}>Sign in</Button>
          </>
        }
      />
    </>
  );
}
