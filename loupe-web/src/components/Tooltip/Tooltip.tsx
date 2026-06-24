import type { ReactNode } from "react";
import { Tooltip as RT } from "radix-ui";
import styles from "./Tooltip.module.scss";

export interface TooltipProps {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

/** Thin wrapper over Radix Tooltip — accessible, theme-styled, zero per-call boilerplate. */
export function Tooltip({ content, side = "top", children }: TooltipProps) {
  return (
    <RT.Root delayDuration={250}>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content className={styles.content} side={side} sideOffset={6}>
          {content}
          <RT.Arrow className={styles.arrow} />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}

/** Mount once near the app root so all tooltips share timing. */
// eslint-disable-next-line react-refresh/only-export-components -- re-export of the Radix provider, co-located with the Tooltip
export const TooltipProvider = RT.Provider;
