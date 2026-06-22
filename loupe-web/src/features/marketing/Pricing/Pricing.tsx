import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Infinity as InfinityIcon,
  LineChart,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { Button, SegmentedControl } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { usePro, FREE_CARD_LIMIT, PRO_PRICE_MONTHLY, PRO_PRICE_YEARLY } from "@/pro";
import { formatMoney } from "@/lib/format";
import styles from "./Pricing.module.scss";

type Interval = "monthly" | "yearly";

const FREE_PERKS = [
  `Track up to ${FREE_CARD_LIMIT} cards`,
  "Live, grade-aware valuations",
  "30-day price history",
  "Watchlist & a few price alerts",
  "One statement PDF",
];

const PRO_PERKS: Array<{ icon: typeof InfinityIcon; title: string; blurb: string }> = [
  {
    icon: InfinityIcon,
    title: "Unlimited cards",
    blurb: "Your entire collection — no 50-card ceiling.",
  },
  {
    icon: ScanLine,
    title: "Scanner auto-import",
    blurb: "Every Loupe Scanner capture lands in your vault.",
  },
  {
    icon: LineChart,
    title: "Full history & analytics",
    blurb: "All-time charts, cost basis, movers — no 30-day wall.",
  },
  {
    icon: BellRing,
    title: "Unlimited price alerts",
    blurb: "Get pinged the instant any card moves.",
  },
  {
    icon: FileText,
    title: "Tax & insurance statements",
    blurb: "One-click PDFs for underwriting and capital gains.",
  },
];

/** Small one-shot "reveal on scroll" — flips a flag the first time the section
 *  enters the viewport so the cards animate in. */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    // Safety net: never leave the cards stuck invisible if the observer
    // doesn't fire (e.g. already on-screen at mount, or a flaky environment).
    const t = window.setTimeout(() => setInView(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);
  return { ref, inView };
}

/**
 * Free vs Pro pricing band for the marketing landing. A distinct, mint-lit
 * "color section" between the carousels and the closing CTA: a monthly/yearly
 * toggle, two plans (Pro featured), and reveal-on-scroll animation. The Pro CTA
 * routes a guest to sign-up and opens the in-app paywall for a signed-in member.
 */
export function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, openPaywall } = usePro();
  const [interval, setInterval] = useState<Interval>("yearly");
  const { ref, inView } = useInView<HTMLElement>();

  const isYearly = interval === "yearly";
  const proPrice = isYearly ? PRO_PRICE_YEARLY / 12 : PRO_PRICE_MONTHLY;
  const savingsPct = Math.max(
    0,
    Math.round((1 - PRO_PRICE_YEARLY / (PRO_PRICE_MONTHLY * 12)) * 100),
  );

  function startPro() {
    if (!user) return navigate("/signup");
    if (isPro) return navigate("/app");
    openPaywall("generic");
  }

  return (
    <section ref={ref} className={styles.section} data-in={inView || undefined}>
      <div className={styles.aurora} aria-hidden />

      <div className={styles.head}>
        <p className={styles.eyebrow}>Membership</p>
        <h2 className={styles.title}>Start free. Go Pro when it pays off.</h2>
        <p className={styles.sub}>
          Browsing and a starter vault are free forever. Loupe Pro turns your
          collection into a real portfolio — unlimited, automated, and insured.
        </p>

        <div className={styles.toggle}>
          <SegmentedControl<Interval>
            aria-label="Billing interval"
            value={interval}
            onChange={setInterval}
            options={[
              { value: "yearly", label: savingsPct > 0 ? `Yearly · save ${savingsPct}%` : "Yearly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Free ── */}
        <div className={styles.card} data-plan="free" data-in={inView || undefined}>
          <div className={styles.cardHead}>
            <span className={styles.plan}>Free</span>
            <div className={styles.price}>
              <span className={styles.amount}>$0</span>
              <span className={styles.per}>forever</span>
            </div>
            <p className={styles.tagline}>Everything you need to start tracking.</p>
          </div>
          <ul className={styles.perks}>
            {FREE_PERKS.map((p) => (
              <li key={p} className={styles.perk}>
                <span className={styles.check}>
                  <Check size={14} />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            block
            onClick={() => navigate(user ? "/app" : "/signup")}
          >
            {user ? "Go to dashboard" : "Get started — free"}
          </Button>
        </div>

        {/* ── Pro (featured) ── */}
        <div className={styles.card} data-plan="pro" data-in={inView || undefined}>
          <span className={styles.ribbon}>
            <Sparkles size={12} /> 7-day free trial
          </span>
          <div className={styles.cardHead}>
            <span className={styles.plan}>
              Loupe <span className={styles.proWord}>Pro</span>
            </span>
            <div className={styles.price}>
              {/* key=interval re-mounts the number so it animates on toggle */}
              <span key={interval} className={styles.amount}>
                {formatMoney(proPrice)}
              </span>
              <span className={styles.per}>/ month</span>
            </div>
            <p className={styles.tagline}>
              {isYearly
                ? `Billed ${formatMoney(PRO_PRICE_YEARLY)} a year`
                : "Billed monthly · cancel anytime"}
            </p>
          </div>
          <ul className={styles.perks}>
            {PRO_PERKS.map((p) => (
              <li key={p.title} className={styles.perk} data-rich>
                <span className={styles.perkIcon}>
                  <p.icon size={15} />
                </span>
                <span className={styles.perkText}>
                  <strong>{p.title}</strong>
                  <span>{p.blurb}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button
            block
            leadingIcon={<Sparkles size={16} />}
            trailingIcon={<ArrowRight size={16} />}
            onClick={startPro}
          >
            {isPro ? "Go to dashboard" : "Start 7-day free trial"}
          </Button>
          <p className={styles.fine}>No charge today · cancel before day 7</p>
        </div>
      </div>
    </section>
  );
}
