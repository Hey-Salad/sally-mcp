// Creates only a guest Sally session; never reads user credentials or prints tokens.
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const mode = process.argv[2] ?? "local";
const response = await fetch(
  "https://sally-api-dev.heysalad-o.workers.dev/api/auth/guest-session",
  { method: "POST" },
);
if (!response.ok) throw new Error(`Guest bootstrap failed: ${response.status}`);
const data = await response.json();
const token = data.data?.token ?? data.token;
if (typeof token !== "string") throw new Error("No guest credential returned");
const privacyKey = randomBytes(32).toString("hex");
if (mode === "remote") {
  for (const [name, value] of Object.entries({
    USAGE_HMAC_KEY: privacyKey,
    SALLY_ANONYMOUS_TOKEN: token,
  })) {
    const r = spawnSync(
      "npx",
      ["wrangler", "secret", "put", name, "--env", "staging"],
      { input: value, encoding: "utf8" },
    );
    if (r.status !== 0)
      throw new Error(`Secret installation failed for ${name}`);
    console.log(`Installed ${name} in staging (value hidden)`);
  }
} else {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    ".dev.vars",
    `USAGE_HMAC_KEY=${privacyKey}\nSALLY_ANONYMOUS_TOKEN=${token}\n`,
    { mode: 0o600 },
  );
  console.log("Configured ignored local development secrets (values hidden)");
}
