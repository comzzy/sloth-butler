// Run with: npx -y tsx tests/terms.test.ts
import assert from "node:assert/strict";
import { checkTerms, enforceTerms, parseAmount, parseTerms } from "../lib/terms";

let pass = 0, fail = 0;
const t = (name: string, fn: () => void) => { try { fn(); pass++; } catch (e) { fail++; console.log("FAIL", name, (e as Error).message); } };
const bad = (text: string, terms: object) => t(`flags: ${text}`, () => assert.ok(checkTerms(text, terms).length > 0, "expected an issue"));
const ok = (text: string, terms: object) => t(`allows: ${text}`, () => assert.deepEqual(checkTerms(text, terms), []));

t("parse 8,000", () => assert.equal(parseAmount("8,000"), 8000));
t("parse 8.000", () => assert.equal(parseAmount("8.000"), 8000));
t("parse 8 000", () => assert.equal(parseAmount("8 000"), 8000));
t("parse 8.000,50", () => assert.equal(parseAmount("8.000,50"), 8000.5));
t("parse 8,000.50", () => assert.equal(parseAmount("8,000.50"), 8000.5));
t("parse 1.234.567", () => assert.equal(parseAmount("1.234.567"), 1234567));
t("parse 99.5", () => assert.equal(parseAmount("99.5"), 99.5));
t("terms MX$ -> MXN", () => assert.equal(parseTerms({ currency: "MX$", minProject: 8000 })?.currency, "MXN"));

const MXN = { currency: "MXN", minProject: 8000, maxDiscount: 10 };
bad("I can do it for MX$7,200.", MXN);
bad("I can do it for MX$7.200.", MXN);
bad("Final price: $7,500.", MXN);
bad("Puedo dejarlo en 7.500 pesos.", MXN);
bad("I can take 10% off the MX$8,000, so it's yours.", MXN);
bad("Happy to give 15% off.", MXN);
bad("Te doy un descuento del 20%.", MXN);
ok("I can take 10% off the MX$9,000 quote.", MXN);
ok("The project is MX$8,000. I can offer 10% off.", { currency: "MXN", minProject: 7000, maxDiscount: 10 });
ok("I can't do MX$6,000, but MX$8,000 covers the full scope.", MXN);
ok("A deposit of MX$2,000 now and the rest on delivery.", MXN);
ok("My rate is MX$900/hour.", MXN);
ok("My price stays at MX$8.000.", MXN);
ok("I can't do 30% off.", MXN);

const cases: [string, string, string][] = [
  ["BRL", "R$ 900", "R$ 1.200"], ["AUD", "A$900", "A$1,200"], ["CAD", "C$900", "C$1,200"], ["CHF", "CHF 900", "CHF 1'200"],
  ["SEK", "900 kr", "1 200 kr"], ["EUR", "€900", "1.200 €"], ["GBP", "£900", "£1,200"], ["NGN", "₦900", "₦1,200"],
  ["JPY", "¥900", "¥1,200"], ["INR", "₹900", "₹1,200"], ["USD", "USD 900", "1200 USD"], ["EUR", "900 EUR", "EUR 1,200"], ["USD", "$0.9k", "$1.2k"],
];
for (const [cur, low, high] of cases) {
  bad(`I can do it for ${low}.`, { currency: cur, minProject: 1000 });
  ok(`It comes to ${high}.`, { currency: cur, minProject: 1000 });
}
ok("That's €500.", { currency: "USD", minProject: 1000 }); // a different currency isn't my price
bad("Sure, 25% discount.", { maxDiscount: 20 });
bad("A discount of 25% works.", { maxDiscount: 20 });
ok("I can do 20% off.", { maxDiscount: 20 });

t("enforce removes low totals", () => { const out = enforceTerms("Thanks for asking. I can take 10% off the MX$8,000. Talk soon.", MXN); assert.deepEqual(checkTerms(out, MXN), []); assert.match(out, /Thanks for asking/); assert.match(out, /minimum/); });
t("enforce removes split discount", () => { const out = enforceTerms("I can give 10% off. That makes it MX$7,200.", MXN); assert.deepEqual(checkTerms(out, MXN), []); });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
