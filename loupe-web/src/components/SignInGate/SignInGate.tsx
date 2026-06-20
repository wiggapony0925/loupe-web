import { Lock } from "lucide-react";
import { Panel } from "@/components/Panel/Panel";
import { Button } from "@/components/Button/Button";
import styles from "./SignInGate.module.scss";

export interface SignInGateProps {
  title: string;
  message: string;
}

/**
 * Real production gate for authenticated surfaces (Vault, Watchlist). The
 * backend returns 401 for `/v1/home/feed`, `/v1/grades`, etc., so rather than
 * fabricating data we prompt the user to connect their account.
 */
export function SignInGate({ title, message }: SignInGateProps) {
  return (
    <Panel padding="lg" className={styles.gate}>
      <span className={styles.icon}>
        <Lock />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button>Sign in</Button>
        <Button variant="secondary">Create account</Button>
      </div>
    </Panel>
  );
}
