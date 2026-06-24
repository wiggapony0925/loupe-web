import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { reportError } from "@/observability/sentry";
import styles from "./ErrorBoundary.module.scss";

/**
 * Themed error fallback — shared by the class `ErrorBoundary` (render crashes)
 * and the router's `errorElement` (route load/render errors). Keeps the brand
 * surface instead of a blank screen, and always offers a way out.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Reloading usually fixes it.",
  detail,
  onReload,
}: {
  title?: string;
  message?: string;
  detail?: string | null;
  onReload?: () => void;
}) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.error__icon}>
        <AlertTriangle size={24} />
      </span>
      <h1 className={styles.error__title}>{title}</h1>
      <p className={styles.error__message}>{message}</p>
      {detail && import.meta.env.DEV && (
        <pre className={styles.error__detail}>{detail}</pre>
      )}
      <div className={styles.error__actions}>
        <button
          type="button"
          className={styles.error__primary}
          onClick={() => (onReload ? onReload() : window.location.reload())}
        >
          Reload
        </button>
        <a href="/" className={styles.error__secondary}>
          Go home
        </a>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-level error boundary — the last line of defence against a white screen.
 * Catches render-time errors anywhere below it, logs them, and shows the themed
 * fallback. Render errors can't be caught by try/catch, so this MUST be a class.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to the console and to Sentry (no-op unless a DSN is configured).
    console.error("[ErrorBoundary]", error, info.componentStack);
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return <ErrorState detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}
