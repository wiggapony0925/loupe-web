import { Link } from "react-router-dom";
import { Button } from "@/components";
import { SitePage, SiteSection } from "../SitePage/SitePage";
import styles from "./About.module.scss";

const VALUES = [
  {
    title: "Forensic accuracy",
    body: "Every valuation is grade-aware and sourced from real, public marketplace data — never a guess.",
  },
  {
    title: "Collector-first",
    body: "We build for the people who actually own the cards. Your vault is a portfolio, not a sales funnel.",
  },
  {
    title: "Transparent by default",
    body: "Prices are aggregated, dated, and labelled. We show our work so you can trust the number.",
  },
];

const STATS = [
  { value: "6", label: "Trading-card games tracked" },
  { value: "Live", label: "Marketplace pricing" },
  { value: "Web + iOS", label: "One account, every device" },
];

/** About Loupe — mission, values, and what the product is. */
export function About() {
  return (
    <SitePage
      eyebrow="About"
      title="Forensic card intelligence for collectors"
      lead="Loupe turns a shoebox of cards into a live portfolio. Real-time prices, grade-aware valuations, and a vault that tracks what you own across web and mobile."
      hero={
        <Link to="/cards">
          <Button size="lg">Explore the market</Button>
        </Link>
      }
    >
      <div className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.stat__value}>{s.value}</span>
            <span className={styles.stat__label}>{s.label}</span>
          </div>
        ))}
      </div>

      <SiteSection title="What we believe">
        <div className={styles.values}>
          {VALUES.map((v) => (
            <div key={v.title} className={styles.value}>
              <h3 className={styles.value__title}>{v.title}</h3>
              <p className={styles.value__body}>{v.body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection title="Where we're going">
        <p className={styles.copy}>
          We started Loupe because tracking a collection meant spreadsheets, screenshots, and stale eBay
          tabs. We think collectors deserve the same tooling investors take for granted — clean data,
          honest charts, and a single place that always knows what your cards are worth. We're just
          getting started. Want to help build it? <Link to="/careers">See open roles</Link>.
        </p>
      </SiteSection>
    </SitePage>
  );
}
