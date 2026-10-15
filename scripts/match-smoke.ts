import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const base =
  process.argv[2] ?? "https://sally-mcp-staging.heysalad-o.workers.dev";
const client = new Client({
  name: "sally-live-candidate-smoke",
  version: "0.1.0",
});
await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", base)));
// Synthetic validation cards. These are NOT catalogue observations or current-price claims.
for (const [item, name, expected] of [
  ["milk 2 pints", "Whole milk 2 pints", true],
  ["bananas", "Banana bread", false],
] as const) {
  const r = await client.callTool(
    {
      name: "match_products",
      arguments: {
        list: [item],
        retailer: "ocado",
        candidates: [
          {
            item_index: 0,
            products: [
              {
                id: "synthetic-validation-only",
                name,
                pack_size: expected ? "2 pints" : "1 loaf",
                price: 1.8,
                currency: "GBP",
                url: "https://www.ocado.com/",
                in_stock: true,
              },
            ],
          },
        ],
      },
    },
    undefined,
    { timeout: 120000 },
  );
  assert.ok(!r.isError, JSON.stringify(r.content));
  const d = r.structuredContent as any;
  assert.equal(!!d.matches[0].product, expected);
  console.log(
    JSON.stringify({
      fixture: item,
      expected,
      matched: !!d.matches[0].product,
      model: d.matches[0].explanation?.model,
      run_id: d.run_id,
      mode: "synthetic test cards; live hosted MCP and live Sally API",
    }),
  );
}
await client.close();
