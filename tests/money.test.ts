import { describe, expect, it } from "vitest";
import {
  computeTotals,
  formatMoney,
  formatQuantity,
  parseMoney,
  parsePercentToBp,
  parseQuantity,
} from "@/lib/money";

describe("parseMoney", () => {
  it("parses plain, local and grouped formats to cents", () => {
    expect(parseMoney("12500")).toBe(1250000);
    expect(parseMoney("12.500,00")).toBe(1250000);
    expect(parseMoney("12,500.00")).toBe(1250000);
    expect(parseMoney("12500.5")).toBe(1250050);
    expect(parseMoney("0,99")).toBe(99);
    expect(parseMoney("1.234")).toBe(123400);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("uses Portuguese grouping and decimals", () => {
    expect(formatMoney(1250000)).toBe("12.500,00");
    expect(formatMoney(99)).toBe("0,99");
    expect(formatMoney(0)).toBe("0,00");
    expect(formatMoney(123456789)).toBe("1.234.567,89");
  });
});

describe("parseQuantity / formatQuantity", () => {
  it("keeps thousandths precision", () => {
    expect(parseQuantity("2,5")).toBe(2500);
    expect(parseQuantity("3")).toBe(3000);
    expect(parseQuantity("0,125")).toBe(125);
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("-1")).toBeNull();
    expect(formatQuantity(2500)).toBe("2,5");
    expect(formatQuantity(3000)).toBe("3");
  });
});

describe("parsePercentToBp", () => {
  it("converts percentages to basis points", () => {
    expect(parsePercentToBp("16")).toBe(1600);
    expect(parsePercentToBp("0")).toBe(0);
    expect(parsePercentToBp("5,5")).toBe(550);
    expect(parsePercentToBp("120")).toBeNull();
    expect(parsePercentToBp("x")).toBeNull();
  });
});

describe("computeTotals", () => {
  it("computes line and document totals with tax", () => {
    const totals = computeTotals(
      [
        { quantityMilli: 2000, unitPriceCents: 150000, discountBp: 0, taxRateBp: 1600 },
        { quantityMilli: 1000, unitPriceCents: 50000, discountBp: 1000, taxRateBp: 1600 },
      ],
      0,
    );
    expect(totals.subtotalCents).toBe(350000);
    expect(totals.discountCents).toBe(5000);
    expect(totals.taxCents).toBe(55200);
    expect(totals.totalCents).toBe(400200);
  });

  it("avoids floating point drift on awkward prices", () => {
    const totals = computeTotals([{ quantityMilli: 3000, unitPriceCents: 3333, discountBp: 0, taxRateBp: 0 }], 0);
    expect(totals.subtotalCents).toBe(9999);
    expect(totals.totalCents).toBe(9999);
  });

  it("distributes the document discount across lines before tax", () => {
    const totals = computeTotals(
      [
        { quantityMilli: 1000, unitPriceCents: 10000, discountBp: 0, taxRateBp: 1600 },
        { quantityMilli: 1000, unitPriceCents: 10000, discountBp: 0, taxRateBp: 1600 },
        { quantityMilli: 1000, unitPriceCents: 10000, discountBp: 0, taxRateBp: 1600 },
      ],
      10000,
    );
    expect(totals.discountCents).toBe(10000);
    const net = totals.lines.reduce((sum, line) => sum + line.netCents, 0);
    expect(net).toBe(30000);
    expect(totals.totalCents).toBe(30000 - 10000 + totals.taxCents);
    expect(totals.taxCents).toBe(3201);
  });

  it("caps the document discount at the discounted subtotal", () => {
    const totals = computeTotals([{ quantityMilli: 1000, unitPriceCents: 1000, discountBp: 0, taxRateBp: 0 }], 999999);
    expect(totals.totalCents).toBe(0);
    expect(totals.discountCents).toBe(1000);
  });
});
