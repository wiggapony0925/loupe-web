/**
 * AdminFeatured — who appears on the Community "Featured collectors" rail.
 *
 * The list is a row of TAGS in operator order, each with an × to drop it,
 * plus a box to add a handle. Below, the resolved collectors render as the
 * app draws them, so the operator sees the actual shelf rather than a list
 * of strings they have to imagine.
 *
 * Empty is a valid, documented state: with no curation the rail falls back
 * to its ranking, so clearing every tag can never leave Community blank.
 * The page says so rather than showing an alarming empty state.
 */
import { useState } from "react";
import { X } from "lucide-react";
import {
  useAdminFeatured,
  useAddFeatured,
  useRemoveFeatured,
  type AdminFeaturedCollector,
} from "@loupe/core";
import { Button, NoteCard, Skeleton, TextField } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminFeatured.module.scss";
import admin from "../admin.module.scss";

export function AdminFeatured() {
  const { data, isLoading, error } = useAdminFeatured();
  const add = useAddFeatured();
  const remove = useRemoveFeatured();
  const [handle, setHandle] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = handle.trim().replace(/^@/, "");
    if (!value) return;
    add.mutate(value, {
      onSuccess: () => {
        setHandle("");
        notify.success(`@${value} is now featured`);
      },
      // The server rejects a handle that doesn't exist — say which one,
      // because "not found" alone is useless when adding several.
      onError: (err) =>
        notify.error(err.message || `Couldn't feature @${value}`),
    });
  };

  if (isLoading) {
    return (
      <div className={admin.page}>
        <Skeleton height={44} radius={10} />
        <Skeleton height={180} radius={10} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <NoteCard
        title="Couldn't load the featured rail"
        message={error?.message ?? "Try again in a moment."}
      />
    );
  }

  const { usernames, collectors, unresolved, max_featured: max } = data;
  const full = usernames.length >= max;

  return (
    <div className={admin.page}>
      <header className={admin.header}>
        <div>
          <h1 className={admin.title}>Featured collectors</h1>
          <p className={admin.subtitle}>
            The Community rail, in this order. With no tags it falls back to
            the ranking (most followed, then biggest collection) — clearing
            the list is safe.
          </p>
        </div>
        <span className={styles.count}>
          {usernames.length} / {max}
        </span>
      </header>

      <form className={styles.add} onSubmit={submit}>
        <TextField
          label="Add a collector"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="username"
          disabled={full || add.isPending}
        />
        <Button type="submit" disabled={!handle.trim() || full || add.isPending}>
          {add.isPending ? "Adding…" : "Feature"}
        </Button>
      </form>
      {full && (
        <p className={styles.note}>
          The rail is full. Remove a collector to add another.
        </p>
      )}

      {usernames.length === 0 ? (
        <NoteCard
          title="No curation"
          message="The rail is ranked automatically. Add a handle above to take control of it."
        />
      ) : (
        <ul className={styles.tags}>
          {usernames.map((name) => {
            const dangling = unresolved.includes(name);
            return (
              <li
                key={name}
                className={`${styles.tag} ${dangling ? styles.tagDangling : ""}`}
                title={
                  dangling
                    ? "This handle no longer resolves — it renders nothing on the rail."
                    : undefined
                }
              >
                <span>@{name}</span>
                <button
                  type="button"
                  className={styles.tagX}
                  aria-label={`Remove @${name} from the featured rail`}
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(name, {
                      onSuccess: () => notify.success(`@${name} removed`),
                    })
                  }
                >
                  <X size={13} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {unresolved.length > 0 && (
        <NoteCard
          title={`${unresolved.length} handle${unresolved.length === 1 ? "" : "s"} no longer resolve`}
          message={`${unresolved.map((u) => `@${u}`).join(", ")} — renamed, deactivated or removed. They're skipped on the rail; drop the tags to tidy up.`}
        />
      )}

      {collectors.length > 0 && (
        <section className={styles.preview}>
          <h2 className={admin.sectionTitle}>The rail</h2>
          <div className={styles.rail}>
            {collectors.map((c) => (
              <CollectorCard key={c.user_id} collector={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** The shelf tile, roughly as the app draws it — so the operator is
 *  choosing a card, not a string. */
function CollectorCard({ collector }: { collector: AdminFeaturedCollector }) {
  const art = collector.preview_image_urls ?? [];
  return (
    <article className={styles.card}>
      <div className={styles.cardArt}>
        {art.length > 0 ? (
          art.map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" />
          ))
        ) : (
          <span className={styles.cardArtEmpty}>No cards</span>
        )}
      </div>
      <div className={styles.cardWho}>
        <strong>{collector.display_name?.trim() || `@${collector.username}`}</strong>
        <span>
          @{collector.username}
          {collector.card_count > 0 && ` · ${collector.card_count.toLocaleString()} cards`}
          {collector.is_admin && " · ADMIN"}
        </span>
      </div>
    </article>
  );
}
