import { getEnv } from "../apps/bot/src/config/env";
import {
  cleanupTranscript,
  parseSaleTranscript
} from "../apps/bot/src/services/cleanup-text.service";
import { normalizeSaleItemFields } from "../packages/shared/utils/date-range";

const transcript = "Буханка хлеба пять штук по сто рублей. Сникерс три штуки по двести рублей.";
const env = getEnv();
const cleanedText = await cleanupTranscript(env, transcript);
const result = await parseSaleTranscript(env, transcript, cleanedText);
const items = result.parsedSale.items.map((item) => normalizeSaleItemFields(item));

const expected = [
  { product_name: "Буханка хлеба", quantity: 5, price: 100, total: 500, status: "processed" },
  { product_name: "Сникерс", quantity: 3, price: 200, total: 600, status: "processed" }
];

const matches = items.length === expected.length && expected.every((expectedItem, index) => {
  const item = items[index];
  return item?.product_name === expectedItem.product_name &&
    item.quantity === expectedItem.quantity &&
    item.price === expectedItem.price &&
    item.total === expectedItem.total &&
    item.status === expectedItem.status;
});

if (!matches) {
  throw new Error(`Parser smoke failed: ${JSON.stringify(items)}`);
}

console.log(JSON.stringify({
  smoke: "parser",
  itemCount: items.length,
  total: items.reduce((sum, item) => sum + (item.total ?? 0), 0),
  needsReview: result.parsedSale.needs_review,
  usedFallback: Boolean(result.errorMessage)
}));
