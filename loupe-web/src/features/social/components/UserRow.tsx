import { Link } from "react-router-dom";
import { Lock, MapPin } from "lucide-react";
import type { SocialUserCard } from "@loupe/core";
import { Badge } from "@/components";
import { SocialAvatar } from "./SocialAvatar";
import { FollowButton } from "./FollowButton";
import styles from "./UserRow.module.scss";

export interface UserRowProps {
  user: SocialUserCard;
  /** Extra control on the right (e.g. accept/decline); defaults to FollowButton. */
  action?: React.ReactNode;
  /** Forwarded to FollowButton — opens the claim sheet on a 409. */
  onRequiresProfile?: () => void;
}

/** One collector in a list — avatar, name + badges + handle, follow control. */
export function UserRow({ user, action, onRequiresProfile }: UserRowProps) {
  const name = user.displayName?.trim() || user.username;
  return (
    <Link to={`/app/u/${encodeURIComponent(user.username)}`} className={styles.row}>
      <SocialAvatar name={name} src={user.avatarUrl} />
      <span className={styles.row__ident}>
        <span className={styles.row__name}>
          {name}
          {user.isPro && <Badge tone="amber">PRO</Badge>}
          {user.isPrivate && <Lock size={12} aria-label="Private account" />}
        </span>
        <span className={styles.row__meta}>
          @{user.username}
          {user.location && (
            <span className={styles.row__location}>
              <MapPin size={11} aria-hidden />
              {user.location}
            </span>
          )}
        </span>
      </span>
      <span className={styles.row__action}>
        {action ?? (
          <FollowButton
            username={user.username}
            relationship={user.relationship}
            onRequiresProfile={onRequiresProfile}
          />
        )}
      </span>
    </Link>
  );
}
