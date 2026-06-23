import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { useNearbyListings } from "@loupe/core";
import { Button } from "@/components";
import { formatMoney } from "@/lib/format";
import styles from "./NearbyListings.module.scss";

/**
 * Nearby Facebook Marketplace listings — opt-in and location-gated. The user
 * taps "Find listings near me", we ask the browser for coordinates, then query
 * `/v1/cards/{id}/nearby-listings`. Mirrors the mobile NearbyListingsSection.
 * Renders nothing until the user opts in (and self-hides if there are none).
 */
export function NearbyListings({ cardId }: { cardId: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "denied">("idle");

  const { data: listings, isLoading } = useNearbyListings(cardId, coords);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("idle");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  // Opt-in CTA (before the user shares location).
  if (!coords) {
    return (
      <section className={styles.nearby}>
        <div className={styles.nearby__cta}>
          <MapPin size={18} className={styles.nearby__pin} />
          <div className={styles.nearby__ctaBody}>
            <span className={styles.nearby__ctaTitle}>Find listings near you</span>
            <span className={styles.nearby__ctaSub}>
              {geoState === "denied"
                ? "Location unavailable — enable it in your browser to see local Facebook Marketplace listings."
                : "See this card for sale on Facebook Marketplace nearby."}
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={requestLocation}
            disabled={geoState === "asking"}
          >
            {geoState === "asking" ? "Locating…" : "Use my location"}
          </Button>
        </div>
      </section>
    );
  }

  const rows = listings ?? [];
  // The nearest copy decides the heading: if it's far, we found it by widening
  // the search, so call it "Closest listings" instead of "Near you".
  const nearestKm = rows.find((l) => l.distanceKm != null)?.distanceKm ?? null;
  const expanded = nearestKm != null && nearestKm > 60;

  return (
    <section className={styles.nearby}>
      <div className={styles.nearby__head}>
        <h2 className={styles.nearby__title}>{expanded ? "Closest listings" : "Near you"}</h2>
        <span className={styles.nearby__sub}>
          {isLoading
            ? "Searching Facebook Marketplace…"
            : rows.length === 0
              ? "No Facebook Marketplace listings for this card right now."
              : expanded
                ? "None in your radius — here are the closest we found."
                : "Facebook Marketplace listings nearby · closest first"}
        </span>
      </div>
      <div className={styles.nearby__rows}>
        {rows.slice(0, 8).map((l, i) => (
          <a
            key={`${l.url}-${i}`}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className={styles.row}
          >
            <div className={styles.row__id}>
              <span className={styles.row__title}>{l.title || "Listing"}</span>
              <span className={styles.row__meta}>
                {[
                  l.locationLabel,
                  l.distanceKm != null ? `${l.distanceKm.toFixed(0)} km` : null,
                  l.condition,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <div className={styles.row__right}>
              <span className={styles.row__price}>{formatMoney(l.price)}</span>
              <ExternalLink size={13} className={styles.row__icon} />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
