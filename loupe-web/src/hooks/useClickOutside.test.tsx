import { describe, it, expect, vi } from "vitest";
import { useRef } from "react";
import { render, fireEvent } from "@testing-library/react";
import { useClickOutside } from "./useClickOutside";

function Probe({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutside);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
      <div data-testid="outside">outside</div>
    </div>
  );
}

describe("useClickOutside", () => {
  it("fires only when the press is outside the element", () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Probe onOutside={onOutside} />);

    fireEvent.mouseDown(getByTestId("inside"));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.mouseDown(getByTestId("outside"));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
});
