import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/**
 * ESLint 9 flat config — React 19 + TypeScript + Vite SPA.
 *
 * Layout:
 *   • App source (`src/**`) is linted *type-aware* (typescript-eslint's
 *     recommendedTypeChecked + the foundational React Hooks rules + Fast
 *     Refresh safety).
 *   • Tooling/config files at the repo root (vite/vitest config, the
 *     Storybook setup, `scripts/`) live outside the app's tsconfig, so they
 *     get the plain (non-type-checked) recommended rules.
 *
 * Run via `npm run lint` (`eslint . --ext .ts,.tsx --max-warnings=0`).
 */
export default tseslint.config(
  {
    // Build output, coverage, Storybook export, and static assets (incl. the
    // generated MSW worker) are never linted.
    ignores: [
      "dist/**",
      "coverage/**",
      "storybook-static/**",
      "node_modules/**",
      "public/**",
    ],
  },

  // ── App source: type-aware ────────────────────────────────────────────────
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        // Look up the nearest tsconfig per file (src is covered by tsconfig.json).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Foundational React Hooks rules (matching the canonical Vite template).
      // We intentionally do *not* opt the existing codebase into the broader
      // React-Compiler ruleset that ships in react-hooks v7's `recommended`.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Keep Fast Refresh working: a module should export only components
      // (constant exports — e.g. route/loader data — are allowed).
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Async event handlers are idiomatic in React — the returned promise is
      // intentionally ignored by the DOM — so don't flag them in JSX
      // attributes; keep every other misused-promise protection on.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Honor the `_`-prefix convention the codebase already uses to mark a
      // binding as deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // ── Root tooling/config: plain recommended (no type info) ─────────────────
  {
    files: [
      "*.{ts,js,mjs}",
      ".storybook/**/*.{ts,tsx}",
      "scripts/**/*.{mjs,js}",
    ],
    extends: [...tseslint.configs.recommended],
  },
);
