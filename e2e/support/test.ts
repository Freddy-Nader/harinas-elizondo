import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

/**
 * Every e2e test sends its own client address. Better Auth allows 3 sign-ins per 10 s per
 * address, and the suite signs in far more often than a person would from one machine.
 * This only changes the rate-limit bucket of the test browser. The app is not modified.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": `10.22.${randomInt(0, 256)}.${randomInt(1, 255)}` });
  },
});
