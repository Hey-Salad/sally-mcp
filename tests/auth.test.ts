import { beforeEach, afterEach, it, expect, vi } from "vitest";
vi.mock("@cloudflare/workers-oauth-provider", () => ({
  AuthorizationError: class extends Error {
    redirectTo?: string;
  },
}));
import { authorize } from "../src/auth";
import type { Env } from "../src/types";
let env: Env;
beforeEach(() => {
  env = {
    PUBLIC_ORIGIN: "https://sally.example",
    USAGE_HMAC_KEY: "a".repeat(64),
    OAUTH_PROVIDER: {
      parseAuthRequest: vi.fn().mockResolvedValue({ scope: ["sally:tools"] }),
      describeConsent: vi.fn().mockResolvedValue({
        clientName: "<script>bad()</script>",
        redirectHost: "127.0.0.1",
        redirectIsLoopback: true,
        scope: ["sally:tools"],
      }),
      beginConsent: vi.fn().mockResolvedValue({
        handle: "a".repeat(30),
        headers: new Headers({ "Set-Cookie": "browser-bound" }),
      }),
      denyConsent: vi.fn().mockResolvedValue({
        redirectTo: "http://127.0.0.1/callback?error=access_denied",
        headers: new Headers(),
      }),
      approveConsent: vi.fn(),
    },
    OAUTH_KV: {
      get: vi.fn().mockResolvedValue({
        email: "test@example.com",
        auth: {},
        browser: "correct-browser",
      }),
    },
  } as unknown as Env;
});
afterEach(() => vi.unstubAllGlobals());
it("escapes client-controlled consent text and prevents framing", async () => {
  const r = await authorize(new Request(env.PUBLIC_ORIGIN + "/authorize"), env);
  const text = await r.text();
  expect(text).toContain("&#60;script&#62;");
  expect(text).not.toContain("<script>bad");
  expect(text).toContain("127.0.0.1");
  expect(r.headers.get("content-security-policy")).toContain(
    "frame-ancestors 'none'",
  );
});
it("rejects forged cross-origin consent posts before calling helper", async () => {
  const r = await authorize(
    new Request(env.PUBLIC_ORIGIN + "/authorize/send", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
      body: new URLSearchParams({ handle: "a".repeat(30) }),
    }),
    env,
  );
  expect(r.status).toBe(400);
  expect(env.OAUTH_PROVIDER.approveConsent).not.toHaveBeenCalled();
});
it("requires the browser binding before verifying a code", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const r = await authorize(
    new Request(env.PUBLIC_ORIGIN + "/authorize/complete", {
      method: "POST",
      headers: {
        Origin: env.PUBLIC_ORIGIN,
        Cookie: "__Host-sally-login=wrong-browser",
      },
      body: new URLSearchParams({ handle: "a".repeat(30), code: "123456" }),
    }),
    env,
  );
  expect(r.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("denial uses the safe helper redirect", async () => {
  const r = await authorize(
    new Request(env.PUBLIC_ORIGIN + "/authorize/send", {
      method: "POST",
      headers: { Origin: env.PUBLIC_ORIGIN },
      body: new URLSearchParams({ handle: "a".repeat(30), decision: "deny" }),
    }),
    env,
  );
  expect(r.status).toBe(302);
  expect(r.headers.get("location")).toContain("error=access_denied");
});
