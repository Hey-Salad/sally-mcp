// Live dev API validation using the intentionally created guest test session.
import { readFileSync } from "node:fs";
import { executeTool } from "../src/tools";
import type { Env, Identity } from "../src/types";
const vars = readFileSync(".dev.vars", "utf8");
const token = vars.match(/^SALLY_ANONYMOUS_TOKEN=(.*)$/m)![1];
const env = {
  SALLY_API_URL: "https://sally-api-dev.heysalad-o.workers.dev",
  SALLY_ANONYMOUS_TOKEN: token,
} as Env;
const identity = {
  userId: "isolated-guest-validation",
  upstreamToken: token,
  scopes: ["sally:tools"],
} as Identity;
const r = await executeTool(
  "recipe_to_list",
  {
    recipe_text:
      "Tomato pasta for 2: 200g pasta, 400g chopped tomatoes, 1 onion.",
    servings: 2,
  },
  env,
  identity,
);
console.log(JSON.stringify({ tool: "recipe_to_list", result: r }, null, 2));
