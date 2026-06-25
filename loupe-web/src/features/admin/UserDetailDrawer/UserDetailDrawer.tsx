import { useState } from "react";
import { ShieldCheck, ShieldOff, Ban, RotateCcw, Trash2, Wallet, Star, ScanLine, DollarSign, Sparkles, LogOut, CreditCard, Receipt, Eye } from "lucide-react";
import {
  useAdminUserDetail,
  useSetUserRole,
  useSetUserPlan,
  useBanUser,
  useUnbanUser,
  useDeleteUser,
  useRevokeUserSessions,
  useCancelUserSubscription,
  useRefundUser,
  useImpersonateUser,
} from "@loupe/core";
import { Button, Modal, Skeleton, TextField, useConfirm } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { notify } from "@/stores/noticeStore";
import { formatMoney } from "@/lib/format";
import styles from "./UserDetailDrawer.module.scss";

interface UserDetailDrawerProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function dt(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

/** Full user record + admin actions, shown when a user row is opened. */
export function UserDetailDrawer({ userId, open, onOpenChange }: UserDetailDrawerProps) {
  const { user: me, impersonate } = useAuth();
  const { data: u, isLoading } = useAdminUserDetail(userId ?? "", open && Boolean(userId));
  const setRole = useSetUserRole();
  const setPlan = useSetUserPlan();
  const ban = useBanUser();
  const unban = useUnbanUser();
  const del = useDeleteUser();
  const revokeSessions = useRevokeUserSessions();
  const cancelSub = useCancelUserSubscription();
  const refund = useRefundUser();
  const impersonateUser = useImpersonateUser();
  const busy =
    setRole.isPending ||
    setPlan.isPending ||
    ban.isPending ||
    unban.isPending ||
    del.isPending ||
    revokeSessions.isPending ||
    cancelSub.isPending ||
    refund.isPending ||
    impersonateUser.isPending;
  const isPro = u?.plan === "pro";
  const askConfirm = useConfirm();

  async function doRevokeSessions() {
    if (!u) return;
    const ok = await askConfirm({
      title: "Sign out everywhere?",
      tone: "danger",
      confirmLabel: "Revoke sessions",
      message: (
        <>
          <strong>{u.email}</strong> is signed out of every device immediately
          (revokes all tokens). They can sign back in with their credentials.
        </>
      ),
    });
    if (!ok) return;
    revokeSessions.mutate(u.id, {
      onSuccess: () => notify.success(`Signed ${u.email} out of all devices.`),
      onError: () => notify.error("Couldn't revoke sessions — please try again."),
    });
  }

  async function doCancelSubscription() {
    if (!u) return;
    const ok = await askConfirm({
      title: "Cancel this subscription?",
      tone: "danger",
      confirmLabel: "Cancel at period end",
      message: (
        <>
          <strong>{u.email}</strong>&rsquo;s Loupe Pro won&rsquo;t renew — they
          keep Pro until the current period ends, then drop to free. This cancels
          the subscription in Stripe.
        </>
      ),
    });
    if (!ok) return;
    cancelSub.mutate(
      { id: u.id },
      {
        onSuccess: () =>
          notify.success(`${u.email}'s subscription will cancel at period end.`),
        onError: (e) =>
          notify.error(e?.message || "Couldn't cancel — please try again."),
      },
    );
  }

  async function doImpersonate() {
    if (!u) return;
    const ok = await askConfirm({
      title: `View the app as ${u.email}?`,
      tone: "mint",
      confirmLabel: "Impersonate",
      message: (
        <>
          Opens the app in this tab as <strong>{u.email}</strong>. Your admin
          session is preserved — use &ldquo;Exit&rdquo; in the banner to return.
          This is audited.
        </>
      ),
    });
    if (!ok) return;
    impersonateUser.mutate(u.id, {
      onSuccess: (r) => impersonate(r.token, r.email),
      onError: (e) => notify.error(e?.message || "Couldn't impersonate — super-admin only."),
    });
  }

  async function doRefund() {
    if (!u) return;
    const ok = await askConfirm({
      title: "Refund the latest payment?",
      tone: "danger",
      confirmLabel: "Issue refund",
      message: (
        <>
          Issues a full refund of <strong>{u.email}</strong>&rsquo;s most recent
          Stripe charge. This moves money and can&rsquo;t be undone.
        </>
      ),
    });
    if (!ok) return;
    refund.mutate(u.id, {
      onSuccess: (r) =>
        notify.success(`Refunded ${r.currency} ${r.amountUsd.toFixed(2)} to ${u.email}.`),
      onError: (e) => notify.error(e?.message || "Couldn't refund — super-admin only."),
    });
  }

  async function togglePro() {
    if (!u) return;
    const grant = !isPro;
    const ok = await askConfirm({
      title: grant ? "Grant Loupe Pro for free?" : "Revoke Loupe Pro?",
      tone: grant ? "mint" : "danger",
      confirmLabel: grant ? "Comp to Pro" : "Revoke Pro",
      message: grant ? (
        <>
          <strong>{u.email}</strong> gets full Pro access — unlimited cards,
          analytics, and statements — at no charge, with no expiry. (This skips
          Stripe entirely.)
        </>
      ) : (
        <>
          <strong>{u.email}</strong> drops back to the free tier (50-card cap,
          paywall). Any paid Stripe subscription is unaffected.
        </>
      ),
    });
    if (!ok) return;
    setPlan.mutate(
      { id: u.id, plan: grant ? "pro" : "free" },
      {
        onSuccess: () =>
          notify.success(grant ? `${u.email} is now Pro.` : `Pro revoked from ${u.email}.`),
        onError: () => notify.error("Couldn't update plan — please try again."),
      },
    );
  }

  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);
  const [reason, setReason] = useState("");

  const isSelf = me?.id === u?.id;
  const locked = Boolean(u?.isSuperAdmin) || isSelf;

  const doConfirm = () => {
    if (!u || !confirm) return;
    const after = () => setConfirm(null);
    if (confirm === "ban") ban.mutate({ id: u.id, reason: reason.trim() || null }, { onSuccess: after });
    else del.mutate(u.id, { onSuccess: after });
  };

  const stats = u
    ? [
        { icon: <Wallet size={16} />, label: "Vault cards", value: u.gradesCount.toLocaleString() },
        { icon: <Star size={16} />, label: "Watchlist", value: u.watchlistCount.toLocaleString() },
        { icon: <ScanLine size={16} />, label: "Scans", value: u.scansCount.toLocaleString() },
        { icon: <DollarSign size={16} />, label: "Est. value", value: formatMoney({ amount: u.estimatedValueUsd, currency: "USD" }) },
      ]
    : [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={confirm ? (confirm === "ban" ? `Ban ${u?.email}?` : `Delete ${u?.email}?`) : u?.email}
      description={
        confirm === "ban"
          ? "The user is locked out immediately. You can unban them later."
          : confirm === "delete"
            ? "Soft-deletes the account — signed out, can't sign back in. Data is retained."
            : u
              ? `${u.displayName ? u.displayName + " · " : ""}joined ${dt(u.createdAt)}`
              : undefined
      }
      footer={
        confirm ? (
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doConfirm} disabled={busy}>
              {busy ? "Working…" : confirm === "ban" ? "Ban user" : "Delete user"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )
      }
    >
      {isLoading || !u ? (
        <Skeleton height={280} radius={12} />
      ) : confirm ? (
        confirm === "ban" ? (
          <TextField label="Reason (optional)" placeholder="Shown in the audit log + email" value={reason} onChange={(e) => setReason(e.target.value)} />
        ) : null
      ) : (
        <div className={styles.detail}>
          <div className={styles.badges}>
            {u.isSuperAdmin ? (
              <span className={styles.badge} data-tone="mint">Super-admin</span>
            ) : u.isAdmin ? (
              <span className={styles.badge} data-tone="mint">Admin</span>
            ) : null}
            <span className={styles.badge} data-tone={u.deleted ? "neutral" : u.banned ? "rose" : "neutral"}>
              {u.deleted ? "Deleted" : u.banned ? "Banned" : "Active"}
            </span>
            {u.hasSubscription ? (
              <span className={styles.badge} data-tone="mint">{u.proTrialing ? "Trial" : "Paying"}</span>
            ) : isPro ? (
              <span className={styles.badge} data-tone="mint">Comped</span>
            ) : null}
            {isSelf && <span className={styles.badge} data-tone="neutral">You</span>}
          </div>

          <div className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.stat__icon}>{s.icon}</span>
                <span className={styles.stat__value}>{s.value}</span>
                <span className={styles.stat__label}>{s.label}</span>
              </div>
            ))}
          </div>

          <dl className={styles.meta}>
            <div><dt>Auth method</dt><dd>{u.authMethod}</dd></div>
            <div><dt>Account ID</dt><dd className={styles.mono}>{u.id}</dd></div>
            <div><dt>Created</dt><dd>{dt(u.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd>{dt(u.updatedAt)}</dd></div>
            {u.banned && (
              <>
                <div><dt>Banned</dt><dd>{dt(u.bannedAt)}</dd></div>
                {u.banReason && <div><dt>Ban reason</dt><dd>{u.banReason}</dd></div>}
              </>
            )}
          </dl>

          {/* Loupe Pro comp — available even for your own/super-admin account
              so you can grant yourself Pro to test the gated experience. */}
          {!u.deleted && (
            <div className={styles.actions}>
              <Button
                variant={isPro ? "secondary" : "primary"}
                size="sm"
                disabled={busy}
                leadingIcon={<Sparkles size={15} />}
                onClick={togglePro}
              >
                {isPro ? "Revoke Pro" : "Comp to Pro"}
              </Button>
            </div>
          )}

          {/* Security & billing — sign out everywhere, cancel a paid plan. */}
          {!u.deleted && (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                leadingIcon={<LogOut size={15} />}
                onClick={doRevokeSessions}
              >
                Revoke sessions
              </Button>
              {u.hasSubscription && (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.danger}
                  disabled={busy}
                  leadingIcon={<CreditCard size={15} />}
                  onClick={doCancelSubscription}
                >
                  Cancel subscription
                </Button>
              )}
              {u.hasSubscription && (
                <Button
                  variant="secondary"
                  size="sm"
                  className={styles.danger}
                  disabled={busy}
                  leadingIcon={<Receipt size={15} />}
                  onClick={doRefund}
                >
                  Refund last payment
                </Button>
              )}
            </div>
          )}

          {locked ? (
            <p className={styles.lockNote}>
              {isSelf ? "This is your account." : "Protected super-admin — can't be modified."}
            </p>
          ) : (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy || u.deleted}
                leadingIcon={u.isAdmin ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                onClick={() => setRole.mutate({ id: u.id, isAdmin: !u.isAdmin })}
              >
                {u.isAdmin ? "Revoke admin" : "Make admin"}
              </Button>
              {!u.deleted && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  leadingIcon={<Eye size={15} />}
                  onClick={doImpersonate}
                >
                  Impersonate
                </Button>
              )}
              {!u.deleted &&
                (u.banned ? (
                  <Button variant="secondary" size="sm" disabled={busy} leadingIcon={<RotateCcw size={15} />} onClick={() => unban.mutate(u.id)}>
                    Unban
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" className={styles.danger} disabled={busy} leadingIcon={<Ban size={15} />} onClick={() => setConfirm("ban")}>
                    Ban
                  </Button>
                ))}
              {!u.deleted && (
                <Button variant="ghost" size="sm" className={styles.danger} disabled={busy} leadingIcon={<Trash2 size={15} />} onClick={() => setConfirm("delete")}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
