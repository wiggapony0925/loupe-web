import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutChart } from "./DonutChart";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const meta = {
  title: "Charts/DonutChart",
  component: DonutChart,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DonutChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Portfolio allocation by set — the canonical use. */
export const Allocation: Story = {
  args: {
    data: [
      { label: "Prismatic Evolutions", value: 4200 },
      { label: "Surging Sparks", value: 2600 },
      { label: "151", value: 1900 },
      { label: "Evolving Skies", value: 1400 },
      { label: "Obsidian Flames", value: 700 },
      { label: "Paldea Evolved", value: 450 },
      { label: "Crown Zenith", value: 300 },
    ],
    centerValue: usd(11550),
    centerLabel: "total",
    format: usd,
  },
};

/** Long tail folds into an "Other" slice. */
export const FoldsTail: Story = {
  args: {
    data: Array.from({ length: 12 }, (_, i) => ({
      label: `Set ${i + 1}`,
      value: Math.round(2000 / (i + 1)),
    })),
    centerValue: usd(5400),
    centerLabel: "total",
    format: usd,
  },
};
