import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components";
import { Logo } from "@/assets";
import styles from "./AuthLayout.module.scss";

/** Centered, branded shell for the login + signup screens. */
export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <Link to="/" className={styles.brand} aria-label="Loupe home">
          <Logo size={26} />
        </Link>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
        <p className={styles.footer}>{footer}</p>
      </main>
    </div>
  );
}
