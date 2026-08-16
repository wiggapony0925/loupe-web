import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditProfileModal } from "./EditProfileModal";

/**
 * The username field screens as you type.
 *
 * This is NOT the enforcement — the backend refuses the write at its own
 * chokepoint whatever this component thinks, and a test here proves nothing
 * about that. What it proves is the manners: a handle is permanent public
 * identity, and someone who types a slur into it should find out at the
 * keyboard rather than after filling in a bio, a location and four social
 * links. The screening runs offline (a wordlist), so there is nothing to
 * mock and no request to intercept.
 */
function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EditProfileModal open onOpenChange={() => {}} profile={null} />
    </QueryClientProvider>,
  );
}

const field = () => screen.getByLabelText("Username");
const saveButton = () => screen.getByRole("button", { name: /claim username/i });

describe("EditProfileModal username screening", () => {
  it("stops a slur at the keyboard and says why", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(field(), "n1gger");

    await waitFor(() =>
      expect(screen.getByText(/breaks the community rules/i)).toBeInTheDocument(),
    );
    // Saving is off the table while it stands — but the draft is kept, so
    // one edit fixes it.
    expect(saveButton()).toBeDisabled();
    expect(field()).toHaveValue("n1gger");
  });

  it("clears the moment the name is fixed", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(field(), "n1gger");
    await waitFor(() => expect(saveButton()).toBeDisabled());

    await user.clear(field());
    await user.type(field(), "jeffcollects");

    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(
      screen.queryByText(/breaks the community rules/i),
    ).not.toBeInTheDocument();
  });

  it("leaves an ordinary handle alone", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(field(), "charizard_fan");

    // Nothing to wait for — but give the debounce a chance to fire and be
    // wrong before asserting it wasn't.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      screen.queryByText(/breaks the community rules/i),
    ).not.toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });
});
