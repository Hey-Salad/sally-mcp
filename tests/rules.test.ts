import { it, expect } from "vitest";
import fixtures from "./rules-fixtures.json";
import { fullRulesCheck } from "../src/rules";
it.each(fixtures)(
  "matches Python reference: $line → $product",
  ({ line, product, expected }) => {
    expect(fullRulesCheck(line, product)).toEqual(expected);
  },
);
