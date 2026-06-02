import { test, expect, describe } from "bun:test";
import { render } from "@testing-library/react";
import { SignalDot, SIGNAL_LABEL } from "./SignalDot";

describe("SignalDot", () => {
  test("renders the right color class + accessible label per light", () => {
    for (const [light, cls] of [
      ["green", "bg-signal-green"],
      ["yellow", "bg-signal-yellow"],
      ["red", "bg-signal-red"],
      ["neutral", "bg-signal-neutral"],
    ] as const) {
      const { getByRole, unmount } = render(<SignalDot light={light} />);
      const el = getByRole("img");
      expect(el.className).toContain(cls);
      expect(el).toHaveAttribute("data-light", light);
      expect(el).toHaveAttribute("aria-label", SIGNAL_LABEL[light]);
      unmount();
    }
  });
});
