/**
 * Circles — create, join by invite code, and manage members. The detail
 * sheet shows the invite code (tap to copy) and each member's role;
 * everything happens in bottom sheets, never popups.
 */
import { useEffect, useState } from 'react';
import { CircleCard } from '@/components/CircleCard/CircleCard';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { copyText } from '@/native/clipboard';
import { shareContent } from '@/native/share';
import type { Circle } from '@/types/types';

export function Circles() {
  const haptics = useHaptics();
  const me = useLedgerStore((s) => s.me);
  const circles = useLedgerStore((s) => s.circles);
  const ledgers = useLedgerStore((s) => s.ledgers);
  const loadLedger = useLedgerStore((s) => s.loadLedger);
  const createCircle = useLedgerStore((s) => s.createCircle);
  const joinCircle = useLedgerStore((s) => s.joinCircle);

  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Circle | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    for (const circle of circles) {
      if (!ledgers[circle.id]) void loadLedger(circle.id).catch(() => undefined);
    }
  }, [circles, ledgers, loadLedger]);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        if (!name.trim()) return;
        await createCircle(name.trim());
        setName('');
      } else if (mode === 'join') {
        if (!code.trim()) return;
        await joinCircle(code.trim());
        setCode('');
      }
      haptics.success();
      setMode(null);
    } catch (err) {
      haptics.warning();
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  // Clipboard bridge: Capacitor Clipboard on device (webview
  // navigator.clipboard is permission-flaky), navigator.clipboard on web.
  const copyInvite = (inviteCode: string): void => {
    haptics.impactLight();
    void copyText(inviteCode).then((ok) => {
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  // Share bridge: native share sheet on device; falls back to copy.
  const shareInvite = (circle: Circle): void => {
    haptics.impactLight();
    void shareContent(
      `Join "${circle.name}" on trackify`,
      `Join my circle "${circle.name}" on trackify — invite code: ${circle.inviteCode}`,
    ).then((shared) => {
      if (!shared) copyInvite(circle.inviteCode);
    });
  };

  return (
    <div className="page circles">
      <header className="page__header">
        <h1 className="page__title">Circles</h1>
        <button
          type="button"
          className="page__action"
          onClick={() => {
            haptics.impactLight();
            setMode('join');
          }}
        >
          Join
        </button>
      </header>

      {circles.length === 0 ? (
        <EmptyState
          title="Money is better together"
          body="A circle is a shared ledger — you and Nicol, the family, the business. Tag charges into it and trackify keeps score."
          actionLabel="Create a circle"
          onAction={() => setMode('create')}
        />
      ) : (
        <>
          <div className="list">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                ledger={ledgers[circle.id]}
                meUserId={me?.id ?? ''}
                onPress={(c) => {
                  haptics.impactLight();
                  setDetail(c);
                }}
              />
            ))}
          </div>
          <div className="circles__create">
            <button type="button" className="button button--primary" onClick={() => setMode('create')}>
              New circle
            </button>
          </div>
        </>
      )}

      <BottomSheet
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'create' ? 'New circle' : 'Join a circle'}
      >
        <div className="circles__form">
          {mode === 'create' ? (
            <label className="field">
              <span className="field__label">Circle name</span>
              <input
                className="field__input"
                value={name}
                placeholder="JFM & Nicol"
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : (
            <label className="field">
              <span className="field__label">Invite code</span>
              <input
                className="field__input"
                value={code}
                placeholder="Paste the code"
                autoCapitalize="none"
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          {error ? <p className="notice notice--error">{error}</p> : null}
          <div className="circles__form-footer">
            <button
              type="button"
              className={`button button--primary${busy ? ' button--disabled' : ''}`}
              onClick={() => void submit()}
            >
              {busy ? 'Working…' : mode === 'create' ? 'Create' : 'Join'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={detail !== null} onClose={() => setDetail(null)} title={detail?.name}>
        {detail ? (
          <div className="circles__detail">
            <div className="section">
              <h3 className="section__title">Members</h3>
              <div className="list">
                {detail.members.map((member) => (
                  <div key={member.userId} className="circles__member">
                    <div>
                      <span className="circles__member-name">
                        {member.userId === me?.id ? 'You' : member.displayName}
                      </span>
                      <span className="circles__member-phone">{member.phoneMask}</span>
                    </div>
                    <span className="badge badge--outline">{member.role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="section">
              <h3 className="section__title">Invite</h3>
              <button
                type="button"
                className="circles__invite"
                onClick={() => copyInvite(detail.inviteCode)}
              >
                <span className="circles__invite-code">{detail.inviteCode}</span>
                <span className="circles__invite-hint">{copied ? 'Copied' : 'Tap to copy'}</span>
              </button>
              <div className="circles__share">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => shareInvite(detail)}
                >
                  Share invite
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
