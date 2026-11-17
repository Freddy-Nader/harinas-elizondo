import { describe, expect, it } from "vitest";

import { config } from "./proxy";

/** Next anchors a matcher to the whole path, so the test does the same. */
const guarded = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("RF-01: the proxy matcher", () => {
  it.each(["/", "/panel", "/clientes", "/clientes/x", "/certificados/CER-2026-000001/pdf", "/api", "/api/other", "/api/v10/clients/list", "/apiv1"])(
    "still guards %s", (path) => expect(guarded(path)).toBe(true));

  it.each(["/login", "/api/auth/sign-in/email", "/api/v1/clients/list", "/api/v1", "/_next/static/a.js", "/favicon.ico"])(
    "leaves %s alone", (path) => expect(guarded(path)).toBe(false));
});
