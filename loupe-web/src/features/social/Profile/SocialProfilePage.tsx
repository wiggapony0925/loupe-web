import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock, MapPin } from "lucide-react";
import {
  useSocialCollection,
  useSocialMe,
  useSocialProfile,
} from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { Badge, Button, CardThumb, NoteCard, Skeleton } from "@/components";
import { formatMoney } from "@/lib/format";
import { cardImageSrc } from "@/lib/cardImage";
import { SocialAvatar } from "../components/SocialAvatar";
import { FollowButton } from "../components/FollowButton";
import { UserListModal } from "../components/UserListModal";
import { EditProfileModal } from "../EditProfile/EditProfileModal";
import styles from "./SocialProfilePage.module.scss";

/**
 * A collector's page — Instagram profile anatomy: avatar + stats row,
 * name/location/bio, one action button, then the collection grid (which is
 * this product's "posts"). Private accounts show a lock state instead.
 */
export function SocialProfilePage() {
  const { username = "" } = useParams();
  const { user } = useAuth();
  const [listKind, setListKind] = useState<"followers" | "following" | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: view, isLoading, error } = useSocialProfile(username);
  const isSelf = view?.relationship === "self";
  const { data: me } = useSocialMe(isSelf);
  const canView = Boolean(view?.canViewCollection);
  const { data: collection, isLoading: collectionLoading } = useSocialCollection(
    username,
    canView,
  );

  if (isLoading) {
    return (
      <div className={styles.profile}>
        <Skeleton height={120} radius={14} />
        <Skeleton height={220} radius={14} />
      </div>
    );
  }

  if (error || !view) {
    return (
      <NoteCard
        title="Profile not found"
        message="This collector doesn't exist, or their account is gone."
      />
    );
  }

  const name = view.displayName?.trim() || view.username;
  const stat = (
    label: string,
    value: number,
    onClick?: () => void,
  ) => (
    <button
      type="button"
      className={styles.profile__stat}
      onClick={onClick}
      disabled={!onClick}
      aria-label={`${value.toLocaleString()} ${label.toLowerCase()}`}
    >
      <span className={styles.profile__statValue}>{value.toLocaleString()}</span>
      <span className={styles.profile__statLabel}>{label}</span>
    </button>
  );

  return (
    <div className={styles.profile}>
      {/* Header — avatar + the three stats. */}
      <div className={styles.profile__head}>
        <SocialAvatar name={name} src={view.avatarUrl} size="hero" />
        <div className={styles.profile__stats}>
          {stat("Cards", view.cardCount)}
          {stat(
            "Followers",
            view.followerCount,
            canView ? () => setListKind("followers") : undefined,
          )}
          {stat(
            "Following",
            view.followingCount,
            canView ? () => setListKind("following") : undefined,
          )}
        </div>
      </div>

      {/* Identity block. */}
      <div className={styles.profile__ident}>
        <span className={styles.profile__name}>
          {name}
          {view.isPro && <Badge tone="amber">PRO</Badge>}
          {view.isPrivate && <Lock size={14} aria-label="Private account" />}
        </span>
        <span className={styles.profile__handle}>@{view.username}</span>
        {view.location && (
          <span className={styles.profile__location}>
            <MapPin size={13} aria-hidden />
            {view.location}
          </span>
        )}
        {view.bio && <p className={styles.profile__bio}>{view.bio}</p>}
      </div>

      {/* The one action. */}
      <div className={styles.profile__actions}>
        {isSelf ? (
          <Button variant="secondary" size="sm" block onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
        ) : (
          <FollowButton
            username={view.username}
            relationship={view.relationship}
            size="sm"
            block
            onRequiresProfile={() => setEditOpen(true)}
          />
        )}
      </div>

      {/* Collection — the profile's content grid. */}
      {!canView ? (
        <div className={styles.profile__private}>
          <span className={styles.profile__privateIcon}>
            <Lock size={22} aria-hidden />
          </span>
          <span className={styles.profile__privateTitle}>
            This account is private
          </span>
          <span className={styles.profile__privateSub}>
            Follow @{view.username} to see their collection.
          </span>
        </div>
      ) : (
        <section className={styles.profile__collection}>
          <div className={styles.profile__collectionHead}>
            <h2 className={styles.profile__collectionTitle}>Collection</h2>
            {collection && collection.estimatedValueUsd != null && (
              <span className={styles.profile__collectionValue}>
                {formatMoney(collection.estimatedValueUsd)}
              </span>
            )}
          </div>
          {collectionLoading ? (
            <div className={styles.profile__grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={150} radius={10} />
              ))}
            </div>
          ) : !collection || collection.items.length === 0 ? (
            isSelf ? (
              <div className={styles.profile__emptySelf}>
                <p className={styles.profile__empty}>
                  Scan or add cards to your vault and they'll show up here.
                </p>
                {/* Inside the app embed, the JS bridge detours this straight
                    to the native scanner; on web it's the browser scanner. */}
                <Link to="/scan" className={styles.profile__scanCta}>
                  <Button size="sm">Scan a card</Button>
                </Link>
              </div>
            ) : (
              <p className={styles.profile__empty}>
                No cards in this collection yet.
              </p>
            )
          ) : (
            <div className={styles.profile__grid}>
              {collection.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/cards/${encodeURIComponent(item.cardId)}`}
                  className={styles.profile__cell}
                >
                  <CardThumb
                    src={cardImageSrc(item.cardImageUrl)}
                    alt={item.cardName ?? "Card"}
                    size="lg"
                  />
                  <span className={styles.profile__cellMeta}>
                    <span className={styles.profile__cellName}>
                      {item.cardName ?? "Card"}
                    </span>
                    <span className={styles.profile__cellGrade}>
                      {item.house === "loupe"
                        ? "Raw"
                        : `${item.house.toUpperCase()} ${item.grade}`}
                      {item.estimatedValueUsd != null && (
                        <span className={styles.profile__cellPrice}>
                          {formatMoney(item.estimatedValueUsd)}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {listKind && (
        <UserListModal
          username={view.username}
          kind={listKind}
          open
          onOpenChange={(open) => !open && setListKind(null)}
        />
      )}
      {isSelf && (
        <EditProfileModal
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={me?.profile ?? null}
          accountName={user?.display_name}
        />
      )}
    </div>
  );
}
