import { test, expect, describe } from "bun:test";
import { createRateLimiter } from "./ratelimit";

describe("createRateLimiter (fixed window)", () => {
  test("allows up to the limit, then blocks within the window", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(rl.check("ip1", 0).allowed).toBe(true);
    expect(rl.check("ip1", 100).allowed).toBe(true);
    expect(rl.check("ip1", 200).allowed).toBe(true);
    const blocked = rl.check("ip1", 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  test("resets after the window elapses", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    rl.check("ip", 0);
    rl.check("ip", 500);
    expect(rl.check("ip", 600).allowed).toBe(false);
    expect(rl.check("ip", 1100).allowed).toBe(true); // new window
  });

  test("keys are independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 0).allowed).toBe(false);
  });
});
