import { Home, Wallet, LineChart, BarChart3, Star, FileText, Settings, ScanSearch, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  /** Compact label for the phone bottom tab bar (falls back to `label`). */
  short?: string;
  icon: LucideIcon;
  end?: boolean;
  /** Optional feature-flag key — the item is hidden when the flag is off. */
  flag?: string;
}

/** Primary navigation — the Chase-style left rail (under /app). */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/app", label: "Command Center", short: "Home", icon: Home, end: true },
  { to: "/app/vault", label: "Vault", icon: Wallet },
  { to: "/app/markets", label: "Markets", icon: LineChart, flag: "web_markets" },
  { to: "/app/analytics", label: "Analytics", short: "Stats", icon: BarChart3, flag: "web_analytics" },
  { to: "/app/watchlist", label: "Watchlist", short: "Watch", icon: Star, flag: "web_watchlist" },
  { to: "/grade", label: "Loupe Playground", short: "Play", icon: ScanSearch },
  { to: "/app/statements", label: "Statements", short: "Docs", icon: FileText },
];

/** Footer navigation, pinned to the bottom of the rail. */
export const FOOTER_NAV: NavItem[] = [{ to: "/app/settings", label: "Settings", icon: Settings }];
