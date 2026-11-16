export type LineInput = {
  quantityMilli: number;
  unitPriceCents: number;
  discountBp: number;
  taxRateBp: number;
};

export type LineTotals = {
  grossCents: number;
  discountCents: number;
  netCents: number;
  taxCents: number;
  totalCents: number;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  lines: LineTotals[];
};

export function roundDiv(numerator: number, denominator: number): number {
  if (numerator >= 0) return Math.floor((numerator + denominator / 2) / denominator);
  return -Math.floor((-numerator + denominator / 2) / denominator);
}

/** Parses a decimal quantity string into thousandths (2,5 -> 2500). */
export function parseQuantity(value: string | number): number | null {
  const raw = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  if (!/^\d+(\.\d{0,3})?$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  const milli = Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
  if (!Number.isSafeInteger(milli) || milli <= 0) return null;
  return milli;
}

export function formatQuantity(quantityMilli: number): string {
  const whole = Math.trunc(quantityMilli / 1000);
  const frac = String(quantityMilli % 1000).padStart(3, "0").replace(/0+$/, "");
  return frac ? `${whole},${frac}` : String(whole);
}

/**
 * Accepts "12500", "12.500,00", "12,500.00", "12500.5" and returns cents.
 * Avoids floating point by parsing digits manually.
 */
export function parseMoney(input: string | number): number | null {
  const raw = String(input).trim().replace(/\s/g, "").replace(/MT$/i, "").trim();
  if (!raw) return null;

  const digitsOnly = raw.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(digitsOnly)) return null;

  const negative = digitsOnly.startsWith("-");
  const body = digitsOnly.replace(/-/g, "");

  let whole: string;
  let frac = "";
  const lastComma = body.lastIndexOf(",");
  const lastDot = body.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const groupSep = decimalSep === "," ? "." : ",";
    const parts = body.split(decimalSep);
    frac = parts.pop() ?? "";
    whole = parts.join("").split(groupSep).join("");
  } else if (lastComma > -1) {
    const parts = body.split(",");
    const tail = parts[parts.length - 1];
    if (parts.length > 2 || tail.length === 3) {
      whole = parts.join("");
    } else {
      frac = parts.pop() ?? "";
      whole = parts.join("");
    }
  } else if (lastDot > -1) {
    const parts = body.split(".");
    const tail = parts[parts.length - 1];
    if (parts.length > 2 || tail.length === 3) {
      whole = parts.join("");
    } else {
      frac = parts.pop() ?? "";
      whole = parts.join("");
    }
  } else {
    whole = body;
  }

  whole = whole.replace(/\D/g, "") || "0";
  frac = frac.replace(/\D/g, "").padEnd(2, "0").slice(0, 2);

  const cents = Number(whole) * 100 + Number(frac);
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

export function formatMoney(cents: number): string {
  const value = Math.abs(cents);
  const whole = Math.floor(value / 100);
  const frac = String(value % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cents < 0 ? "-" : ""}${grouped},${frac}`;
}

export function formatMZN(cents: number): string {
  return `${formatMoney(cents)} MT`;
}

export function formatPercentFromBp(bp: number): string {
  const whole = Math.trunc(bp / 100);
  const frac = String(bp % 100).padStart(2, "0").replace(/0+$/, "");
  return frac ? `${whole},${frac}` : String(whole);
}

export function parsePercentToBp(input: string | number): number | null {
  const raw = String(input).trim().replace("%", "").replace(",", ".");
  if (!raw) return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(raw)) return null;
  const bp = Math.round(Number(raw) * 100);
  if (bp < 0 || bp > 10000) return null;
  return bp;
}

export function parseDate(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : iso;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function computeTotals(lines: LineInput[], quoteDiscountCents = 0): Totals {
  const computed = lines.map((line) => {
    const grossCents = roundDiv(line.quantityMilli * line.unitPriceCents, 1000);
    const discountCents = roundDiv(grossCents * line.discountBp, 10000);
    const netCents = grossCents - discountCents;
    return { line, grossCents, discountCents, netCents };
  });

  const subtotalCents = computed.reduce((sum, c) => sum + c.grossCents, 0);
  const itemDiscounts = computed.reduce((sum, c) => sum + c.discountCents, 0);
  const netSum = computed.reduce((sum, c) => sum + c.netCents, 0);

  const quoteDiscount = Math.min(Math.max(quoteDiscountCents, 0), netSum);

  // Distribute the quotation-level discount proportionally, largest remainder method.
  const allocations = new Array(computed.length).fill(0);
  if (quoteDiscount > 0 && netSum > 0) {
    const remainders: { index: number; remainder: number }[] = [];
    let allocated = 0;
    computed.forEach((c, index) => {
      const exact = (c.netCents * quoteDiscount) / netSum;
      const base = Math.floor(exact);
      allocations[index] = base;
      allocated += base;
      remainders.push({ index, remainder: exact - base });
    });
    let leftover = quoteDiscount - allocated;
    remainders.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; leftover > 0 && i < remainders.length; i++) {
      allocations[remainders[i].index] += 1;
      leftover -= 1;
    }
  }

  const lineTotals: LineTotals[] = computed.map((c, index) => {
    const taxable = c.netCents - allocations[index];
    const taxCents = roundDiv(taxable * c.line.taxRateBp, 10000);
    return {
      grossCents: c.grossCents,
      discountCents: c.discountCents,
      netCents: c.netCents,
      taxCents,
      totalCents: taxable + taxCents,
    };
  });

  const taxCents = lineTotals.reduce((sum, l) => sum + l.taxCents, 0);
  return {
    subtotalCents,
    discountCents: itemDiscounts + quoteDiscount,
    taxCents,
    totalCents: subtotalCents - itemDiscounts - quoteDiscount + taxCents,
    lines: lineTotals,
  };
}
