import { useMemo, useState } from "react";
import { RefreshCw, Copy, UserPlus, ExternalLink } from "lucide-react";
import { useAdminFlags, useCreateTestAccount } from "@loupe/core";
import { Button, SegmentedControl } from "@/components";
import styles from "./AdminSimulator.module.scss";
import admin from "../admin.module.scss";

type DeviceId = "iphone15" | "iphonese";
const DEVICES: Record<DeviceId, { label: string; w: number; h: number }> = {
  iphone15: { label: "iPhone 15", w: 393, h: 852 },
  iphonese: { label: "iPhone SE", w: 375, h: 667 },
};
const DEVICE_OPTS = [
  { value: "iphone15" as DeviceId, label: "iPhone 15" },
  { value: "iphonese" as DeviceId, label: "iPhone SE" },
];

const ROUTES = [
  { label: "Home", path: "/" },
  { label: "Market", path: "/cards" },
  { label: "Sign in", path: "/login" },
  { label: "App", path: "/app" },
  { label: "Careers", path: "/careers" },
  { label: "Blog", path: "/blog" },
];

type Override = "default" | "on" | "off";

/** In-portal device preview — see the app in an iPhone frame, preview feature
 *  flags live (via `?ff=` overrides), and mint a test account to sign in with. */
export function AdminSimulator() {
  const { data: flags } = useAdminFlags();
  const createTest = useCreateTestAccount();
  const [device, setDevice] = useState<DeviceId>("iphone15");
  const [path, setPath] = useState("/");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [nonce, setNonce] = useState(0);
  const [copied, setCopied] = useState(false);

  const ff = useMemo(() => {
    const parts = Object.entries(overrides)
      .filter(([, v]) => v !== "default")
      .map(([k, v]) => `${k}:${v === "on" ? 1 : 0}`);
    return parts.join(",");
  }, [overrides]);

  const src = useMemo(() => {
    const base = path + (ff ? `${path.includes("?") ? "&" : "?"}ff=${encodeURIComponent(ff)}` : "");
    // nonce busts the iframe cache so Refresh / changes reload it.
    return `${base}${base.includes("?") ? "&" : "?"}_n=${nonce}`;
  }, [path, ff, nonce]);

  const dev = DEVICES[device];
  const test = createTest.data;

  const copyCreds = () => {
    if (!test) return;
    void navigator.clipboard?.writeText(`${test.email} / ${test.password}`).then(() => setCopied(true));
  };

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Simulator</h1>
          <p className={admin.subtitle}>Preview the app in a device frame, flip feature flags live, and test with a sandbox account.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <section className={styles.group}>
            <span className={styles.group__title}>Device</span>
            <SegmentedControl aria-label="Device" options={DEVICE_OPTS} value={device} onChange={setDevice} />
          </section>

          <section className={styles.group}>
            <span className={styles.group__title}>Route</span>
            <div className={styles.routes}>
              {ROUTES.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  className={styles.routeChip}
                  data-active={path === r.path || undefined}
                  onClick={() => setPath(r.path)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.group}>
            <div className={styles.group__row}>
              <span className={styles.group__title}>Feature flags (preview)</span>
              <Button variant="ghost" size="sm" leadingIcon={<RefreshCw size={14} />} onClick={() => setNonce((n) => n + 1)}>
                Reload
              </Button>
            </div>
            {!flags || flags.length === 0 ? (
              <p className={styles.hint}>No flags defined yet.</p>
            ) : (
              <ul className={styles.flags}>
                {flags.map((f) => (
                  <li key={f.id} className={styles.flag}>
                    <span className={styles.flag__key}>{f.key}</span>
                    <select
                      className={styles.flag__select}
                      value={overrides[f.key] ?? "default"}
                      onChange={(e) => setOverrides((s) => ({ ...s, [f.key]: e.target.value as Override }))}
                    >
                      <option value="default">Default ({f.enabled ? "on" : "off"})</option>
                      <option value="on">Force on</option>
                      <option value="off">Force off</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.hint}>Overrides apply only inside this preview (via the URL).</p>
          </section>

          <section className={styles.group}>
            <span className={styles.group__title}>Test account</span>
            {test ? (
              <div className={styles.creds}>
                <code>{test.email}</code>
                <code>{test.password}</code>
                <Button variant="secondary" size="sm" leadingIcon={<Copy size={14} />} onClick={copyCreds}>
                  {copied ? "Copied" : "Copy"}
                </Button>
                <p className={styles.hint}>Sign in with these inside the frame.</p>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<UserPlus size={16} />}
                onClick={() => createTest.mutate()}
                disabled={createTest.isPending}
              >
                {createTest.isPending ? "Creating…" : "Create test account"}
              </Button>
            )}
          </section>

          <a className={styles.openLink} href={src} target="_blank" rel="noreferrer">
            Open this preview in a tab <ExternalLink size={13} />
          </a>
        </aside>

        <div className={styles.stage}>
          <div className={styles.device} style={{ width: dev.w, height: dev.h }}>
            <span className={styles.device__notch} />
            <iframe key={src} className={styles.device__screen} src={src} title={`${dev.label} preview`} />
          </div>
          <span className={styles.device__caption}>
            {dev.label} · {dev.w}×{dev.h}
          </span>
        </div>
      </div>
    </div>
  );
}
