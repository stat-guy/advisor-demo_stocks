import { test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { cn } from "@/lib/utils";

test("cn merges and dedupes tailwind classes", () => {
  expect(cn("p-2", "p-4")).toBe("p-4");
  expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
    "text-sm font-bold",
  );
});

test("DOM harness + jest-dom matchers are wired up", () => {
  render(createElement("div", { "data-testid": "probe" }, "hello"));
  expect(screen.getByTestId("probe")).toBeInTheDocument();
  expect(screen.getByTestId("probe")).toHaveTextContent("hello");
});
