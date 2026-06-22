import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { Panel, SegmentedControl, ThemeToggle, Badge, Button } from "@/components";
import { useUiStore, type SidebarSide } from "@/stores/uiStore";
import { useAuth } from "@/auth/AuthProvider";
import { usePro } from "@/pro";
import { cx } from "@/lib/cx";
import styles from "./Settings.module.scss";

const VERSION = "0.1.0";

/** Account + app settings — mirrors the mobile Settings (account, appearance, layout, about). */
export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const side = useUiStore((s) => s.sidebarSide);
  const setSide = useUiStore((s) => s.setSidebarSide);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const { subscriptionsEnabled, isPro, openPaywall, manageBilling, billingBusy } = usePro();

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Account &amp; app</p>
        <h1 className={styles.title}>Settings</h1>
      </header>

      {subscriptionsEnabled && (
        <Panel padding="lg">
          <Row
            title="Loupe Pro"
            desc={
              isPro
                ? "You're a Pro member — unlimited cards, scanner auto-import, full analytics, and statements."
                : "Unlock unlimited cards, scanner auto-import, deep analytics, and tax/insurance statements."
            }
          >
            {isPro ? (
              <div className={styles.proControls}>
                <Badge tone="mint" dot>
                  Pro
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={billingBusy}
                  onClick={manageBilling}
                >
                  {billingBusy ? "Opening…" : "Manage"}
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Sparkles size={16} />}
                onClick={() => openPaywall("generic")}
              >
                Upgrade
              </Button>
            )}
          </Row>
        </Panel>
      )}

      <Panel padding="lg">
        <Row title="Account" desc={user?.email ?? "Signed in"}>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<LogOut size={16} />}
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Sign out
          </Button>
        </Row>
        <Divider />
        <Row title="Name" desc={user?.display_name || "Not set"} />
        <Divider />
        <Row title="Account ID" desc={user?.id ?? "—"} mono />
      </Panel>

      <Panel padding="lg">
        <Row title="Appearance" desc="Light, dark, or follow your system — flips every token instantly.">
          <ThemeToggle />
        </Row>
      </Panel>

      <Panel padding="lg">
        <Row title="Sidebar position" desc="Pin the navigation rail to the left or right of the screen.">
          <SegmentedControl
            aria-label="Sidebar position"
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            value={side}
            onChange={(v) => setSide(v as SidebarSide)}
          />
        </Row>
        <Divider />
        <Row title="Collapse sidebar" desc="Use a compact, icon-only rail to give content more room.">
          <Button variant="secondary" size="sm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </Row>
      </Panel>

      <Panel padding="lg">
        <Row title="Data source" desc="Live loupe-backend — real market data, no mock numbers.">
          <Badge tone="mint" dot>
            Live
          </Badge>
        </Row>
        <Divider />
        <Row title="Version" desc={`Loupe Web · v${VERSION}`} />
        <Divider />
        <Row title="Legal" desc="Terms of service, privacy policy, and acknowledgements.">
          <a className={styles.link} href="#">
            View
          </a>
        </Row>
      </Panel>
    </div>
  );
}

function Row({
  title,
  desc,
  mono,
  children,
}: {
  title: string;
  desc: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowTitle}>{title}</p>
        <p className={cx(styles.rowDesc, mono && styles.mono)}>{desc}</p>
      </div>
      {children && <div className={styles.rowControl}>{children}</div>}
    </div>
  );
}

function Divider() {
  return <div className={styles.divider} />;
}
