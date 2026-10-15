import type { Env } from "./types";
export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function upstream(
  env: Env,
  path: string,
  body: unknown,
  token?: string,
  base = env.SALLY_API_URL,
): Promise<unknown> {
  const url = new URL(path, base);
  if (url.protocol !== "https:")
    throw new ToolError("CONFIGURATION", "The Sally upstream must use HTTPS.");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok)
    throw new ToolError(
      response.status === 401
        ? "SALLY_SIGN_IN_REQUIRED"
        : "UPSTREAM_UNAVAILABLE",
      `Sally API request failed (${response.status}). Please retry or reconnect your Sally account.`,
    );
  const text = await response.text();
  if (text.length > 500000)
    throw new ToolError(
      "INVALID_UPSTREAM",
      "Sally returned an oversized response.",
    );
  return JSON.parse(text);
}
