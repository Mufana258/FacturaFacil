import { db, nowIso, todayIso, uid } from "./db";
import { newOpaqueToken, sha256 } from "./hash";
import type { Business } from "./auth";
import type { QuotationStatus } from "./schemas";
import { formatMoney } from "./money";

export type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  company_name: string | null;
  nuit: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  type: "produto" | "servico";
  unit: string;
  price_cents: number;
  category: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type QuotationRow = {
  id: string;
  business_id: string;
  customer_id: string;
  quotation_number: string | null;
  title: string | null;
  issue_date: string;
  valid_until: string;
  status: QuotationStatus;
  subtotal_cents: number;
  discount_cents: number;
  quote_discount_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  terms: string | null;
  issued_snapshot: string | null;
  issued_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  quotation_id: string;
  business_id: string;
  catalog_item_id: string | null;
  description: string;
  quantity_milli: number;
  unit: string;
  unit_price_cents: number;
  discount_bp: number;
  tax_rate_bp: number;
  line_total_cents: number;
  sort_order: number;
};

export type Snapshot = {
  issued_at: string;
  business: {
    name: string;
    nuit: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    logo_path: string | null;
  };
  customer: {
    name: string;
    company_name: string | null;
    nuit: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
  };
  quotation: {
    quotation_number: string;
    title: string | null;
    issue_date: string;
    valid_until: string;
    notes: string | null;
    terms: string | null;
    subtotal_cents: number;
    discount_cents: number;
    quote_discount_cents: number;
    tax_cents: number;
    total_cents: number;
  };
  items: {
    description: string;
    quantity_milli: number;
    unit: string;
    unit_price_cents: number;
    discount_bp: number;
    tax_rate_bp: number;
    line_total_cents: number;
  }[];
};

export function effectiveStatus(row: Pick<QuotationRow, "status" | "valid_until">): QuotationStatus {
  if (row.status === "enviada" && row.valid_until < todayIso()) return "expirada";
  return row.status;
}

/** Atomic per-business, per-year allocation. BEGIN IMMEDIATE serialises writers. */
export function allocateQuotationNumber(businessId: string, year: number): string {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const row = database
      .prepare("SELECT last_number FROM quotation_sequences WHERE business_id = ? AND year = ?")
      .get(businessId, year) as { last_number: number } | undefined;
    const next = (row?.last_number ?? 0) + 1;
    database
      .prepare(
        `INSERT INTO quotation_sequences (business_id, year, last_number) VALUES (?, ?, ?)
         ON CONFLICT(business_id, year) DO UPDATE SET last_number = excluded.last_number`,
      )
      .run(businessId, year, next);
    database.exec("COMMIT");
    return `ORC-${year}-${String(next).padStart(4, "0")}`;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function buildSnapshot(
  business: Business,
  customer: CustomerRow,
  quotation: QuotationRow,
  items: ItemRow[],
  number: string,
): Snapshot {
  return {
    issued_at: nowIso(),
    business: {
      name: business.name,
      nuit: business.nuit,
      email: business.email,
      phone: business.phone,
      whatsapp: business.whatsapp,
      address: business.address,
      city: business.city,
      province: business.province,
      logo_path: business.logo_path,
    },
    customer: {
      name: customer.name,
      company_name: customer.company_name,
      nuit: customer.nuit,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      address: customer.address,
      city: customer.city,
    },
    quotation: {
      quotation_number: number,
      title: quotation.title,
      issue_date: quotation.issue_date,
      valid_until: quotation.valid_until,
      notes: quotation.notes,
      terms: quotation.terms,
      subtotal_cents: quotation.subtotal_cents,
      discount_cents: quotation.discount_cents,
      quote_discount_cents: quotation.quote_discount_cents,
      tax_cents: quotation.tax_cents,
      total_cents: quotation.total_cents,
    },
    items: items.map((item) => ({
      description: item.description,
      quantity_milli: item.quantity_milli,
      unit: item.unit,
      unit_price_cents: item.unit_price_cents,
      discount_bp: item.discount_bp,
      tax_rate_bp: item.tax_rate_bp,
      line_total_cents: item.line_total_cents,
    })),
  };
}

export function parseSnapshot(row: QuotationRow): Snapshot | null {
  if (!row.issued_snapshot) return null;
  try {
    return JSON.parse(row.issued_snapshot) as Snapshot;
  } catch {
    return null;
  }
}

export function createShareToken(quotationId: string, businessId: string, days = 30): string {
  const token = newOpaqueToken();
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  db()
    .prepare(
      "INSERT INTO quotation_share_tokens (id, quotation_id, business_id, token, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(uid(), quotationId, businessId, token, sha256(token), expires, nowIso());
  return token;
}

export function revokeShareTokens(quotationId: string, businessId: string): void {
  db()
    .prepare(
      "UPDATE quotation_share_tokens SET revoked_at = ? WHERE quotation_id = ? AND business_id = ? AND revoked_at IS NULL",
    )
    .run(nowIso(), quotationId, businessId);
}

export function activeShareToken(quotationId: string, businessId: string) {
  return db()
    .prepare(
      `SELECT id, token, token_hash, expires_at, revoked_at FROM quotation_share_tokens
       WHERE quotation_id = ? AND business_id = ? AND revoked_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(quotationId, businessId, nowIso()) as
    | { id: string; token: string; token_hash: string; expires_at: string; revoked_at: string | null }
    | undefined;
}

export function normalizeWhatsApp(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("258")) return digits;
  if (digits.length === 9) return `258${digits}`;
  return digits;
}

export function whatsappMessage(params: {
  reference: string;
  totalCents: number;
  businessName: string;
  url: string;
}): string {
  return `Olá, segue a cotação ${params.reference} de ${params.businessName} no valor de ${formatMoney(
    params.totalCents,
  )} MT. Pode consultar o documento através deste link: ${params.url}`;
}
