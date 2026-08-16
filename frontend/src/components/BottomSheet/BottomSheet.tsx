/**
 * BottomSheet — the ONLY modal surface in trackify. Every transaction
 * interaction happens in one of these; there are no popup alerts anywhere.
 *
 * Behavior: portal over the app, backdrop tap / Escape / drag-down to
 * dismiss, body scroll locked while open, safe-area aware. Drag uses pointer
 * events so it works identically for touch (Capacitor) and mouse (web).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHaptics } from '@/hooks/useHaptics';

const DISMISS_DISTANCE = 110;
const CLOSE_ANIMATION_MS = 220;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
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

  useEffect(() => {
    if (!mounted) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    <div className={`bottom-sheet${closing ? ' bottom-sheet--closing' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="bottom-sheet__backdrop"
        aria-label="Close"
        onClick={requestClose}
      />
      <div
        ref={panelRef}
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
