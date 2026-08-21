/**
 * BottomSheet — the ONLY modal surface in trackify. Every transaction
 * interaction happens in one of these; there are no popup alerts anywhere.
 *
 * Behavior: portal over the app, backdrop tap / Escape / drag-down to
 * dismiss, body scroll locked while open, safe-area aware. Drag uses pointer
 * events so it works identically for touch (Capacitor) and mouse (web).
 * On desktop (≥ md) it renders as a centered dialog and the drag grip is
 * hidden, so pointer-drag can't start there.
 *
 * Because the portal appends to the END of <body>, a keyboard user would
 * otherwise Tab straight past the dialog into the page behind it — so this
 * component owns real modal focus behaviour: focus moves in on open, Tab is
 * contained, and focus is restored to the trigger on close.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHaptics } from '@/hooks/useHaptics';

const DISMISS_DISTANCE = 110;
const CLOSE_ANIMATION_MS = 220;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when the sheet shows no visible title (e.g. TagSheet). */
  ariaLabel?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, ariaLabel, children }: BottomSheetProps) {
  const haptics = useHaptics();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const requestClose = useCallback(() => {
    setClosing(true);
    haptics.impactLight();
    window.setTimeout(() => {
      setClosing(false);
      setMounted(false);
      onClose();
    }, CLOSE_ANIMATION_MS);
  }, [haptics, onClose]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDragY(0);
    } else {
      setMounted(false);
    }
  }, [open]);

  // Scroll lock — the page behind a sheet must not move.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Modal focus: move in on open, contain Tab, restore to the trigger after.
  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the first control, else the panel itself (tabIndex -1) so the
    // very next Tab lands inside the dialog rather than behind it.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? lastItem : firstItem).focus();
      } else if (event.shiftKey && active === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [mounted, requestClose]);

  const onPointerDown = (event: React.PointerEvent): void => {
    dragStart.current = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent): void => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStart.current));
  };

  const onPointerUp = (): void => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > DISMISS_DISTANCE) requestClose();
    else setDragY(0);
  };

  if (!mounted && !closing) return null;

  return createPortal(
    <div
      className={`bottom-sheet${closing ? ' bottom-sheet--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? ariaLabel}
    >
      <button
        type="button"
        className="bottom-sheet__backdrop"
        aria-label="Close"
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`bottom-sheet__panel${dragStart.current !== null ? ' bottom-sheet__panel--dragging' : ''}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="bottom-sheet__grip"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="bottom-sheet__handle" />
        </div>
        {title ? <h2 className="bottom-sheet__title">{title}</h2> : null}
        <div className="bottom-sheet__content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
