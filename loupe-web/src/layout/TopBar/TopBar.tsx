import { useNavigate } from "react-router-dom";
import { DropdownMenu } from "radix-ui";
import { Bell, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { IconButton } from "@/components/IconButton/IconButton";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { SearchCombobox } from "@/components";
import { ScanButton } from "@/features/scan";
import { ProPill } from "@/pro";
import { useAuth } from "@/auth/AuthProvider";
import { useUiStore } from "@/stores/uiStore";
import { AppNavDrawer } from "../AppNavDrawer/AppNavDrawer";
import styles from "./TopBar.module.scss";

/** Sticky top bar — live search (shared with the storefront), theme, and account menu.
 *  On phones it also hosts the nav hamburger, pinned to the user's chosen side. */
export function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const side = useUiStore((s) => s.sidebarSide);
  const name = user?.display_name || user?.email || "Account";

  return (
    <header className={styles.topbar}>
      {side === "left" && <AppNavDrawer triggerClassName={styles.menuBtn} />}
      <SearchCombobox
        className={styles.search}
        onSearch={(query, tcg) => {
          const p = new URLSearchParams();
          if (query) p.set("q", query);
          if (tcg && tcg !== "all") p.set("game", tcg);
          void navigate(`/cards${p.toString() ? `?${p}` : ""}`);
        }}
        onSelectCard={(c) => navigate(`/cards/${encodeURIComponent(c.id)}`)}
        onSelectSealed={(p) => navigate(`/sealed/${encodeURIComponent(p.id)}`)}
      />

      <div className={styles.actions}>
        <ProPill />
        <ScanButton label="Scan" size="sm" />
        <span className={styles.themeToggle}>
          <ThemeToggle compact />
        </span>
        <Tooltip content="Notifications">
          <IconButton label="Notifications">
            <Bell />
          </IconButton>
        </Tooltip>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={styles.account} aria-label="Account menu">
              <Avatar name={name} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.menu} align="end" sideOffset={8}>
              <div className={styles.menuHeader}>
                <span className={styles.menuName}>{name}</span>
                {user?.email && <span className={styles.menuEmail}>{user.email}</span>}
              </div>
              <DropdownMenu.Item className={styles.menuItem} onSelect={() => navigate("/app/settings")}>
                <SettingsIcon size={16} /> Settings
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={styles.menuItem}
                onSelect={() => {
                  logout();
                  void navigate("/");
                }}
              >
                <LogOut size={16} /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {side === "right" && <AppNavDrawer triggerClassName={styles.menuBtn} />}
      </div>
    </header>
  );
}
