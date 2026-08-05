import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import {
  useUpdateSocialProfile,
  useUploadSocialAvatar,
  type SocialProfile,
} from "@loupe/core";
import { Button, Modal, Switch, TextField } from "@/components";
import { SocialAvatar } from "../components/SocialAvatar";
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
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-seed the form whenever the sheet opens on fresh data.
  useEffect(() => {
    if (open) {
      setUsername(profile?.username ?? "");
      setBio(profile?.bio ?? "");
      setLocation(profile?.location ?? "");
      setIsPrivate(profile?.isPrivate ?? false);
      setError(null);
    }
  }, [open, profile]);

  const save = useUpdateSocialProfile({
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(err.message),
  });
  const upload = useUploadSocialAvatar({
    onError: (err) => setError(err.message),
  });

  const handleSave = () => {
    const handle = username.trim();
    if (!USERNAME_RE.test(handle)) {
      setError(
        "Usernames are 3–30 characters: letters, numbers, dots or underscores.",
      );
      return;
    }
    setError(null);
    save.mutate({
      username: handle,
      bio: bio.trim() || null,
      location: location.trim() || null,
      isPrivate,
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
        <Button block onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Saving…" : claimed ? "Save changes" : "Claim username"}
        </Button>
      }
    >
      <div className={styles.edit}>
        {claimed && (
          <button
            type="button"
            className={styles.edit__avatarButton}
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            aria-label="Change profile picture"
          >
            <SocialAvatar
              name={profile?.username ?? accountName ?? "?"}
              src={profile?.avatarUrl}
              size="hero"
            />
            <span className={styles.edit__avatarHint}>
              <Camera size={13} aria-hidden />
              {upload.isPending ? "Uploading…" : "Change photo"}
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          className={styles.edit__file}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />

        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
            onChange={(e) => setBio(e.target.value)}
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

        {error && <p className={styles.edit__error}>{error}</p>}
      </div>
    </Modal>
  );
}
