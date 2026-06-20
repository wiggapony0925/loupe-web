import { Link } from "react-router-dom";
import { Github, Instagram, Linkedin, Twitter } from "lucide-react";
import { Logo } from "@/assets";
import { API_DOCS_URL, SOCIAL_LINKS } from "@/lib/site";
import styles from "./Footer.module.scss";

interface FooterLink {
  label: string;
  to: string;
  /** When true, `to` is an absolute URL opened in a new tab. */
  external?: boolean;
}
interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    heading: "Marketplace",
    links: [
      { label: "Browse all cards", to: "/cards" },
      { label: "Pokémon", to: "/cards?game=pokemon" },
      { label: "Magic: The Gathering", to: "/cards?game=magic" },
      { label: "Yu-Gi-Oh!", to: "/cards?game=yugioh" },
      { label: "Lorcana", to: "/cards?game=lorcana" },
      { label: "Loupe Scanner", to: "/scanner" },
    ],
  },
  {
    heading: "Your account",
    links: [
      { label: "The Vault", to: "/app/vault" },
      { label: "Watchlist", to: "/app/watchlist" },
      { label: "Command center", to: "/app" },
      { label: "Create account", to: "/signup" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Loupe", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Help center", to: "/help" },
      { label: "Developer API", to: API_DOCS_URL, external: true },
      { label: "System status", to: "/status" },
      { label: "Contact us", to: "/contact" },
    ],
  },
];

const SOCIALS = [
  { label: "X", href: SOCIAL_LINKS.x, Icon: Twitter },
  { label: "GitHub", href: SOCIAL_LINKS.github, Icon: Github },
  { label: "LinkedIn", href: SOCIAL_LINKS.linkedin, Icon: Linkedin },
  { label: "Instagram", href: SOCIAL_LINKS.instagram, Icon: Instagram },
];

const LEGAL = [
  { label: "Terms", to: "/legal/terms" },
  { label: "Privacy", to: "/legal/privacy" },
  { label: "Cookies", to: "/legal/cookies" },
];

/** Site-wide footer — brand, navigation columns, social, and legal bar. */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footer__inner}>
        <div className={styles.footer__brand}>
          <Logo size={30} />
          <p className={styles.footer__tagline}>
            Forensic card intelligence. Real-time prices, grade-aware valuations, and a vault that tracks your
            collection like a portfolio — on web and mobile.
          </p>
          <div className={styles.footer__social}>
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                className={styles["footer__social-link"]}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <nav className={styles.footer__cols}>
          {COLUMNS.map((col) => (
            <div key={col.heading} className={styles.footer__col}>
              <h3 className={styles.footer__heading}>{col.heading}</h3>
              <ul className={styles.footer__list}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.to} className={styles.footer__link} target="_blank" rel="noreferrer">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className={styles.footer__link}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.footer__legal}>
        <span>© {new Date().getFullYear()} Loupe. All rights reserved.</span>
        <div className={styles["footer__legal-links"]}>
          {LEGAL.map((l) => (
            <Link key={l.label} to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>
        <span className={styles.footer__disclaimer}>
          Prices are indicative, aggregated from public marketplaces, and not investment advice.
        </span>
      </div>
    </footer>
  );
}
