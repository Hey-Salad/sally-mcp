import { describe, it, expect } from "vitest";
import { pseudonym, limit, usage } from "../src/privacy";
import type { Env } from "../src/types";
describe("privacy and usage", () => {
  it("HMAC subjects are stable, key-specific, and contain no raw email/IP", async () => {
    const e = { USAGE_HMAC_KEY: "a".repeat(64) } as Env;
    const a = await pseudonym(e, "person@example.com");
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(await pseudonym(e, "person@example.com")).toBe(a);
    expect(
      await pseudonym(
        { ...e, USAGE_HMAC_KEY: "b".repeat(64) },
        "person@example.com",
      ),
    ).not.toBe(a);
    await expect(pseudonym({ ...e, USAGE_HMAC_KEY: "" }, "x")).rejects.toThrow(
      "privacy key",
    );
  });
  it("quota uses one atomic upsert and a real expiry for each period", async () => {
    let query = "",
      params: unknown[] = [];
    const e = {
      DB: {
        prepare: (sql: string) => {
          query = sql;
          return {
            bind: (...args: unknown[]) => {
              params = args;
              return { first: async () => ({ count: 4 }) };
            },
          };
        },
      },
    } as unknown as Env;
    expect(await limit(e, "hash", "tool", 3, 600)).toBe(false);
    expect(query).toContain("ON CONFLICT");
    expect(query).toContain("RETURNING count");
    expect(params[3]).toBe((Number(params[2]) + 1) * 600);
  });
  it("usage stores only pseudonym, tool, status, duration, epoch", async () => {
    let params: unknown[] = [];
    const e = {
      DB: {
        prepare: () => ({
          bind: (...a: unknown[]) => {
            params = a;
            return { run: async () => ({ success: true }) };
          },
        }),
      },
    } as unknown as Env;
    await usage(e, "pseudonym", "match_products", "ok", 10);
    expect(params.slice(0, 4)).toEqual([
      "pseudonym",
      "match_products",
      "ok",
      10,
    ]);
    expect(params).toHaveLength(5);
  });
});
