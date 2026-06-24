import { Lock } from "lucide-react";
import { Panel } from "@/components/Panel/Panel";
import { Button } from "@/components/Button/Button";
import { useRequestSignIn } from "@/hooks/useNavKey";
import type { NavCardRef, NavIntent } from "@/lib/navKeys";
import styles from "./SignInGate.module.scss";

export interface SignInGateProps {
  title: string;
  message: string;
  /** What the user was trying to do — carried through sign-in as a nav key. */
  intent?: NavIntent;
  /** The card in context, if this gate is on a card surface. */
  card?: NavCardRef;
}

/**
 * Real production gate for authenticated surfaces (Vault, Watchlist). The
 * backend returns 401 for `/v1/home/feed`, `/v1/grades`, etc., so rather than
 * fabricating data we prompt the user to connect their account — minting a nav
 * key so they land back here (and resume `intent`) after signing in.
 */
export function SignInGate({ title, message, intent, card }: SignInGateProps) {
  const requestSignIn = useRequestSignIn();
  return (
    <Panel padding="lg" className={styles.gate}>
      <span className={styles.icon}>
        <Lock />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button onClick={() => requestSignIn({ intent, card, src: "sign-in-gate" })}>
          Sign in
        </Button>
        <Button
          variant="secondary"
          onClick={() => requestSignIn({ intent, card, src: "sign-in-gate", signup: true })}
        >
          Create account
        </Button>
      </div>
    </Panel>
  );
}
