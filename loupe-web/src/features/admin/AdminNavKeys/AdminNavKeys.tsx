import { useMemo, useState } from "react";
import {
  Bell,
  Copy,
  ExternalLink,
  Heart,
  KeyRound,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button, Badge, TextField } from "@/components";
import {
  NAV_TARGETS,
  navTargetById,
  mintNavKey,
  encodeNavKey,
  decodeNavKey,
  navKeyLoginUrl,
  logMintedKey,
  readMintLog,
  clearMintLog,
  NAV_KEY_PARAM,
  NAV_KEY_TTL_MS,
  type NavKey,
} from "@/lib/navKeys";
import styles from "./AdminNavKeys.module.scss";
import admin from "../admin.module.scss";

/** Catalog icon ids → components. */
const ICONS: Record<string, LucideIcon> = { LayoutDashboard, Plus, Heart, Bell };

/** Pull a `?k=` token out of a pasted login URL, or treat the input as a raw token. */
function tokenFromInput(s: string): string {
  const t = s.trim();
  if (!t) return "";
  const m = t.match(/[?&]k=([^&\s]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : t;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

/** Pretty, ordered view of a decoded key for the inspector panels. */
function KeyFields({ k }: { k: NavKey }) {
  const expired = Date.now() - k.ts > NAV_KEY_TTL_MS;
  const rows: [string, string][] = [
    ["to", k.to],
    ["intent", k.intent],
    ["card", k.card ? `${k.card.id}${k.card.title ? ` · ${k.card.title}` : ""}` : "—"],
    ["uid", k.uid || "—"],
    ["src", k.src || "—"],
    ["minted", `${new Date(k.ts).toLocaleString()} (${relTime(k.ts)})`],
  ];
  return (
    <dl className={styles.fields}>
      {rows.map(([key, val]) => (
        <div key={key} className={styles.field}>
          <dt>{key}</dt>
          <dd>{val}</dd>
        </div>
      ))}
      <div className={styles.field}>
        <dt>status</dt>
        <dd>
          {expired ? (
            <Badge tone="rose" dot>
              Expired
            </Badge>
          ) : (
            <Badge tone="mint" dot>
              Valid
            </Badge>
          )}
        </dd>
      </div>
    </dl>
  );
}

/**
 * Nav keys — inspector + workbench for the portable "where was I headed, and
 * what was I doing?" tokens the app mints when a guest hits an authenticated
 * surface. See the whole catalog, build & test a key for any user id, decode a
 * key someone hands you, and review everything minted this session.
 */
export function AdminNavKeys() {
  const [targetId, setTargetId] = useState<string>("page");
  const [cardId, setCardId] = useState("base1-4");
  const [path, setPath] = useState("/app/vault");
  const [uid, setUid] = useState("");
  const [decodeInput, setDecodeInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [log, setLog] = useState(() => readMintLog());

  const target = navTargetById(targetId) ?? NAV_TARGETS[0]!;

  // Re-mint only when the inputs change (so `ts` is stable within a render).
  const key = useMemo<NavKey>(() => {
    const { to, intent } = target.build({ cardId, path });
    return mintNavKey({
      to,
      intent,
      card: target.params.includes("card") && cardId ? { id: cardId } : undefined,
      uid: uid.trim() || undefined,
      src: "dev-tool",
    });
  }, [target, cardId, path, uid]);

  const token = useMemo(() => encodeNavKey(key), [key]);
  const loginUrl = useMemo(() => navKeyLoginUrl(key), [key]);

  // Pasted-in key inspector. `ignoreExpiry` so we can still show stale keys.
  const pasted = useMemo(() => {
    const tok = tokenFromInput(decodeInput);
    if (!tok) return null;
    const decoded = decodeNavKey(tok, { ignoreExpiry: true });
    return { tok, decoded };
  }, [decodeInput]);

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 1500);
    });
  };

  const refreshLog = () => setLog(readMintLog());

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Nav keys</h1>
          <p className={admin.subtitle}>
            Portable sign-in intents. When a guest hits a secured page or a gated action,
            we mint a key capturing where they were headed (and what they were doing) so
            login can send them right back. Build, test, and decode them here.
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Builder / tester ── */}
        <section className={styles.col}>
          <div className={styles.card}>
            <header className={styles.card__head}>
              <KeyRound size={16} />
              <h2 className={styles.card__title}>Build &amp; test a key</h2>
            </header>

            <div className={styles.group}>
              <span className={styles.group__title}>Intent</span>
              <div className={styles.chips}>
                {NAV_TARGETS.map((t) => {
                  const Icon = ICONS[t.icon] ?? KeyRound;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.chip}
                      data-active={t.id === targetId || undefined}
                      onClick={() => setTargetId(t.id)}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <p className={styles.hint}>{target.description}</p>
            </div>

            <div className={styles.group}>
              {target.params.includes("card") && (
                <TextField
                  label="Card id"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  placeholder="base1-4"
                />
              )}
              {target.params.includes("path") && (
                <TextField
                  label="Destination path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/app/vault"
                />
              )}
              <TextField
                label="User id (optional — stamps the key)"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="user_abc123"
              />
            </div>

            <div className={styles.group}>
              <span className={styles.group__title}>Decoded key</span>
              <KeyFields k={key} />
            </div>

            <div className={styles.group}>
              <span className={styles.group__title}>Token</span>
              <code className={styles.token}>{token}</code>
              <div className={styles.row}>
                <Button size="sm" variant="secondary" leadingIcon={<Copy size={14} />} onClick={() => copy(token, "token")}>
                  {copied === "token" ? "Copied" : "Copy token"}
                </Button>
                <Button size="sm" variant="secondary" leadingIcon={<Copy size={14} />} onClick={() => copy(loginUrl, "url")}>
                  {copied === "url" ? "Copied" : "Copy login URL"}
                </Button>
                <a className={styles.openLink} href={loginUrl} target="_blank" rel="noreferrer">
                  Open login URL <ExternalLink size={13} />
                </a>
              </div>
              <p className={styles.hint}>
                A user who signs in via this URL lands on <code>{key.to}</code>
                {key.intent !== "page" ? ` and resumes “${target.label}.”` : "."}{" "}
                Keys expire after {Math.round(NAV_KEY_TTL_MS / 60000)} minutes.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  logMintedKey(key, token);
                  refreshLog();
                }}
              >
                Log this key to history
              </Button>
            </div>
          </div>

          {/* ── Decoder ── */}
          <div className={styles.card}>
            <header className={styles.card__head}>
              <KeyRound size={16} />
              <h2 className={styles.card__title}>Decode a key</h2>
            </header>
            <textarea
              className={styles.textarea}
              value={decodeInput}
              onChange={(e) => setDecodeInput(e.target.value)}
              placeholder="Paste a nav key token or a full /login?k=… URL"
              aria-label="Decode a nav key"
              rows={3}
            />
            {pasted &&
              (pasted.decoded ? (
                <KeyFields k={pasted.decoded} />
              ) : (
                <p className={styles.invalid}>Invalid or corrupt token — checksum failed.</p>
              ))}
          </div>
        </section>

        {/* ── Catalog + history ── */}
        <section className={styles.col}>
          <div className={styles.card}>
            <header className={styles.card__head}>
              <h2 className={styles.card__title}>Catalog</h2>
              <span className={styles.count}>{NAV_TARGETS.length} keys</span>
            </header>
            <ul className={styles.catalog}>
              {NAV_TARGETS.map((t) => {
                const Icon = ICONS[t.icon] ?? KeyRound;
                const ex = t.build({ cardId: cardId || "base1-4", path: path || "/app/vault" });
                return (
                  <li key={t.id} className={styles.entry}>
                    <span className={styles.entry__icon}>
                      <Icon size={16} />
                    </span>
                    <div className={styles.entry__body}>
                      <div className={styles.entry__head}>
                        <span className={styles.entry__label}>{t.label}</span>
                        <Badge tone={t.requiresAuth ? "amber" : "mint"} dot>
                          {t.requiresAuth ? "Auth" : "Public"}
                        </Badge>
                        <code className={styles.entry__id}>{t.id}</code>
                      </div>
                      <p className={styles.entry__desc}>{t.description}</p>
                      <code className={styles.entry__path}>→ {ex.to}</code>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.card}>
            <header className={styles.card__head}>
              <h2 className={styles.card__title}>Minted this session</h2>
              <div className={styles.row}>
                <Button size="sm" variant="ghost" leadingIcon={<RefreshCw size={13} />} onClick={refreshLog}>
                  Refresh
                </Button>
                {log.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leadingIcon={<Trash2 size={13} />}
                    onClick={() => {
                      clearMintLog();
                      refreshLog();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </header>
            {log.length === 0 ? (
              <p className={styles.hint}>
                No keys minted yet this session. Trigger a sign-in gate (or log one above) and
                it shows up here.
              </p>
            ) : (
              <ul className={styles.history}>
                {log.map((e, i) => (
                  <li key={`${e.at}-${i}`} className={styles.histRow}>
                    <div className={styles.histRow__main}>
                      <span className={styles.histRow__intent}>{e.key.intent}</span>
                      <code className={styles.histRow__to}>{e.key.to}</code>
                    </div>
                    <div className={styles.histRow__meta}>
                      <span>{e.key.src ?? "—"}</span>
                      {e.key.uid && <span>· {e.key.uid}</span>}
                      <span>· {relTime(e.at)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.histRow__copy}
                      onClick={() => copy(`/login?${NAV_KEY_PARAM}=${encodeURIComponent(e.token)}`, `h${i}`)}
                      aria-label="Copy login URL"
                      title="Copy login URL"
                    >
                      {copied === `h${i}` ? "Copied" : <Copy size={13} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
