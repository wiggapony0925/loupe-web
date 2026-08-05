import { useSocialFollowers, useSocialFollowing } from "@loupe/core";
import { Modal, Skeleton } from "@/components";
import { UserRow } from "./UserRow";
import styles from "./UserListModal.module.scss";

export interface UserListModalProps {
  username: string;
  kind: "followers" | "following";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Followers / Following list, opened from the profile stats row. */
export function UserListModal({ username, kind, open, onOpenChange }: UserListModalProps) {
  const followers = useSocialFollowers(username, open && kind === "followers");
  const following = useSocialFollowing(username, open && kind === "following");
  const { data, isLoading } = kind === "followers" ? followers : following;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "followers" ? "Followers" : "Following"}
      size="sm"
    >
      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={56} radius={10} />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className={styles.empty}>
          {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
        </p>
      ) : (
        <div className={styles.list}>
          {data.map((user) => (
            <UserRow key={user.userId} user={user} />
          ))}
        </div>
      )}
    </Modal>
  );
}
