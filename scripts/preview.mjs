import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const widget = readFileSync("ui/products.html", "utf8");
const data = {
  matches: [
    {
      item: "milk 2 pints",
      product: {
        name: "Whole milk",
        image_url: "https://www.ocado.com/sally-test-milk.svg",
        price: 1.8,
        pack_size: "2 pints",
        confidence: 0.96,
        url: "https://www.ocado.com/",
      },
      notes: [
        {
          style: "amber",
          text: "Confirm pack size and number of packs before adding to your basket.",
        },
      ],
    },
    {
      item: "chopped tomatoes 400g",
      product: {
        name: "Chopped tomatoes",
        image_url: "https://www.ocado.com/sally-test-tomatoes.svg",
        price: 0.75,
        pack_size: "400g",
        confidence: 0.92,
        url: "https://www.ocado.com/",
      },
      notes: [],
    },
  ],
  retailer: "ocado",
};
const fixture = `<script>document.querySelector('#label').textContent='Illustrative UI preview — test data, not current prices';render({structuredContent:${JSON.stringify(data)}});document.querySelector('#label').textContent='Illustrative UI preview — test data, not current prices';</script>`;
createServer((_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(widget.replace("</body>", fixture + "</body>"));
}).listen(Number(process.env.PORT ?? 8788), "127.0.0.1", () =>
  console.log(
    "Sally UI preview on http://127.0.0.1:8788 (illustrative fixture only)",
  ),
);
