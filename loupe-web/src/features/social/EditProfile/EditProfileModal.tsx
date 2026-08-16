import { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import {
  useUpdateSocialProfile,
  useUploadSocialAvatar,
  type SocialProfile,
} from "@loupe/core";
import { useModeratedField, useModeratedSubmit } from "moderato/react";
import { ModeratedUpload } from "moderato/web";
import { Button, Modal, Switch, TextField } from "@/components";
import { SocialAvatar } from "../components/SocialAvatar";
import {
  IDENTITY_HINT,
  IDENTITY_POLICY,
  moderationEngine,
} from "../moderation";
import { SOCIAL_PLATFORMS } from "../socialLinks";
import styles from "./EditProfileModal.module.scss";

export interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current profile, or null when the user hasn't claimed a handle yet. */
  profile: SocialProfile | null;
  /** Fallback display name for the avatar initials (from the account). */
  accountName?: string | null;
}

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9._]{2,29}$/;

/**
 * Claim/update the social profile — username, bio, location, private toggle,
 * and the profile picture. One modal serves first-run and later edits.
 */
export function EditProfileModal({
  open,
  onOpenChange,
  profile,
  accountName,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(profile?.username ?? "");
  // The handle is screened as it is typed. Not enforcement — the server
  // refuses on save either way — but a handle is permanent public identity,
  // and finding out at the keyboard beats finding out after filling in the
  // whole form. Controlled, so the existing `username` state stays the one
  // source of truth for validation and submit.
  const handleField = useModeratedField({
    engine: moderationEngine,
    value: username,
    onChange: setUsername,
    policy: IDENTITY_POLICY,
    message: IDENTITY_HINT,
  });
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  // Per-platform links, exactly as typed — the SERVER canonicalises
  // (@handle → https URL) on save and the cache refetch re-seeds us.
  const [links, setLinks] = useState<Record<string, string>>(
    profile?.links ?? {},
  );
  const [formError, setFormError] = useState<string | null>(null);

  // The handle, bio and picture are all screened server-side (same
  // chokepoint as posts, same backend-owned refusal copy) — moderato just
  // makes those refusals read the same here as everywhere else.
  const save = useModeratedSubmit(useUpdateSocialProfile(), {
    onDone: () => onOpenChange(false),
  });
  const upload = useModeratedSubmit(useUploadSocialAvatar());

  // Re-seed the form whenever the sheet opens on fresh data.
  useEffect(() => {
    if (open) {
      setUsername(profile?.username ?? "");
      setBio(profile?.bio ?? "");
      setLocation(profile?.location ?? "");
      setIsPrivate(profile?.isPrivate ?? false);
      setLinks(profile?.links ?? {});
      setFormError(null);
      save.dismiss();
      upload.dismiss();
    }
    // dismiss() is referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile]);

  const handleSave = async () => {
    const handle = username.trim();
    if (!USERNAME_RE.test(handle)) {
      setFormError(
        "Usernames are 3–30 characters: letters, numbers, dots or underscores.",
      );
      return;
    }
    setFormError(null);
    // Flush the debounce before submitting: without this, typing a slur and
    // hitting Save inside the quiet window skips the check entirely. The
    // server would still refuse — this just makes the refusal instant.
    if (!(await handleField.check()).ok) return;
    save.submit({
      username: handle,
      bio: bio.trim() || null,
      location: location.trim() || null,
      isPrivate,
      // Explicit replace: blanks drop out, {} clears everything. Unknown
      // platforms and junk URLs come back as a 422 in the error line.
      links: Object.fromEntries(
        Object.entries(links)
          .map(([k, v]): [string, string] => [k, v.trim()])
          .filter(([, v]) => v !== ""),
      ),
    });
  };

  const claimed = Boolean(profile);
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={claimed ? "Edit profile" : "Set up your profile"}
      description={
        claimed
          ? undefined
          : "Pick a username so other collectors can find and follow you."
      }
      footer={
        <Button
          block
          onClick={() => void handleSave()}
          disabled={save.pending || handleField.blocked}
        >
          {save.pending ? "Saving…" : claimed ? "Save changes" : "Claim username"}
        </Button>
      }
    >
      <div className={styles.edit}>
        {claimed && (
          <ModeratedUpload
            accept="image/jpeg,image/png,image/webp"
            onAccept={(files) => {
              const file = files[0];
              if (file) upload.submit(file);
            }}
          >
            {({ open: pick }) => (
              <button
                type="button"
                className={styles.edit__avatarButton}
                onClick={pick}
                disabled={upload.pending}
                aria-label="Change profile picture"
              >
                <SocialAvatar
                  name={profile?.username ?? accountName ?? "?"}
                  src={profile?.avatarUrl}
                  size="hero"
                />
                <span className={styles.edit__avatarHint}>
                  <Camera size={13} aria-hidden />
                  {upload.pending ? "Uploading…" : "Change photo"}
                </span>
              </button>
            )}
          </ModeratedUpload>
        )}

        <TextField
          label="Username"
          value={username}
          onChange={(e) => {
            handleField.inputProps.onChange(e);
            if (save.refusal) save.dismiss();
          }}
          onBlur={handleField.inputProps.onBlur}
          error={handleField.message ?? undefined}
          placeholder="e.g. jeffcollects"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <label className={styles.edit__field}>
          <span className={styles.edit__label}>Bio</span>
          <textarea
            className={styles.edit__textarea}
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (save.refusal) save.dismiss();
            }}
            placeholder="What do you collect?"
            maxLength={280}
            rows={3}
          />
        </label>
        <TextField
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, Region (optional)"
        />

        {/* ── Social links — the lisacollects pattern: one row per
            platform, type a handle or paste a URL, ✕ clears. ── */}
        <fieldset className={styles.edit__links}>
          <legend className={styles.edit__label}>Social links</legend>
          <p className={styles.edit__hint}>
            Shown on your profile. Type a handle like @{username.trim() || "you"}{" "}
            or paste a full link.
          </p>
          {SOCIAL_PLATFORMS.map(({ key, label, Icon }) => {
            const value = links[key] ?? "";
            return (
              <div key={key} className={styles.edit__linkRow}>
                <Icon size={15} aria-hidden className={styles.edit__linkIcon} />
                <TextField
                  label={label}
                  value={value}
                  onChange={(e) =>
                    setLinks((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={key === "web" ? "https://…" : "@handle or URL"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {value ? (
                  <button
                    type="button"
                    className={styles.edit__linkClear}
                    onClick={() => setLinks((prev) => ({ ...prev, [key]: "" }))}
                    aria-label={`Clear ${label} link`}
                  >
                    <X size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
        </fieldset>

        <div className={styles.edit__privacy}>
          <div className={styles.edit__privacyText}>
            <span className={styles.edit__label}>Private account</span>
            <span className={styles.edit__hint}>
              People must request to follow you before they can see your
              collection.
            </span>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            aria-label="Private account"
          />
        </div>

        {(save.refusal ?? upload.refusal) && (
          <p className={styles.edit__refusal} role="alert">
            {save.refusal ?? upload.refusal}
          </p>
        )}
        {(formError ?? save.error ?? upload.error) && (
          <p className={styles.edit__error}>
            {formError ?? save.error?.message ?? upload.error?.message}
          </p>
        )}
      </div>
    </Modal>
  );
}
