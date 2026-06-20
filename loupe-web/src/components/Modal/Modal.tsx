import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./Modal.module.scss";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/** Reusable accessible modal (Radix Dialog) — themed, focus-trapped, dark-correct. */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.modal__overlay} />
        <Dialog.Content className={cx(styles.modal, styles[`modal--${size}`])}>
          <div className={styles.modal__head}>
            {title ? (
              <Dialog.Title className={styles.modal__title}>{title}</Dialog.Title>
            ) : (
              <Dialog.Title className={styles.modal__srTitle}>Dialog</Dialog.Title>
            )}
            <Dialog.Close className={styles.modal__close} aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className={styles.modal__desc}>{description}</Dialog.Description>}
          {children && <div className={styles.modal__body}>{children}</div>}
          {footer && <div className={styles.modal__footer}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
