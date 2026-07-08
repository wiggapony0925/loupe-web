import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  usePublicTrending,
  usePublicSealedSearch,
  useSealedHoldings,
  type CardSummary,
  type SealedProduct,
} from "@loupe/core";
import { SealedCard } from "@/features/public/Sealed/SealedCard/SealedCard";
import {
  Carousel,
  CurrencySwitcher,
  PortfolioSwitcher,
  ShopCard,
  Skeleton,
  NoteCard,
  Button,
  Flaggable,
} from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { FeaturedHero } from "../FeaturedHero/FeaturedHero";
import { PortfolioChart } from "../PortfolioChart/PortfolioChart";
import { TopMovers } from "../TopMovers/TopMovers";
import { SetProgressRail } from "../SetProgressRail/SetProgressRail";
import { CollectionBreakdown } from "../CollectionBreakdown/CollectionBreakdown";
import { Overview } from "../Overview/Overview";
import { ValueBySet } from "../ValueBySet/ValueBySet";
import { RightRail } from "../RightRail/RightRail";
import styles from "./CommandCenter.module.scss";

/**
 * Authenticated home — a bento dashboard: a main column (overview metrics,
 * performance + value-by-set charts, movers, set progress, breakdown, then
 * live discovery rails) beside a sticky right rail (vault + watchlist). All
 * sections self-hide when empty and reuse the shared component library.
 */
export function CommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trending = usePublicTrending({ sort: "trending", limit: 40 });
  const valuable = usePublicTrending({ sort: "value", limit: 40 });
  const steals = usePublicTrending({ maxPrice: 5, limit: 40 });
  const sealed = usePublicSealedSearch({ limit: 40 });
  const { data: holdings } = useSealedHoldings({}, Boolean(user));
  const ownedIds = new Set((holdings ?? []).map((h) => h.productId));

  const featured = trending.data?.[0];
  const go = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);
  const firstName = user?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "back";

  const tiles = (rows: CardSummary[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={300} radius={14} />)
      : (rows ?? []).map((c) => (
          <ShopCard
            key={c.id}
            imageUrl={c.imageUrl}
            title={c.name}
            subtitle={c.setName}
            price={c.price}
            tag={c.rarity}
            onClick={() => go(c.id)}
          />
        ));

  const sealedTiles = (rows: SealedProduct[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={300} radius={14} />)
      : (rows ?? []).map((p) => <SealedCard key={p.id} product={p} owned={ownedIds.has(p.id)} />);

  const seeAll = (to: string) => (
    <Link to={to} className={styles.seeall}>
      See all
    </Link>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Your market</p>
          <h1 className={styles.greeting}>Welcome back, {firstName}.</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Active portfolio — scopes the whole dashboard (backend-driven). */}
          <PortfolioSwitcher />
          {/* Display currency — profile-synced, so mobile follows. */}
          <CurrencySwitcher />
          <Button trailingIcon={<ArrowRight size={16} />} onClick={() => navigate("/cards")}>
            Browse all cards
          </Button>
        </div>
      </header>

      {trending.isError ? (
        <NoteCard
          variant="warning"
          title="Couldn't load the market"
          message="The backend is unreachable right now. Please try again."
          action={
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.bento}>
            <div className={styles.main}>
              {/* Bento hero — collection value + holdings + latest additions. */}
              <Overview />

              {/* Value over time (line) — collection-first, mobile parity. */}
              <Flaggable flag="cc_portfolio" label="Performance">
                <PortfolioChart />
              </Flaggable>

              {/* Where the value sits (bars). */}
              <ValueBySet />

              {/* Biggest 1-year swings on cards you own. */}
              <TopMovers onCard={go} />

              {/* Set-completion chase board. */}
              <SetProgressRail />

              {/* Quality (grade spread) + risk (concentration). */}
              <CollectionBreakdown />
            </div>

            {/* Sticky right rail — vault + watchlist. */}
            <RightRail />
          </div>

          {/* Discovery — full content width, below the collection bento so the
              carousels span the whole page instead of the narrow main column. */}
          <div className={styles.discovery}>
            {featured && (
              <Flaggable flag="cc_featured" label="Trending card">
                <FeaturedHero card={featured} />
              </Flaggable>
            )}

            <Carousel
              title="Trending now"
              live
              subtitle="The cards moving most across connected marketplaces."
              action={seeAll("/app/markets")}
            >
              {tiles(trending.data, trending.isLoading)}
            </Carousel>

            <Carousel
              title="Most valuable right now"
              subtitle="The priciest cards in today's live market."
              action={seeAll("/app/markets")}
            >
              {tiles(valuable.data, valuable.isLoading)}
            </Carousel>

            {(sealed.isLoading || (sealed.data?.length ?? 0) > 0) && (
              <Carousel
                title="Sealed products"
                subtitle="Booster boxes, Elite Trainer Boxes, and bundles — tracked like singles."
                itemWidth="210px"
                animation={true}
                action={seeAll("/sealed")}
              >
                {sealedTiles(sealed.data, sealed.isLoading)}
              </Carousel>
            )}

            {(steals.data?.length ?? 0) >= 4 && (
              <Carousel
                title="Steals under $5"
                subtitle="Affordable pickups, priced live."
                action={seeAll("/cards")}
              >
                {tiles(steals.data, steals.isLoading)}
              </Carousel>
            )}
          </div>
        </>
      )}
    </div>
  );
}
