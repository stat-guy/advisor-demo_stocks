// Test harness: register a DOM (happy-dom) and jest-dom matchers for component tests.
// Pure (non-DOM) tests are unaffected.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach } from "bun:test";

GlobalRegistrator.register();
expect.extend(matchers as unknown as Parameters<typeof expect.extend>[0]);

// Unmount React trees between tests so the DOM never bleeds across cases.
const { cleanup } = await import("@testing-library/react");
afterEach(() => cleanup());
