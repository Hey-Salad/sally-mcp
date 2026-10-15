import { spawn } from "node:child_process";
const config = {
  mcp_servers: {
    sally: {
      url: "https://sally-mcp-staging.heysalad-o.workers.dev/mcp",
      tool_timeout_sec: 120,
    },
  },
  features: { apps: false },
};
const args = [
  "exec",
  ...(process.env.SALLY_TEST_MODEL
    ? ["--model", process.env.SALLY_TEST_MODEL]
    : []),
  "--skip-git-repo-check",
  "--json",
  "-c",
  `mcp_servers.sally.url=${JSON.stringify(config.mcp_servers.sally.url)}`,
  "-c",
  "mcp_servers.sally.tool_timeout_sec=120",
  'Call only Sally MCP match_products with list ["milk"], retailer "ocado", candidates []. Report the actual tool result and its amber note. Do not use shell, browser, web, other MCP servers or other tools. This is a validation call; no basket or payment actions.',
];
const child = spawn("codex", args, { stdio: ["ignore", "pipe", "pipe"] });
let stdout = "",
  stderr = "";
child.stdout.on("data", (b) => (stdout += b));
child.stderr.on("data", (b) => (stderr += b));
const timer = setTimeout(() => child.kill("SIGTERM"), 120000);
child.on("close", (code) => {
  clearTimeout(timer);
  const lines = stdout
    .split("\n")
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  const relevant = lines.filter(
    (d) =>
      JSON.stringify(d).includes("match_products") ||
      d.type === "turn.failed" ||
      d.type === "error",
  );
  console.log(JSON.stringify({ exit: code, events: relevant }, null, 2));
  if (
    code === 0 &&
    !relevant.some(
      (d) =>
        d.type === "item.completed" &&
        d.item?.type === "mcp_tool_call" &&
        d.item?.server === "sally" &&
        d.item?.tool === "match_products" &&
        d.item?.status === "completed" &&
        !d.item?.error,
    )
  ) {
    console.error("Sally MCP call was not observed");
    process.exitCode = 1;
    return;
  }
  if (code) console.log(stderr.slice(-2000));
  process.exitCode = code ?? 1;
});
