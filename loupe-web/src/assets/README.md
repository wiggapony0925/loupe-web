# `assets/` — visual asset system

One home for every non-UI visual primitive, so they're discoverable and reused (not re-invented per feature). Mirrors how a design-led product (e.g. chase.com) keeps brand, art, and decoration centralized.

```
assets/
├── brand/          Logo marks, wordmarks — anything identity-related.
├── backgrounds/    Decorative, animated page/section backgrounds (aurora, grids).
├── illustrations/  Spot illustrations + empty/error-state art.
└── index.ts        Barrel — import from "@/assets".
```

## Conventions

- **SVG ships as React components**, not `.svg` files — so they inherit `currentColor`, theme CSS variables, and props (size/variant). Raster (`.png`/`.webp`) would live beside its component if ever needed.
- **Theme via CSS variables** (`var(--accent-mint)`, …) — never hard-coded hex, so light/dark just works.
- **Decorative art is inert**: `aria-hidden`, `pointer-events: none`, and it must **honor `prefers-reduced-motion`** (animations collapse to a static frame).
- **Animations are CSS-driven** (keyframes on `transform`/`opacity`) for 60fps; `will-change` only while animating.
- Each animated asset owns a co-located `*.module.scss` (BEM, `&` nesting).

## Usage

```tsx
import { AuroraField, Logo, EmptyResultsArt } from "@/assets";

<AuroraField variant="hero" />
<Logo size={28} showWordmark />
```
