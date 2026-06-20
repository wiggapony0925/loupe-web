import { useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Logo } from "@/assets";
import { cx } from "@/lib/cx";
import styles from "./NavDrawer.module.scss";

export interface NavDrawerProps {
  /** Drawer body. Receives a `close` callback to dismiss on link tap. */
  children: (close: () => void) => ReactNode;
  /** Side the panel slides in from. */
  side?: "left" | "right";
  /** Extra class on the hamburger trigger (e.g. to control when it shows). */
  triggerClassName?: string;
}

/**
 * Slide-in navigation drawer for phones + tablets — a hamburger that opens a
 * focus-trapped, glass side panel (Radix Dialog). The trigger hides itself at
 * `lg` so desktop keeps its inline nav; consumers move their links into the
 * drawer body for the small-screen layout.
 */
export function NavDrawer({ children, side = "right", triggerClassName }: NavDrawerProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={cx(styles.trigger, triggerClassName)} aria-label="Open menu">
          <Menu size={22} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={cx(styles.panel, styles[`panel--${side}`])}>
          <div className={styles.head}>
            <Logo size={24} />
            <Dialog.Close className={styles.close} aria-label="Close menu">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Title className={styles.srTitle}>Menu</Dialog.Title>
          <div className={styles.body}>{children(close)}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
