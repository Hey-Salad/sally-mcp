// TypeScript port of sally-model/rules/sally_rules.py at 783d766.
// AGPL-3.0-only, HeySalad Inc. Shadow only; never overrides the API.
const UNIT = {
  g: ["g", 1],
  gram: ["g", 1],
  grams: ["g", 1],
  kg: ["g", 1000],
  kilo: ["g", 1000],
  oz: ["g", 28.35],
  lb: ["g", 453.6],
  lbs: ["g", 453.6],
  ml: ["ml", 1],
  cl: ["ml", 10],
  l: ["ml", 1000],
  ltr: ["ml", 1000],
  litre: ["ml", 1000],
  litres: ["ml", 1000],
  liter: ["ml", 1000],
  pint: ["ml", 568],
  pints: ["ml", 568],
  pt: ["ml", 568],
} as const;
const WORDNUM = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  six: 6,
  twelve: 12,
  dozen: 12,
  "half dozen": 6,
};
const TYPES = [
  ["kitchen roll", "kitchen (roll|towel)|paper towel"],
  [
    "wet wipes",
    "moist toilet|toilet tissue wipes|wet wipes|baby wipes|flushable wipes",
  ],
  ["toilet roll", "toilet (roll|tissue|paper)|loo roll|bathroom tissue"],
  [
    "coconut drink",
    "coconut (milk )?drink|coconut m[iy]lk alternative|dairy free coconut",
  ],
  ["coconut milk tin", "coconut milk|coconut cream"],
  ["olive spread", "olive (spread|buttery)|spreadable"],
  ["olives", "\\bolives\\b"],
  ["cooking spray", "\\bspray\\b"],
  ["olive oil", "olive oil"],
  ["crisps", "\\bcrisps?\\b|\\bchips\\b(?!.*fish)"],
  ["yogurt coated", "yogh?urt coated"],
  ["cheddar", "cheddar|cheese(?!.*(crisp|onion|cake|sauce))"],
  ["milk", "(semi[- ]?skimmed|skimmed|whole|full fat|1%)?\\s*milk\\b"],
  ["yoghurt", "yogh?o?urt"],
  ["loose tea", "loose (leaf )?tea|\\bloose leaf\\b"],
  ["tea bags", "tea ?bags?|\\btea\\b"],
  ["rice", "\\brice\\b"],
  ["washing up spray", "(power )?spray.*(lemon|washing|dish)|skip the soak"],
  [
    "washing up liquid",
    "washing[- ]up liquid|dish(washing)? liquid|fairy liquid",
  ],
  ["butter", "\\bbutter\\b"],
  ["bread", "\\bbread\\b|\\bloaf\\b"],
  ["eggs", "\\beggs?\\b"],
  ["pasta", "pasta|spaghetti|penne|fusilli"],
  ["chicken", "chicken"],
  ["bananas", "banana"],
  ["juice", "\\bjuice\\b"],
];
const FORM_WORDS = [
  "frozen",
  "dried",
  "tinned|canned|in tins?",
  "powder|powdered",
  "sliced",
  "grated",
  "smoked",
  "concentrate",
  "flavoured|flavor",
  "spray",
  "drink",
];
const OWN =
  "\\b(tesco|sainsbury'?s|asda|morrisons|waitrose|essential waitrose|m&s|marks|co-?op|ocado|aldi|lidl|iceland)\\b";
const PREMIUM =
  "\\b(finest|taste the difference|extra special|the best|specially selected|deluxe|no\\.? ?1|signature|collection)\\b";
const VALUE =
  "\\b(essential|just essentials|smart price|everyday|stockwell|hubbards|value|basics)\\b";
interface Quantity {
  per: number | null;
  unit: string;
  count: number;
  total: number;
  explicit_count?: boolean;
}
export function parseQuantity(text: string): Quantity | null {
  const t = text.toLowerCase().replace(/,/g, "");
  const multi = t.match(
    /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|grams?|g|ml|cl|l|ltr)\b/i,
  );
  const unit = (s: string) =>
    UNIT[s as keyof typeof UNIT] ??
    UNIT[s.replace(/s$/, "") as keyof typeof UNIT];
  if (multi) {
    const [u, f] = unit(multi[3]);
    return {
      per: Number(multi[2]) * f,
      unit: u,
      count: Number(multi[1]),
      total: Number(multi[1]) * Number(multi[2]) * f,
    };
  }
  const size = t.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|grams?|g|oz|lbs?|ml|cl|ltr|litres?|liter|l|pints?|pt)\b/i,
  );
  const pack = t.match(
    /(\d+)\s*(?:-\s*)?(?:pack|pk|rolls?|bags|tea bags|sheets|eggs|tins|cans|bottles|pieces|pcs|count|ct)\b|\bpack of (\d+)|\bx\s?(\d+)\b|\b(\d+)\s*x\b(?!\s*\d)/i,
  );
  let count: number | null = pack ? Number(pack.slice(1).find(Boolean)) : null;
  if (count === null) {
    const lead = t.match(
      /^\s*(\d+|a|an|one|two|three|four|six|twelve|dozen)\s+(?!x\b)(?!(?:kg|g|ml|l|cl|pints?|oz|lb)\b)([a-z])/i,
    );
    if (lead)
      count = /^\d+$/.test(lead[1])
        ? Number(lead[1])
        : WORDNUM[lead[1] as keyof typeof WORDNUM];
  }
  if (size) {
    const [u, f] = unit(size[2]);
    return {
      per: Number(size[1]) * f,
      unit: u,
      count: count || 1,
      total: Number(size[1]) * f * (count || 1),
      explicit_count: count !== null,
    };
  }
  return count ? { per: null, unit: "item", count, total: count } : null;
}
const productType = (text: string) =>
  TYPES.find(([, pat]) => new RegExp(pat, "i").test(text))?.[0] ?? null;
const forms = (text: string) =>
  new Set(
    FORM_WORDS.filter((w) =>
      new RegExp("\\b(" + w + ")\\b", "i").test(text),
    ).map((w) => w.split("|")[0]),
  );
export function fullRulesCheck(line: string, product: string) {
  const reasons: string[] = [];
  const lq = parseQuantity(line),
    pq = parseQuantity(product),
    lt = productType(line),
    pt = productType(product);
  const flags = {
    organic: /\borganic\b/i.test(product) && !/\borganic\b/i.test(line),
    own_label: new RegExp(OWN, "i").test(product),
    premium:
      new RegExp(PREMIUM, "i").test(product) &&
      !new RegExp(PREMIUM, "i").test(line),
    value_range: new RegExp(VALUE, "i").test(product),
  };
  if (lt && pt && lt !== pt) reasons.push(`type mismatch: ${lt} vs ${pt}`);
  const lf = forms(line),
    pf = forms(product);
  const extra = new Set(
    lt === pt ? [...pf].filter((f) => !lf.has(f) && f !== "drink") : [],
  );
  if (pf.has("drink") && !lf.has("drink") && lt && !lt.includes("drink"))
    extra.add("drink");
  if (extra.size && lt && pt)
    reasons.push("form mismatch: " + [...extra].sort().join(","));
  let ratio: number | null = null;
  if (lq && pq) {
    if (lq.unit === pq.unit) ratio = lq.total ? pq.total / lq.total : null;
    else if (lq.unit === "item" && pq.unit !== "item")
      ratio = pq.count / lq.count;
    if (ratio !== null && !(0.5 <= ratio && ratio <= 2))
      reasons.push(`size/pack: offered ${ratio.toFixed(2)}x of requested`);
  }
  const verdict = reasons.length
    ? "reject"
    : lt && pt && lt === pt && (ratio !== null || !lq)
      ? "ok"
      : "unknown";
  return {
    verdict,
    reasons,
    flags,
    line_type: lt,
    product_type: pt,
    ratio,
    line_qty: lq,
    product_qty: pq,
  };
}
