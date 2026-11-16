import { db } from "./db";
import { sha256, type Business } from "./auth";
import type { CustomerRow, ItemRow, QuotationRow } from "./quotations";

export type SharedQuotation = {
  quotation: QuotationRow;
  business: Business;
  customer: CustomerRow;
  items: ItemRow[];
  expiresAt: string;
};

export function resolveShareToken(token: string): SharedQuotation | null {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;

  const record = db()
    .prepare(
      `SELECT quotation_id, business_id, expires_at FROM quotation_share_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString()) as
    | { quotation_id: string; business_id: string; expires_at: string }
    | undefined;
  if (!record) return null;

  const quotation = db()
    .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ? AND quotation_number IS NOT NULL")
    .get(record.quotation_id, record.business_id) as QuotationRow | undefined;
  if (!quotation) return null;

  const business = db().prepare("SELECT * FROM businesses WHERE id = ?").get(record.business_id) as
    | Business
    | undefined;
  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(quotation.customer_id, record.business_id) as CustomerRow | undefined;
  if (!business || !customer) return null;

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order")
    .all(quotation.id) as ItemRow[];

  return { quotation, business, customer, items, expiresAt: record.expires_at };
}
