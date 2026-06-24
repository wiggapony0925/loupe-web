import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AdminNavKeys } from "./AdminNavKeys";

/**
 * The developer-portal "Nav keys" workbench. Self-contained (no router/auth), so
 * it renders standalone here exactly as it does under /admin/navkeys.
 */
const meta = {
  title: "Admin/NavKeys",
  component: AdminNavKeys,
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ width: "min(1100px, 95vw)" }}>
      <AdminNavKeys />
    </div>
  ),
} satisfies Meta<typeof AdminNavKeys>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Picking the "Add to watchlist" intent builds a card key with a resume param. */
export const BuildsWatchlistKey: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { name: "Nav keys" })).toBeInTheDocument();
    await expect(c.getByText("Build & test a key")).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: /Add to watchlist/ }));

    // The decoded destination + hint + catalog all surface the resume path.
    const matches = await c.findAllByText(/resume=watchlist\.add/);
    await expect(matches.length).toBeGreaterThan(0);
  },
};
