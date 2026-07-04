import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DropdownMenu } from "radix-ui";
import { LogOut, Search, Settings as SettingsIcon, X } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const search = (query: string, tcg: string) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (tcg && tcg !== "all") p.set("game", tcg);
    void navigate(`/cards${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <header className={styles.topbar}>
      {side === "left" && <AppNavDrawer triggerClassName={styles.menuBtn} />}
      <SearchCombobox
        className={styles.search}
        onSearch={search}
        onSelectCard={(c) => navigate(`/cards/${encodeURIComponent(c.id)}`)}
        onSelectSealed={(p) => navigate(`/sealed/${encodeURIComponent(p.id)}`)}
      />

      {/* Phones: search expands into a full-screen sheet instead of a sliver. */}
      <button
        type="button"
        className={styles.searchTrigger}
        aria-label="Search cards"
        onClick={() => setSearchOpen(true)}
      >
        <Search size={18} />
        <span>Search</span>
      </button>
      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.sheetOverlay} />
          <Dialog.Content className={styles.sheet} aria-describedby={undefined}>
            <div className={styles.sheetHead}>
              <Dialog.Title className={styles.sheetTitle}>Search</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className={styles.sheetClose} aria-label="Close search">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <SearchCombobox
              size="lg"
              onSearch={(q, tcg) => {
                setSearchOpen(false);
                search(q, tcg);
              }}
              onSelectCard={(c) => {
                setSearchOpen(false);
                void navigate(`/cards/${encodeURIComponent(c.id)}`);
              }}
              onSelectSealed={(p) => {
                setSearchOpen(false);
                void navigate(`/sealed/${encodeURIComponent(p.id)}`);
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className={styles.actions}>
        <ProPill />
        <ScanButton label="Scan" size="sm" />
        <span className={styles.themeToggle}>
          <ThemeToggle compact />
        </span>
        <span className={styles.bell}>
          <NotificationsBell />
        </span>

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
