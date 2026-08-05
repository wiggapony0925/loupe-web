import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, X } from "lucide-react";
import {
  useSocialMe,
  useSocialRequestDecision,
  useSocialRequests,
  useSocialSearch,
  useSocialSuggested,
} from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Panel, Skeleton } from "@/components";
import { SocialAvatar } from "../components/SocialAvatar";
import { UserRow } from "../components/UserRow";
import { EditProfileModal } from "../EditProfile/EditProfileModal";
import styles from "./Community.module.scss";

/**
 * Community — find collectors, follow them, and manage follow requests.
 * The search-first layout mirrors the "find a user" pattern collectors
 * already know from Instagram (and Collectr).
 */
export function Community() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const { data: me, isLoading: meLoading } = useSocialMe();
  const { data: results, isFetching: searching } = useSocialSearch(query);
  const { data: requests } = useSocialRequests(Boolean(me?.profile));
  const { data: suggested } = useSocialSuggested();
  const decide = useSocialRequestDecision();

  const profile = me?.profile ?? null;
  const showResults = query.trim().length > 1;
  // Following someone requires a claimed handle — the server 409s and we
  // open the claim sheet instead of failing silently.
  const openClaim = () => setEditOpen(true);

  return (
    <div className={styles.community}>
      <div className={styles.community__head}>
        <h1 className={styles.community__title}>Community</h1>
        <span className={styles.community__sub}>
          Follow collectors and explore their collections
        </span>
      </div>

      {/* My profile strip — or the claim-a-username call to action. */}
      {meLoading ? (
        <Skeleton height={72} radius={12} />
      ) : profile ? (
        <Panel className={styles.community__mine}>
          <Link
            to={`/app/u/${encodeURIComponent(profile.username)}`}
            className={styles.community__mineLink}
          >
            <SocialAvatar
              name={profile.username}
              src={profile.avatarUrl}
            />
            <span className={styles.community__mineIdent}>
              <span className={styles.community__mineName}>
                {user?.display_name?.trim() || profile.username}
              </span>
              <span className={styles.community__mineHandle}>
                @{profile.username}
                {profile.isPrivate ? " · Private" : ""}
              </span>
            </span>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            Edit profile
          </Button>
        </Panel>
      ) : (
        <Panel className={styles.community__claim}>
          <UserPlus size={20} aria-hidden />
          <div className={styles.community__claimText}>
            <span className={styles.community__claimTitle}>
              Claim your username
            </span>
            <span className={styles.community__claimSub}>
              Set up a profile so other collectors can find and follow you.
            </span>
          </div>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            Get started
          </Button>
        </Panel>
      )}

      {/* Follow requests inbox (private accounts). */}
      {requests && requests.length > 0 && (
        <section className={styles.community__section}>
          <h2 className={styles.community__sectionTitle}>
            Follow requests
            <span className={styles.community__badge}>{requests.length}</span>
          </h2>
          <div className={styles.community__list}>
            {requests.map((req) => (
              <UserRow
                key={req.id}
                user={req.requester}
                action={
                  <span className={styles.community__decision}>
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        decide.mutate({ id: req.id, accept: true });
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Decline ${req.requester.username}`}
                      disabled={decide.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        decide.mutate({ id: req.id, accept: false });
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </span>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Search. */}
      <div className={styles.community__search}>
        <Search size={17} aria-hidden className={styles.community__searchIcon} />
        <input
          className={styles.community__searchInput}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a collector"
          aria-label="Search for a collector"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            className={styles.community__searchClear}
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {showResults ? (
        searching && !results ? (
          <div className={styles.community__list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={56} radius={10} />
            ))}
          </div>
        ) : !results || results.length === 0 ? (
          <p className={styles.community__empty}>
            No collectors match “{query.trim()}”.
          </p>
        ) : (
          <div className={styles.community__list}>
            {results.map((row) => (
              <UserRow key={row.userId} user={row} onRequiresProfile={openClaim} />
            ))}
          </div>
        )
      ) : suggested && suggested.length > 0 ? (
        <section className={styles.community__section}>
          <h2 className={styles.community__sectionTitle}>Suggested for you</h2>
          <div className={styles.community__list}>
            {suggested.map((row) => (
              <UserRow key={row.userId} user={row} onRequiresProfile={openClaim} />
            ))}
          </div>
        </section>
      ) : (
        <p className={styles.community__empty}>
          Search by username or name to find people you know.
        </p>
      )}

      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        accountName={user?.display_name}
      />
    </div>
  );
}
