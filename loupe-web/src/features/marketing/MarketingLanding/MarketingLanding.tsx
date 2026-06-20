import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  LineChart,
  Package,
  PieChart,
  Scale,
  ScanLine,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { usePriceHistory, useTrending } from "@loupe/core";
import { Button, ThemeToggle, Skeleton, CardThumb, Delta, Footer, CardPriceChart, ScrollToTop, NavDrawer } from "@/components";
import { AuroraField, Logo } from "@/assets";
import { DeviceReveal } from "../DeviceReveal/DeviceReveal";
import { TrendingCarousels } from "../TrendingCarousels/TrendingCarousels";
import { formatMoney } from "@/lib/format";
import { cx } from "@/lib/cx";
import { useAuth } from "@/auth/AuthProvider";
import styles from "./MarketingLanding.module.scss";

/** Public, unauthenticated home — the informational page (Robinhood-style). */
export function MarketingLanding() {
  const { data, isLoading } = useTrending();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Top trending cards → a fanned stack of 3 in the hero. Prefer cards with
  // both art and a price so the hero never features a "—" priceless card;
  // fall back to any with art if the priced set is too thin.
  const priced = (data ?? []).filter((c) => c.imageUrl && c.price);
  const pool = priced.length >= 3 ? priced : (data ?? []).filter((c) => c.imageUrl);
  const featured = pool[0];
  const behind = pool.slice(1, 3);
  const { data: featuredHist } = usePriceHistory(featured?.id ?? "");
  const featuredChange = featuredHist?.changePct;

  return (
    <div className={styles.page}>
      <ScrollToTop />
      <MarketingNav />

      <header className={styles.hero}>
        <div className={styles.heroAurora}>
          <AuroraField variant="hero" />
        </div>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Loupe · Forensic Card Intelligence</p>
          <h1 className={styles.headline}>
            Your cards are an asset.
            <br />
            Trade them like one.
          </h1>
          <p className={styles.sub}>
            Track every card like a position. Real-time prices, grade-aware valuations, and a vault that
            tracks your collection like a portfolio — on the web and in your pocket.
          </p>
          <div className={styles.ctas}>
            <Button size="lg" trailingIcon={<ArrowRight size={18} />} onClick={() => navigate("/cards")}>
              Browse cards
            </Button>
            {user ? (
              <Button size="lg" variant="secondary" onClick={() => navigate("/app")}>
                Go to dashboard
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => navigate("/signup")}>
                Get started — free
              </Button>
            )}
          </div>
          <p className={styles.disclaimer}>Live market data shown below. No mock numbers — ever.</p>
        </div>

        <div className={styles.heroCard}>
          {isLoading || !featured ? (
            <Skeleton width={300} height={420} radius={18} />
          ) : (
            <div className={styles.cardStack}>
              {behind[1] && (
                <CardThumb
                  src={behind[1].imageUrl}
                  alt={behind[1].name}
                  size="lg"
                  className={cx(styles.stackCard, styles.stackBack2)}
                />
              )}
              {behind[0] && (
                <CardThumb
                  src={behind[0].imageUrl}
                  alt={behind[0].name}
                  size="lg"
                  className={cx(styles.stackCard, styles.stackBack1)}
                />
              )}
              <button
                type="button"
                className={styles.glassCard}
                onClick={() => navigate(`/cards/${encodeURIComponent(featured.id)}`)}
                aria-label={`View ${featured.name}`}
              >
                <CardThumb src={featured.imageUrl} alt={featured.name} size="lg" />
                <div className={styles.glassMeta}>
                  <span className={styles.glassName}>{featured.name}</span>
                  <span className={styles.glassSet}>{featured.setName}</span>
                  <div className={styles.glassPrice}>
                    <span>{featured.price ? formatMoney(featured.price) : "—"}</span>
                    {featuredChange !== undefined && <Delta percent={featuredChange} variant="arrow" />}
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      <HowItWorks />

      {featured && featuredHist && featuredHist.points.length > 1 && (
        <section className={styles.showcase}>
          <div className={styles.showcaseText}>
            <p className={styles.eyebrow}>Live markets</p>
            <h2 className={styles.showcaseTitle}>A real-time market for every card.</h2>
            <p className={styles.showcaseSub}>
              Every card gets a custom, interactive chart you can scrub by the day — the same model you know
              from Robinhood and Webull, powered by live sales data, never mock numbers.
            </p>
            <Button
              variant="secondary"
              trailingIcon={<ArrowRight size={16} />}
              onClick={() => navigate(`/cards/${encodeURIComponent(featured.id)}`)}
            >
              Open {featured.name}
            </Button>
          </div>
          <div className={styles.showcaseChart}>
            {/* The same reusable, range-aware chart as the card detail — 1W…ALL
                back to the card's release, not a single clipped 30-day series. */}
            <CardPriceChart cardId={featured.id} cardName={featured.name} height={260} />
          </div>
        </section>
      )}

      <section id="features" className={styles.features}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <f.Icon />
            </span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <DeviceReveal />

      <TrendingCarousels />

      <section className={styles.cta}>
        <h2>{user ? "Your collection, in real time." : "Start tracking your collection today."}</h2>
        <p className={styles.ctaSub}>
          {user
            ? "Jump back into your dashboard for live prices, your watchlist, and portfolio analytics."
            : "Free to browse — no account needed. Sign up to build your vault, set price alerts, and watch the market move in real time."}
        </p>
        <Button
          size="lg"
          trailingIcon={<ArrowRight size={18} />}
          onClick={() => navigate(user ? "/app" : "/signup")}
        >
          {user ? "Go to dashboard" : "Create your free account"}
        </Button>
      </section>

      <Footer />
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    Icon: Search,
    title: "Search any card",
    body: "Find any Pokémon, Magic, Yu-Gi-Oh!, Lorcana, or One Piece card across millions of live listings.",
  },
  {
    n: "02",
    Icon: Wallet,
    title: "Track it like a position",
    body: "Add it to your vault and watch real-time prices, grade-aware values, and 1-year change.",
  },
  {
    n: "03",
    Icon: ScanLine,
    title: "Scan to grade",
    body: "Drop it in the Loupe Scanner for an instant PSA / BGS estimate before you submit.",
  },
];

function HowItWorks() {
  return (
    <section className={styles.steps}>
      <div className={styles.stepsHead}>
        <p className={styles.eyebrow}>How it works</p>
        <h2 className={styles.stepsTitle}>From shoebox to portfolio in three steps.</h2>
      </div>
      <div className={styles.stepsGrid}>
        {STEPS.map((s) => (
          <div key={s.n} className={styles.step}>
            <span className={styles.stepNum}>{s.n}</span>
            <span className={styles.stepIcon}>
              <s.Icon size={22} />
            </span>
            <h3 className={styles.stepTitle}>{s.title}</h3>
            <p className={styles.stepBody}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    Icon: LineChart,
    title: "Real-time markets",
    body: "Live prices and daily history in custom, scrubbable charts inspired by Robinhood, Webull, and Yahoo Finance.",
  },
  {
    Icon: ShieldCheck,
    title: "Grade-aware vault",
    body: "PSA, CGC and BGS valuations, cost basis, and population — your collection valued like a real portfolio.",
  },
  {
    Icon: PieChart,
    title: "Portfolio analytics",
    body: "Total value, gainers and losers, and how your collection is allocated across sets and games.",
  },
  {
    Icon: BellRing,
    title: "Price alerts & watchlist",
    body: "Star any card and get notified the moment it crosses the price you care about.",
  },
  {
    Icon: Scale,
    title: "Compare any two cards",
    body: "Put two cards or grades side by side and compare price, population, and trend at a glance.",
  },
  {
    Icon: Package,
    title: "Sealed & packs",
    body: "Track sealed boxes and packs alongside singles, with the same live pricing.",
  },
];

/** Top navigation bar for the marketing site — auth-aware (no login/register when signed in). */
function MarketingNav() {
  const { user } = useAuth();
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand} aria-label="Loupe home">
        <Logo size={26} />
      </Link>
      <div className={styles.navLinks}>
        <Link to="/cards">Markets</Link>
        <Link to={user ? "/app/vault" : "/login"}>Vault</Link>
        <Link to="/scanner">Scanner</Link>
      </div>
      {/* Desktop actions (≥ lg) */}
      <div className={styles.navActions}>
        <ThemeToggle compact />
        {user ? (
          <Link to="/app">
            <Button size="sm" trailingIcon={<ArrowRight size={16} />}>
              Go to dashboard
            </Button>
          </Link>
        ) : (
          <>
            <Link to="/login" className={styles.loginLink}>
              Log in
            </Link>
            <Link to="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </>
        )}
      </div>

      {/* Phone + tablet: a primary CTA + the drawer (< lg) */}
      <div className={styles.navMobile}>
        <Link to={user ? "/app" : "/signup"}>
          <Button size="sm">{user ? "Dashboard" : "Sign up"}</Button>
        </Link>
        <NavDrawer>
          {(close) => (
            <nav className={styles.drawer}>
              <Link to="/cards" className={styles.drawer__link} onClick={close}>
                Markets
              </Link>
              <Link
                to={user ? "/app/vault" : "/login"}
                className={styles.drawer__link}
                onClick={close}
              >
                Vault
              </Link>
              <Link to="/scanner" className={styles.drawer__link} onClick={close}>
                Scanner
              </Link>
              {!user && (
                <Link to="/login" className={styles.drawer__link} onClick={close}>
                  Log in
                </Link>
              )}
              <div className={styles.drawer__footer}>
                <ThemeToggle compact />
                <Link
                  to={user ? "/app" : "/signup"}
                  className={styles.drawer__cta}
                  onClick={close}
                >
                  <Button size="md" block trailingIcon={<ArrowRight size={16} />}>
                    {user ? "Go to dashboard" : "Create your account"}
                  </Button>
                </Link>
              </div>
            </nav>
          )}
        </NavDrawer>
      </div>
    </nav>
  );
}
