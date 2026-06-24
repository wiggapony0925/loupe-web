import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath, URL } from "node:url";

const storybookDir = fileURLToPath(new URL("./.storybook", import.meta.url));

// Vitest config — kept separate from vite.config.ts (which carries the dev
// proxy + prod build tuning). Mirrors the app's `@/` alias and SCSS helper
// injection so components import exactly as they do at runtime.
//
// `test.projects` lets us run two suites side by side:
//   • "unit"      — fast jsdom tests for logic + components (this file)
//   • "storybook" — every story run as an interaction/a11y/visual test in a
//                   real browser (added by @storybook/addon-vitest)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@use "@/styles/helpers" as *;` },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      {
        // Every story runs as a test in a real (headless) browser: smoke render
        // + a11y + any `play` interactions. Needs Chromium —
        // `npx playwright install chromium` once per machine/CI.
        extends: true,
        plugins: [storybookTest({ configDir: storybookDir })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
