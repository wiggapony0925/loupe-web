import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline } from "./Sparkline";

function walk(start: number, n: number, drift: number, seed: number) {
  let v = start;
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: n }, () => {
    v = Math.max(1, v * (1 + (rand() - 0.5) * 0.08) + drift);
    return Number(v.toFixed(2));
  });
}

const meta = {
  title: "Charts/Sparkline",
  component: Sparkline,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Up trend → mint. The list-row mini chart. */
export const Up: Story = {
  args: { data: walk(40, 24, 0.6, 4), width: 140, height: 44 },
};

/** Down trend → rose. */
export const Down: Story = {
  args: { data: walk(90, 24, -0.8, 9), width: 140, height: 44 },
};

/** Tiny row size, no fill. */
export const Compact: Story = {
  args: { data: walk(50, 20, 0.2, 2), width: 96, height: 28, fill: false },
};
