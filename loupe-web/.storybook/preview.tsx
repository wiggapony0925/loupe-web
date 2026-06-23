import type { Preview } from "@storybook/react-vite";
// Load the app's global theme so the chart CSS vars (--accent-mint, --up,
// --down, --chart-accent, …) resolve exactly like in the app.
import "@/styles/global.scss";

// The app stamps `data-theme` on <html>; mirror dark (the default) here.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", "dark");
}

const preview: Preview = {
  parameters: {
    layout: "centered",
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
