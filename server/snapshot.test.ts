import { test, expect, describe } from "bun:test";
import { isValidTicker } from "./snapshot";

describe("isValidTicker", () => {
  test("accepts simple and share-class tickers", () => {
    for (const t of ["F", "TSLA", "RIVN", "BRK.B", "brk-b", " aapl "]) {
      expect(isValidTicker(t)).toBe(true);
    }
  });
  test("rejects junk and over-long input", () => {
    for (const t of ["", "TOOLONGSYM", "12345", "A B", "$$$", "A..B"]) {
      expect(isValidTicker(t)).toBe(false);
    }
  });
});
