import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { NOT_FOUND } from "@loupe/marketing";
import { Button } from "@/components";
import { AuroraField, Logo } from "@/assets";
import styles from "./NotFound.module.scss";

/**
 * Catch-all 404 — a branded, self-contained page (no app/site chrome).
 *
 * The wording lives in `@loupe/marketing` because the Expo app renders the
 * same dead end (`app/+not-found.tsx`); keeping the strings here meant a copy
 * edit only ever reached one of the two clients.
 */
export function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.aurora}>
        <AuroraField variant="subtle" />
      </div>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Loupe home">
          <Logo size={28} />
        </Link>
        <p className={styles.code}>{NOT_FOUND.code}</p>
        <h1 className={styles.title}>{NOT_FOUND.title}</h1>
        <p className={styles.message}>{NOT_FOUND.message}</p>
        <div className={styles.actions}>
          <Link to="/">
            <Button leadingIcon={<Home size={16} />}>{NOT_FOUND.ctaHome}</Button>
          </Link>
          <Link to="/cards">
            <Button variant="secondary" leadingIcon={<Compass size={16} />}>
              {NOT_FOUND.ctaBrowse}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
