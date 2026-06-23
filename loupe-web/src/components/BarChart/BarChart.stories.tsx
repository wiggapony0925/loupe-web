import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart } from "./BarChart";

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const meta = {
  title: "Charts/BarChart",
  component: BarChart,
  parameters: { layout: "padded" },
  render: (args) => (
    <div style={{ width: 620, maxWidth: "100%" }}>
      <BarChart {...args} />
    </div>
  ),
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Value-by-decade distribution (hover a bar for the readout). */
export const ByDecade: Story = {
  args: {
    data: [
      { label: "1990s", value: 1200 },
      { label: "2000s", value: 3400 },
      { label: "2010s", value: 5200 },
      { label: "2020s", value: 8900 },
    ],
    backdrop: usd(18700),
    format: usd,
  },
};

/** Grade distribution (counts). */
export const GradeMix: Story = {
  args: {
    data: [
      { label: "10", value: 14 },
      { label: "9.5", value: 9 },
      { label: "9", value: 22 },
      { label: "8", value: 6 },
      { label: "7", value: 3 },
      { label: "≤6", value: 2 },
    ],
    format: (n) => `${n} cards`,
  },
};
