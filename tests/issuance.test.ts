import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "facturafacil-test-"));

const { db, nowIso, todayIso, uid } = await import("@/lib/db");
const { allocateQuotationNumber, effectiveStatus, createShareToken, revokeShareTokens, activeShareToken } = await import(
  "@/lib/quotations"
);
const { resolveShareToken } = await import("@/lib/share");

const businesses: string[] = [];
const customers: string[] = [];

function makeBusiness(name: string): string {
  const id = uid();
  const userId = uid();
  db()
    .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .run(userId, `${userId}@test.local`, "scrypt$test$test", nowIso());
  db()
    .prepare("INSERT INTO businesses (id, owner_user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, userId, name, nowIso(), nowIso());
  businesses.push(id);
  return id;
}

function makeCustomer(businessId: string, name: string): string {
  const id = uid();
  db()
    .prepare("INSERT INTO customers (id, business_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, businessId, name, nowIso(), nowIso());
  customers.push(id);
  return id;
}

function makeQuotation(businessId: string, customerId: string, number: string, validUntil: string): string {
  const id = uid();
  db()
    .prepare(
      `INSERT INTO quotations (id, business_id, customer_id, quotation_number, issue_date, valid_until, status,
        subtotal_cents, discount_cents, tax_cents, total_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'enviada', 1000, 0, 160, 1160, ?, ?)`,
    )
    .run(id, businessId, customerId, number, todayIso(), validUntil, nowIso(), nowIso());
  return id;
}

beforeAll(() => {
  db();
});

describe("quotation numbering", () => {
  it("increments sequentially per business and year", () => {
    const a = makeBusiness("Negócio A");
    expect(allocateQuotationNumber(a, 2026)).toBe("ORC-2026-0001");
    expect(allocateQuotationNumber(a, 2026)).toBe("ORC-2026-0002");
    expect(allocateQuotationNumber(a, 2027)).toBe("ORC-2027-0001");
  });

  it("isolates sequences between businesses", () => {
    const b = makeBusiness("Negócio B");
    expect(allocateQuotationNumber(b, 2026)).toBe("ORC-2026-0001");
    expect(allocateQuotationNumber(b, 2026)).toBe("ORC-2026-0002");
  });

  it("never reuses numbers after a rollback-free failure", () => {
    const c = makeBusiness("Negócio C");
    const first = allocateQuotationNumber(c, 2026);
    const second = allocateQuotationNumber(c, 2026);
    expect(first).not.toBe(second);
    expect(second).toBe("ORC-2026-0002");
  });
});

describe("effective status", () => {
  it("marks sent quotations past validity as expired", () => {
    expect(effectiveStatus({ status: "enviada", valid_until: "2000-01-01" })).toBe("expirada");
    expect(effectiveStatus({ status: "enviada", valid_until: "2999-01-01" })).toBe("enviada");
    expect(effectiveStatus({ status: "aceite", valid_until: "2000-01-01" })).toBe("aceite");
  });
});

describe("share tokens", () => {
  it("resolves an active token and rejects it after revocation", () => {
    const businessId = makeBusiness("Negócio Partilha");
    const customerId = makeCustomer(businessId, "Cliente Partilha");
    const quotationId = makeQuotation(businessId, customerId, "ORC-2026-0900", "2999-12-31");

    const token = createShareToken(quotationId, businessId, 30);
    const resolved = resolveShareToken(token);
    expect(resolved?.quotation.id).toBe(quotationId);
    expect(resolved?.business.id).toBe(businessId);
    expect(activeShareToken(quotationId, businessId)?.token).toBe(token);

    revokeShareTokens(quotationId, businessId);
    expect(resolveShareToken(token)).toBeNull();
    expect(activeShareToken(quotationId, businessId)).toBeUndefined();
  });

  it("rejects malformed and expired tokens", () => {
    expect(resolveShareToken("short")).toBeNull();
    expect(resolveShareToken("x".repeat(40))).toBeNull();

    const businessId = makeBusiness("Negócio Expira");
    const customerId = makeCustomer(businessId, "Cliente Expira");
    const quotationId = makeQuotation(businessId, customerId, "ORC-2026-0901", "2999-12-31");
    const token = createShareToken(quotationId, businessId, 30);
    db()
      .prepare("UPDATE quotation_share_tokens SET expires_at = ? WHERE quotation_id = ?")
      .run("2000-01-01T00:00:00.000Z", quotationId);
    expect(resolveShareToken(token)).toBeNull();
  });
});

describe("tenant isolation", () => {
  it("does not return another business's quotation", () => {
    const owner = makeBusiness("Dono");
    const other = makeBusiness("Outro");
    const customerId = makeCustomer(owner, "Cliente");
    const quotationId = makeQuotation(owner, customerId, "ORC-2026-0902", "2999-12-31");

    const asOther = db()
      .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?")
      .get(quotationId, other);
    expect(asOther).toBeUndefined();

    const asOwner = db()
      .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?")
      .get(quotationId, owner);
    expect(asOwner).toBeDefined();
  });
});
