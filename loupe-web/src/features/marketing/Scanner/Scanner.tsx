import { useState } from "react";
import { Check, Minus, Plus, ScanLine, ShieldCheck, Sparkles, Truck, Users, Cpu, Wifi, Zap } from "lucide-react";
import { usePublicTrending, useWaitlistStats, type CardSummary } from "@loupe/core";
import { Button, TiltCard, CardThumb } from "@/components";
import { WaitlistCheckout } from "../WaitlistCheckout/WaitlistCheckout";
import {
  SCANNER_FAQ,
  SCANNER_HIGHLIGHTS,
  SCANNER_LIST_PRICE,
  SCANNER_SPECS,
  SCANNER_SUBGRADES,
  scannerPriceLabel,
} from "../scannerProduct";
import styles from "./Scanner.module.scss";

const MAX_QTY = 5;
const HL_ICONS = [ScanLine, Sparkles, Wifi, Cpu];

/**
 * Loupe Scanner product page — an Amazon-style listing in our theme. The
 * showcase puts a *real* trending Pokémon card in the device with a live
 * grade-estimate HUD (the same card-forward treatment as the mobile app),
 * and the buy CTA opens the waitlist "checkout": pressing it reserves a spot
 * rather than charging a card.
 */
export function Scanner() {
  const [qty, setQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { data: stats } = useWaitlistStats();
  const { data: cards } = usePublicTrending({ tcg: "pokemon", limit: 8 });

  const withArt = (cards ?? []).filter((c) => c.imageUrl);
  const hero: CardSummary | undefined = withArt[0];
  const strip = withArt.slice(1, 5);
  const reserved = stats?.total ?? 0;

  return (
    <div className={styles.scanner}>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <span>Hardware</span>
        <span aria-hidden>›</span>
        <span className={styles.crumbs__current}>Loupe Scanner</span>
      </nav>

      <div className={styles.hero}>
        {/* Showcase — real card + grade HUD */}
        <div className={styles.gallery}>
          <div className={styles.stage}>
            <span className={styles.stage__tag}>Pre-order</span>
            <div className={styles.stage__scan}>
              {hero ? (
                <TiltCard className={styles.stage__tilt}>
                  <CardThumb src={hero.imageUrl} alt={hero.name} className={styles.stage__card} />
                </TiltCard>
              ) : (
                <div className={styles.stage__cardFallback} aria-hidden />
              )}
              <div className={styles.stage__beam} aria-hidden />
            </div>

            <div className={styles.hud}>
              <div className={styles.hud__head}>
                <span className={styles.hud__dot} />
                Live grade estimate
              </div>
              <div className={styles.hud__grades}>
                {SCANNER_SUBGRADES.map((g) => (
                  <div key={g.label} className={styles.hud__grade}>
                    <span className={styles.hud__label}>{g.label}</span>
                    <span className={styles.hud__bar}>
                      <span style={{ width: `${(g.value / 10) * 100}%` }} />
                    </span>
                    <span className={styles.hud__value}>{g.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.hud__verdict}>
                <span className={styles.hud__psa}>PSA 10</span>
                <span className={styles.hud__pill}>
                  <Check size={13} /> Gem-mint candidate
                </span>
              </div>
            </div>
          </div>

          {strip.length > 0 && (
            <div className={styles.strip}>
              <span className={styles.strip__label}>Recent scans</span>
              <div className={styles.strip__row}>
                {strip.map((c) => (
                  <CardThumb key={c.id} src={c.imageUrl} alt={c.name} size="sm" className={styles.strip__card} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className={styles.info}>
          <p className={styles.info__eyebrow}>Loupe Hardware</p>
          <h1 className={styles.info__title}>Loupe Scanner</h1>
          <p className={styles.info__tagline}>Grade it before you grade it.</p>
          <div className={styles.info__social}>
            <span className={styles.info__stars} aria-hidden>
              ★★★★★
            </span>
            <span className={styles.info__count}>
              <Users size={14} /> {reserved.toLocaleString()} collectors reserved
            </span>
          </div>
          <p className={styles.info__desc}>
            A Raspberry-Pi-powered capture device that reads any card in seconds. Drop it in the tray and
            our vision model measures centering, edges, corners, and surface — then predicts the grade it
            would earn, so you only send the slabs worth sending. Every scan syncs straight to your vault.
          </p>
          <ul className={styles.highlights}>
            {SCANNER_HIGHLIGHTS.map((text, i) => {
              const Icon = HL_ICONS[i] ?? Check;
              return (
                <li key={text} className={styles.highlights__item}>
                  <span className={styles.highlights__icon}>
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Buy box */}
        <aside className={styles.buybox}>
          <div className={styles.buybox__price}>
            <span className={styles.buybox__now}>{scannerPriceLabel()}</span>
            <span className={styles.buybox__was}>{scannerPriceLabel(SCANNER_LIST_PRICE)}</span>
            <span className={styles.buybox__save}>Save 37%</span>
          </div>
          <p className={styles.buybox__due}>
            <strong>$0.00 due today</strong> — reserve free, pay when invited.
          </p>

          <div className={styles.buybox__row}>
            <span className={styles.buybox__label}>Quantity</span>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                <Minus size={15} />
              </button>
              <span className={styles.stepper__value}>{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={qty >= MAX_QTY}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          <Button block size="lg" leadingIcon={<Sparkles size={18} />} onClick={() => setCheckoutOpen(true)}>
            Join the waitlist
          </Button>
          <Button
            block
            variant="secondary"
            size="lg"
            leadingIcon={<ScanLine size={18} />}
            onClick={() => setCheckoutOpen(true)}
          >
            Reserve &amp; checkout
          </Button>

          <ul className={styles.buybox__assurances}>
            <li>
              <ShieldCheck size={15} /> No card required to reserve
            </li>
            <li>
              <Truck size={15} /> Free shipping at launch
            </li>
            <li>
              <Zap size={15} /> Priority access in signup order
            </li>
          </ul>
        </aside>
      </div>

      {/* Specs */}
      <section className={styles.specs}>
        <h2 className={styles.section__title}>Tech specs</h2>
        <dl className={styles.specs__grid}>
          {SCANNER_SPECS.map((s) => (
            <div key={s.label} className={styles.specs__row}>
              <dt className={styles.specs__label}>{s.label}</dt>
              <dd className={styles.specs__value}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FAQ */}
      <section className={styles.faq}>
        <h2 className={styles.section__title}>Frequently asked</h2>
        <div className={styles.faq__list}>
          {SCANNER_FAQ.map((item) => (
            <details key={item.q} className={styles.faq__item}>
              <summary className={styles.faq__q}>{item.q}</summary>
              <p className={styles.faq__a}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className={styles.cta}>
        <div className={styles.cta__inner}>
          <h2 className={styles.cta__title}>Be first in line for the Loupe Scanner</h2>
          <p className={styles.cta__sub}>
            {reserved.toLocaleString()} collectors have reserved at {scannerPriceLabel()}. Lock your spot — it's free.
          </p>
          <Button size="lg" leadingIcon={<Sparkles size={18} />} onClick={() => setCheckoutOpen(true)}>
            Join the waitlist
          </Button>
        </div>
      </section>

      <WaitlistCheckout open={checkoutOpen} onOpenChange={setCheckoutOpen} quantity={qty} card={hero} />
    </div>
  );
}
