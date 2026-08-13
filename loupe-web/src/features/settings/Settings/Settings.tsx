import { useAuth } from "@/auth/AuthProvider";
import {
  Badge,
  Button,
  Panel,
  SegmentedControl,
  Switch,
  ThemeToggle,
  useConfirm,
} from "@/components";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  getApiModePreference,
  resolveApiBaseUrl,
  setApiModePreference,
  type ApiMode,
} from "@/lib/apiMode";
import { CURRENCIES } from "@/lib/currency";
import { cx } from "@/lib/cx";
import { usePro } from "@/pro";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import { notify } from "@/stores/noticeStore";
import { useUiStore } from "@/stores/uiStore";
import { configureApi, useUpdateUserSettings, useUserSettings } from "@loupe/core";
import { Download, LogOut, MonitorSmartphone, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChangePasswordCard } from "../ChangePasswordCard/ChangePasswordCard";
import { MfaCard } from "../MfaCard/MfaCard";
import styles from "./Settings.module.scss";

const VERSION = "0.1.0";

/** Account + app settings — mirrors the mobile Settings (account, appearance, layout, about). */
export function Settings() {
  const navigate = useNavigate();
  const { user, logout, logoutEverywhere } = useAuth();
  const confirm = useConfirm();
  const [signingOutAll, setSigningOutAll] = useState(false);
  const side = useUiStore((s) => s.sidebarSide);
  const setSide = useUiStore((s) => s.setSidebarSide);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const { subscriptionsEnabled, isPro, openPaywall, manageBilling, billingBusy } = usePro();
  const { canInstall, showIosHint, install } = useInstallPrompt();
  const { code: displayCurrency, setCurrency } = useDisplayCurrency();
  const [apiMode, setApiMode] = useState<ApiMode>(getApiModePreference());
  const { data: settings } = useUserSettings(Boolean(user));
  const updateSettings = useUpdateUserSettings({
    onError: () => notify.error("Couldn't update your email preferences. Please try again."),
  });
  // Optimistic: show the in-flight value; on error React Query falls back to the cache.
  const emailAnnouncements = updateSettings.isPending
    ? (updateSettings.variables?.email_announcements_enabled ?? true)
    : (settings?.email_announcements_enabled ?? true);

  async function onSignOutEverywhere() {
    const ok = await confirm({
      title: "Sign out everywhere?",
      message:
        "This signs you out on every device and revokes all active sessions — use it if you've lost a device or think your account is compromised. You'll need to sign in again.",
      confirmLabel: "Sign out everywhere",
      cancelLabel: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    setSigningOutAll(true);
    try {
      await logoutEverywhere();
      void navigate("/");
    } catch {
      notify.error("Couldn't sign out everywhere. Please try again.");
      setSigningOutAll(false);
    }
  }

  const handleApiModeChange = (next: ApiMode) => {
    setApiModePreference(next);
    setApiMode(next);
    configureApi({
      baseUrl: resolveApiBaseUrl(next),
      withCredentials: !import.meta.env.VITE_API_URL?.trim(),
    });
    notify.info(next === "live" ? "Switched to live data." : "Switched to local data.");
    window.location.reload();
  };

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
              void navigate("/");
            }}
          >
            Sign out
          </Button>
        </Row>
        <Divider />
        <Row
          title="Sign out everywhere"
          desc="Revoke every device and active session. Use this if you've lost a device."
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={signingOutAll}
            leadingIcon={<MonitorSmartphone size={16} />}
            onClick={onSignOutEverywhere}
          >
            {signingOutAll ? "Signing out…" : "Sign out all"}
          </Button>
        </Row>
        <Divider />
        <Row title="Name" desc={user?.display_name || "Not set"} />
        <Divider />
        <Row title="Account ID" desc={user?.id ?? "—"} mono />
      </Panel>

      <ChangePasswordCard />

      <MfaCard />

      <Panel padding="lg">
        <Row
          title="Product updates & blog posts"
          desc="Occasional emails about new features and posts from the Loupe blog. Security and account emails always arrive."
        >
          <Switch
            aria-label="Product updates & blog posts"
            checked={emailAnnouncements}
            disabled={!settings}
            onCheckedChange={(next) => updateSettings.mutate({ email_announcements_enabled: next })}
          />
        </Row>
      </Panel>

      <Panel padding="lg">
        <Row
          title="Display currency"
          desc="Every price renders in this currency, on the web and in the mobile app — the choice is saved to your profile."
        >
          <select
            aria-label="Display currency"
            className={styles.currencySelect}
            value={displayCurrency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} · {c.name}
              </option>
            ))}
          </select>
        </Row>
      </Panel>

      <Panel padding="lg">
        <Row
          title="Appearance"
          desc="Light, dark, or follow your system — flips every token instantly."
        >
          <ThemeToggle />
        </Row>
      </Panel>

      <Panel padding="lg">
        <Row
          title="Sidebar position"
          desc="Pin the navigation rail to the left or right — on phones it sets which side the menu drawer slides in from."
        >
          <SegmentedControl
            aria-label="Sidebar position"
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            value={side}
            onChange={(v) => setSide(v)}
          />
        </Row>
        <Divider />
        <Row
          title="Collapse sidebar"
          desc="Use a compact, icon-only rail to give content more room (desktop & tablet)."
        >
          <Button variant="secondary" size="sm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </Row>
      </Panel>

      <Panel padding="lg">
        {canInstall && (
          <>
            <Row
              title="Install the app"
              desc="Add Loupe to your home screen — full-screen, with Scan and Vault shortcuts."
            >
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Download size={16} />}
                onClick={() => void install()}
              >
                Install
              </Button>
            </Row>
            <Divider />
          </>
        )}
        {showIosHint && (
          <>
            <Row
              title="Install the app"
              desc="In Safari, tap Share and choose “Add to Home Screen” for the full-screen app with Scan and Vault shortcuts."
            />
            <Divider />
          </>
        )}
        <Row
          title="Data source"
          desc={
            apiMode === "live"
              ? "Production Cloud Run backend — real market data."
              : "Local backend — your machine's data source for development and debugging."
          }
        >
          <SegmentedControl
            aria-label="Data source"
            options={[
              { value: "live", label: "Live" },
              { value: "local", label: "Local" },
            ]}
            value={apiMode}
            onChange={handleApiModeChange}
          />
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
