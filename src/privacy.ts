import type { Env } from "./types";
export async function pseudonym(env: Env, subject: string): Promise<string> {
  if (!env.USAGE_HMAC_KEY || env.USAGE_HMAC_KEY.length < 32)
    throw new Error("Usage privacy key is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.USAGE_HMAC_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(subject),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function limit(
  env: Env,
  key: string,
  bucket: string,
  maximum: number,
  period = 60,
) {
  const window = Math.floor(Date.now() / 1000 / period);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits(subject,bucket,window,count,expires_at) VALUES(?,?,?,1,?)
 ON CONFLICT(subject,bucket,window) DO UPDATE SET count=count+1 RETURNING count`,
  )
    .bind(key, bucket, window, (window + 1) * period)
    .first<{ count: number }>();
  return !!row && row.count <= maximum;
}
export async function usage(
  env: Env,
  subject: string,
  tool: string,
  status: string,
  duration: number,
) {
  await env.DB.prepare(
    "INSERT INTO usage_logs(subject,tool,status,duration_ms,created_at) VALUES(?,?,?,?,?)",
  )
    .bind(subject, tool, status, duration, Math.floor(Date.now() / 1000))
    .run();
}
