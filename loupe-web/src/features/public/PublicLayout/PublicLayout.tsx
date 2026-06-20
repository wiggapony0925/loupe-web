import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, User } from "lucide-react";
import { SearchCombobox, ThemeToggle, Footer, Modal, Button, FeatureGate, ScrollToTop } from "@/components";
import { AuroraField, Logo } from "@/assets";
import { useAuth } from "@/auth/AuthProvider";
import styles from "./PublicLayout.module.scss";

const CATEGORIES: Array<{ label: string; game: string }> = [
  { label: "Pokémon", game: "pokemon" },
  { label: "Magic", game: "magic" },
  { label: "Yu-Gi-Oh!", game: "yugioh" },
  { label: "Lorcana", game: "lorcana" },
  { label: "One Piece", game: "onepiece" },
  { label: "Digimon", game: "digimon" },
];

/** Public storefront frame (TCGplayer-style): search header + category nav + footer. */
export function PublicLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const onSearch = (q: string) => navigate(`/cards${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  return (
    <div className={styles["public"]}>
      <ScrollToTop />
      <div className={styles["public__aurora"]}>
        <AuroraField variant="subtle" />
      </div>

      <header className={styles["public__header"]}>
        <Link to="/" className={styles["public__brand"]} aria-label="Loupe home">
          <Logo size={26} />
        </Link>
        <SearchCombobox
          className={styles["public__search"]}
          onSearch={onSearch}
          onSelectCard={(c) => navigate(`/cards/${encodeURIComponent(c.id)}`)}
        />
        <div className={styles["public__actions"]}>
          <ThemeToggle compact />
          {user ? (
            <Link to="/app" className={styles["public__action"]}>
              <LayoutDashboard size={20} />
              <span className={styles["public__action-label"]}>Dashboard</span>
            </Link>
          ) : (
            <Link to="/login" className={styles["public__action"]}>
              <User size={20} />
              <span className={styles["public__action-label"]}>Sign In</span>
            </Link>
          )}
          <button className={styles["public__action"]} aria-label="Cart" onClick={() => setCartOpen(true)}>
            <ShoppingCart size={20} />
          </button>
        </div>
      </header>

      <Modal
        open={cartOpen}
        onOpenChange={setCartOpen}
        title="Your cart"
        description="Saved lists and one-click checkout are coming soon. For now, open any card to see live marketplace prices and buy through the source."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCartOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setCartOpen(false);
                navigate("/cards");
              }}
            >
              Browse cards
            </Button>
          </>
        }
      />

      <FeatureGate flag="promo_banner">
        <div className={styles["public__promo"]}>
          ✨ New: track your whole collection as a portfolio.{" "}
          <Link to="/signup">Create your free account →</Link>
        </div>
      </FeatureGate>

      <nav className={styles["public__nav"]}>
        <Link to="/cards" className={styles["public__nav-item"]}>
          All Cards
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.game} to={`/cards?game=${c.game}`} className={styles["public__nav-item"]}>
            {c.label}
          </Link>
        ))}
        <Link to="/scanner" className={styles["public__nav-item"]}>
          Scanner
        </Link>
      </nav>

      <main className={styles["public__main"]} data-scroll-root>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
