import { test, expect, describe } from "bun:test";
import { render } from "@testing-library/react";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  test("renders one polyline point per value, last marker in the signal color", () => {
    const { getByTestId } = render(<Sparkline values={[1, 2, 3, 4]} light="green" />);
    const pts = getByTestId("spark-line").getAttribute("points")!.trim().split(/\s+/);
    expect(pts.length).toBe(4);
    expect(getByTestId("spark-last")).toHaveAttribute("data-light", "green");
  });

  test("draws an honest zero baseline when the series dips negative", () => {
    const { getByTestId } = render(<Sparkline values={[18, -2, 4]} light="yellow" />);
    expect(getByTestId("spark-zero")).toBeInTheDocument();
  });

  test("no zero baseline when every value is positive", () => {
    const { queryByTestId } = render(<Sparkline values={[136, 158, 176]} light="green" />);
    expect(queryByTestId("spark-zero")).toBeNull();
  });

  test("renders nothing for fewer than 2 points", () => {
    const { container } = render(<Sparkline values={[5]} light="green" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
