import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import { handlers } from "@/test/msw/handlers";
// Load the app's global theme so the chart CSS vars (--accent-mint, --up,
// --down, --chart-accent, …) resolve exactly like in the app.
import "@/styles/global.scss";

// Start the MSW worker once. Stories mock requests via the `msw` parameter;
// anything un-mocked passes through (the chart stories make no requests).
initialize({ onUnhandledRequest: "bypass" });

// The app stamps `data-theme` on <html>; mirror dark (the default) here.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", "dark");
}

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    layout: "centered",
    msw: { handlers },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: "#0b0b0d",
          padding: 24,
          borderRadius: 14,
          minWidth: 320,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
