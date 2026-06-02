import { test, expect, describe } from "bun:test";
import { render } from "@testing-library/react";
import { RangeStrip, rangePosition } from "./RangeStrip";

describe("rangePosition", () => {
  test("maps value linearly to a 0–100% position (lie factor 1.0)", () => {
    expect(rangePosition(10, 20, 15)).toBe(50);
    expect(rangePosition(10, 20, 10)).toBe(0);
    expect(rangePosition(10, 20, 20)).toBe(100);
  });
  test("clamps out-of-range values and handles degenerate range", () => {
    expect(rangePosition(10, 20, 5)).toBe(0);
    expect(rangePosition(10, 20, 25)).toBe(100);
    expect(rangePosition(20, 20, 20)).toBe(0);
  });
});

describe("RangeStrip", () => {
  test("positions the current-price marker at the computed percentage", () => {
    const { getByTestId } = render(<RangeStrip low={10} high={20} value={15} />);
    expect(getByTestId("range-marker").style.left).toBe("50%");
  });
});
