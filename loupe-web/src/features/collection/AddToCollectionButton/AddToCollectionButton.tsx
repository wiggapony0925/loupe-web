import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { CardSummary } from "@loupe/core";
import { Button, Modal } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { useRequestSignIn, useResumeOnReturn } from "@/hooks/useNavKey";
import { CollectionForm } from "../CollectionForm/CollectionForm";
import { useCardOwnership } from "../useCardOwnership";
import styles from "./AddToCollectionButton.module.scss";

/**
 * "Add to collection" — sign-in-gated. Guests get a sign-in prompt; members
 * get the reusable add form (house · grade/condition · copies · cost · notes).
 * When the user already owns copies it surfaces a "You have N in your
 * collection · Manage" line that opens the same form in edit/remove mode.
 * Mirrors the mobile card screen's add + manage flow.
 */
export function AddToCollectionButton({ card, block = true }: { card: CardSummary; block?: boolean }) {
  const { user } = useAuth();
  const requestSignIn = useRequestSignIn();
  const { count, first } = useCardOwnership(card.id);
  const [signinOpen, setSigninOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Returning signed-in from the sign-in prompt? Re-open the add form.
  useResumeOnReturn("collection.add", () => setCreateOpen(true));

  const openCreate = () => (user ? setCreateOpen(true) : setSigninOpen(true));
  const owned = count > 0;

  return (
    <>
      <Button variant="secondary" block={block} onClick={openCreate} leadingIcon={<Plus size={16} />}>
        {owned ? "Add another copy" : "Add to collection"}
      </Button>

      {owned && first && (
        <button type="button" className={styles.owned} onClick={() => setEditOpen(true)}>
          <Pencil size={12} />
          <span>
            You have {count} {count === 1 ? "copy" : "copies"} in your collection
          </span>
          <span className={styles.owned__manage}>Manage</span>
        </button>
      )}

      <Modal
        open={signinOpen}
        onOpenChange={setSigninOpen}
        title="Add to your collection"
        description="Sign in to track cards you own in your vault, with live valuations and P/L."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSigninOpen(false)}>
              Maybe later
            </Button>
            <Button
              onClick={() =>
                requestSignIn({
                  intent: "collection.add",
                  card: { id: card.id, title: card.name },
                  src: "add-to-collection-button",
                })
              }
            >
              Sign in
            </Button>
          </>
        }
      />

      <CollectionForm mode="create" card={card} open={createOpen} onOpenChange={setCreateOpen} />
      {first && <CollectionForm mode="edit" holding={first} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  );
}
