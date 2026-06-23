import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarketChart } from "./MarketChart";

const DAY = 86_400_000;

/** Deterministic price walk so stories are stable across reloads. */
function walk(start: number, n: number, drift: number, vol: number, seed: number) {
  let v = start;
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const now = Date.now();
  const out: { t: number; v: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push({ t: now - i * DAY, v: Math.max(1, Number(v.toFixed(2))) });
    v = v * (1 + (rand() - 0.5) * vol) + drift;
  }
  return out;
}

const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const meta = {
  title: "Charts/MarketChart",
  component: MarketChart,
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ width: 760, maxWidth: "100%" }}>
      <MarketChart {...args} />
    </div>
  ),
} satisfies Meta<typeof MarketChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single series — Robinhood-style color-by-change line + area. */
export const SingleSeries: Story = {
  args: {
    series: [{ id: "raw", points: walk(60, 200, 0.4, 0.05, 7) }],
    height: 320,
    format: usd,
  },
};

/** Multi-series compare — raw vs PSA 10 vs BGS 9.5 (distinct colors, no fill). */
export const CompareHouses: Story = {
  args: {
    series: [
      { id: "raw", label: "Raw", color: "#94a3b8", points: walk(66, 200, 0.1, 0.04, 3) },
      { id: "psa", label: "PSA 10", color: "var(--accent-blue)", points: walk(810, 200, 1.4, 0.05, 9) },
      { id: "bgs", label: "BGS 9.5", color: "#8b5cf6", points: walk(397, 200, 0.7, 0.05, 5) },
    ],
    height: 320,
    colorByChange: false,
    format: usd,
  },
};

/** Downtrend — verifies the color-by-change flips to the "down" token. */
export const Downtrend: Story = {
  args: {
    series: [{ id: "raw", points: walk(900, 200, -2.2, 0.04, 11) }],
    height: 320,
    format: usd,
  },
};
