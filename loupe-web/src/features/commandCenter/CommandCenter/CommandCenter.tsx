import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3 } from "lucide-react";
import {
  useAnalyticsOverview,
  useGrades,
  usePublicTrending,
  useWatchlist,
  type CardSummary,
} from "@loupe/core";
import {
  Carousel,
  ShopCard,
  Skeleton,
  NoteCard,
  Button,
  Panel,
  Stat,
  Flaggable,
} from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { formatMoney } from "@/lib/format";
import { FeaturedHero } from "../FeaturedHero/FeaturedHero";
import { PortfolioChart } from "../PortfolioChart/PortfolioChart";
import { TopMovers } from "../TopMovers/TopMovers";
import styles from "./CommandCenter.module.scss";

/** Authenticated home — personalized header, your watchlist, and the live market. */
export function CommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const trending = usePublicTrending({ sort: "trending", limit: 20 });
  const valuable = usePublicTrending({ sort: "value", limit: 20 });
  const steals = usePublicTrending({ maxPrice: 5, limit: 20 });
  const watchlist = useWatchlist();
  const analytics = useAnalyticsOverview();
  const vault = useGrades({ sort: "value_desc", limit: 12 });
  const portfolio = analytics.data?.stats;

  const featured = trending.data?.[0];
  const go = (id: string) => navigate(`/cards/${encodeURIComponent(id)}`);
  const firstName =
    user?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "back";

  const tiles = (rows: CardSummary[] | undefined, loading: boolean) =>
    loading
      ? Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={300} radius={14} />
        ))
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
        <Button
          trailingIcon={<ArrowRight size={16} />}
          onClick={() => navigate("/cards")}
        >
          Browse all cards
        </Button>
      </header>

      {trending.isError ? (
        <NoteCard
          variant="warning"
          title="Couldn't load the market"
          message="The backend is unreachable right now. Please try again."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        />
      ) : (
        <>
          {/* Collection-first: the dashboard leads with the user's own
              portfolio chart (mobile Command Center parity), with an
              onboarding state when the vault is still empty. */}
          <Flaggable flag="cc_portfolio" label="Collection">
            <div className={styles.portfolioSection}>
              <PortfolioChart />
              {portfolio && portfolio.holdings > 0 && (
                <Panel padding="lg" raised className={styles.portfolio}>
                  <div className={styles.portfolioStats}>
                    <Stat
                      label="Collection value"
                      value={formatMoney({
                        amount: portfolio.totalValueUsd,
                        currency: "USD",
                      })}
                    />
                    <Stat
                      label="Cards"
                      value={portfolio.holdings.toLocaleString()}
                    />
                    <Stat
                      label="Sets"
                      value={portfolio.uniqueSets.toLocaleString()}
                    />
                    <Stat
                      label="Avg grade"
                      value={
                        portfolio.avgGrade ? portfolio.avgGrade.toFixed(1) : "—"
                      }
                    />
                    <Stat
                      label="Gem rate"
                      value={
                        portfolio.gemRatePct != null
                          ? `${Math.round(portfolio.gemRatePct)}%`
                          : "—"
                      }
                    />
                    <Stat
                      label="Avg value"
                      value={formatMoney({
                        amount: portfolio.avgValueUsd,
                        currency: "USD",
                      })}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    leadingIcon={<BarChart3 size={16} />}
                    onClick={() => navigate("/app/analytics")}
                  >
                    View analytics
                  </Button>
                </Panel>
              )}
            </div>
          </Flaggable>

          {/* Your biggest 1-year movers (owned cards) — mobile parity. */}
          <TopMovers onCard={go} />

          {/* Discovery: today's #1 trending card — clearly secondary to the
              collection above (it's the market, not your cards). */}
          {featured && (
            <Flaggable flag="cc_featured" label="Trending card">
              <FeaturedHero card={featured} />
            </Flaggable>
          )}

          {vault.data && vault.data.length > 0 && (
            <Flaggable flag="cc_vault_rail" label="Vault rail">
              <Carousel
                title="Your vault"
                subtitle="Your most valuable graded cards."
                action={seeAll("/app/vault")}
              >
                {vault.data.map((c) => (
                  <ShopCard
                    key={c.id}
                    imageUrl={c.cardImageUrl ?? ""}
                    title={c.cardName ?? "Card"}
                    subtitle={c.cardSetName ?? "Graded"}
                    price={
                      c.estimatedValueUsd
                        ? { amount: c.estimatedValueUsd, currency: "USD" }
                        : undefined
                    }
                    tag={`${c.house ? c.house.toUpperCase() : "RAW"} ${Number.isInteger(c.grade) ? c.grade : c.grade.toFixed(1)}`}
                    onClick={() => go(c.cardId)}
                  />
                ))}
              </Carousel>
            </Flaggable>
          )}

          {watchlist.data && watchlist.data.length > 0 ? (
            <Carousel title="Your watchlist" action={seeAll("/app/watchlist")}>
              {watchlist.data.map((item) => (
                <ShopCard
                  key={item.id}
                  imageUrl={item.cardImageUrl ?? ""}
                  title={item.cardName ?? "Card"}
                  subtitle="Tracked"
                  onClick={() => go(item.cardId)}
                />
              ))}
            </Carousel>
          ) : !watchlist.isLoading ? (
            <NoteCard
              title="Your watchlist is empty"
              message="Open any card and tap “Add to watchlist” to track its price right here."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/cards")}
                >
                  Find cards
                </Button>
              }
            />
          ) : null}

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

          {(steals.data?.length ?? 0) >= 4 && (
            <Carousel
              title="Steals under $5"
              subtitle="Affordable pickups, priced live."
              action={seeAll("/cards")}
            >
              {tiles(steals.data, steals.isLoading)}
            </Carousel>
          )}
        </>
      )}
    </div>
  );
}
