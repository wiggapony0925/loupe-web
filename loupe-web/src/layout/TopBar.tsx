import { useNavigate } from "react-router-dom";
import { DropdownMenu } from "radix-ui";
import { Bell, LogOut, Settings as SettingsIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar/Avatar";
import { IconButton } from "@/components/IconButton/IconButton";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { SearchCombobox } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import styles from "./TopBar.module.scss";

/** Sticky top bar — live search (shared with the storefront), theme, and account menu. */
export function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const name = user?.display_name || user?.email || "Account";

  return (
    <header className={styles.topbar}>
      <SearchCombobox
        className={styles.search}
        onSearch={(query) => navigate(`/cards${query ? `?q=${encodeURIComponent(query)}` : ""}`)}
        onSelectCard={(c) => navigate(`/cards/${encodeURIComponent(c.id)}`)}
      />

      <div className={styles.actions}>
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
                  navigate("/");
                }}
              >
                <LogOut size={16} /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
