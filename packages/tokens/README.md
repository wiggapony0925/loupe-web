# @loupe/tokens

Single source of truth for the Loupe **"Precision"** design language — colors
(dark + light), radii, spacing, the type scale, layout rails, and motion. Pure
data + helpers + an SCSS generator. **No React, DOM, or React Native.**

Both clients render from these values so they can never visually drift:

| Surface | How it consumes the tokens |
| --- | --- |
| **loupe-web** | `src/styles/tokens.scss` is **generated** from `buildScss()`. Never edit that file by hand. |
| **loupe-frontend** (Expo) | Vendored to `vendor/loupe-tokens`; `presentation/theme/tokens.ts` imports the color sets + scales and builds its NativeWind `vars()` from `nativeWindVars()`. |

## Changing a token

1. Edit **`src/tokens.js`** (the only place a value changes).
2. Regenerate the web SCSS — from the repo root:
   ```sh
   npm run gen:tokens
   ```
3. Re-sync the Expo vendor copy — from `loupe-frontend`:
   ```sh
   npm run sync:tokens
   ```
4. Commit the changes in both repos.

## Why plain ESM (`tokens.js` + `tokens.d.ts`)?

So the values are consumable everywhere with zero build step: Vite (web), Metro
(app), and bare `node` (the generator). `tokens.d.ts` gives consumers full
TypeScript types; `index.ts` is the typed entry that re-exports it.

## API

- `darkColors`, `lightColors` — `ColorSet` (bg / line / ink / accent / onAccent / shadow).
- `radius`, `spacing`, `typography`, `layout`, `motion` — shared scales.
- `withAlpha(hex, alpha)`, `hexToTriplet(hex)`, `gradeColorFor(colors, grade)`.
- `nativeWindVars(colors)` — the `--loupe-*` RGB-triplet map for the Expo app.
- `buildScss()` — the full `tokens.scss` contents for the web client.
