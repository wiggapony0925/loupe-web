import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { Button } from "@/components/Button/Button";
import styles from "./ConfirmDialog.module.scss";

export type ConfirmTone = "default" | "danger" | "mint";

export interface ConfirmOptions {
  title: string;
  /** Body copy — the "what will happen" explanation. */
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` = red confirm, `mint` = Pro/positive, `default` = neutral primary. */
  tone?: ConfirmTone;
}

type Resolver = (ok: boolean) => void;

/** Imperative confirm: `const ok = await confirm({ title, message, tone })`. */
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * App-wide "are you sure?" dialog. One instance, promise-based, so any action
 * can gate itself with a single `await confirm(...)` — no per-call modal state.
 * Used for state-changing toggles (kill switch, comp-to-Pro, deletes).
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOpts(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const tone = opts?.tone ?? "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onOpenChange={(o) => {
          // Closing via overlay / Esc / X counts as "cancel".
          if (!o) settle(false);
        }}
        size="sm"
        title={opts?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {opts?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              leadingIcon={tone === "mint" ? <Sparkles size={16} /> : undefined}
              onClick={() => settle(true)}
            >
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <div className={styles.body} data-tone={tone}>
          {tone !== "default" && (
            <span className={styles.icon} aria-hidden>
              {tone === "danger" ? <AlertTriangle size={20} /> : <Sparkles size={20} />}
            </span>
          )}
          {opts?.message && <div className={styles.message}>{opts.message}</div>}
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Returns the imperative `confirm()` function. Throws outside the provider. */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}
