import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components";
import { AuroraField, Logo } from "@/assets";
import styles from "./NotFound.module.scss";

/** Catch-all 404 — a branded, self-contained page (no app/site chrome). */
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
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>This page got away from us</h1>
        <p className={styles.message}>
          The page you're looking for doesn't exist or may have moved. Let's get you back on track.
        </p>
        <div className={styles.actions}>
          <Link to="/">
            <Button leadingIcon={<Home size={16} />}>Back home</Button>
          </Link>
          <Link to="/cards">
            <Button variant="secondary" leadingIcon={<Compass size={16} />}>
              Browse the market
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
