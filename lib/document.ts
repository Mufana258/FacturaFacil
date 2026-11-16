import { readFileSync } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./db";
import { parseSnapshot, type CustomerRow, type ItemRow, type QuotationRow, type Snapshot } from "./quotations";
import type { Business } from "./auth";
import type { DocumentData } from "@/components/quotation-document";

export function logoUrlFor(logoPath: string | null): string | null {
  if (!logoPath || !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(logoPath)) return null;
  return `/api/logo/${logoPath}`;
}

export function logoDataUri(logoPath: string | null): string | null {
  if (!logoPath || !/^[a-f0-9-]+\.(png|jpg|webp)$/.test(logoPath)) return null;
  try {
    const ext = logoPath.split(".").pop() ?? "png";
    const mime = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    const bytes = readFileSync(path.join(UPLOAD_DIR, logoPath));
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function documentFromSnapshot(snapshot: Snapshot): DocumentData {
  return {
    business: {
      ...snapshot.business,
      logoUrl: logoUrlFor(snapshot.business.logo_path),
    },
    customer: snapshot.customer,
    reference: snapshot.quotation.quotation_number,
    title: snapshot.quotation.title,
    issueDate: snapshot.quotation.issue_date,
    validUntil: snapshot.quotation.valid_until,
    notes: snapshot.quotation.notes,
    terms: snapshot.quotation.terms,
    items: snapshot.items.map((item) => ({
      description: item.description,
      quantityMilli: item.quantity_milli,
      unit: item.unit,
      unitPriceCents: item.unit_price_cents,
      discountBp: item.discount_bp,
      lineTotalCents: item.line_total_cents,
    })),
    subtotalCents: snapshot.quotation.subtotal_cents,
    discountCents: snapshot.quotation.discount_cents,
    taxCents: snapshot.quotation.tax_cents,
    totalCents: snapshot.quotation.total_cents,
  };
}

export function documentFromLive(
  business: Business,
  customer: CustomerRow,
  quotation: QuotationRow,
  items: ItemRow[],
): DocumentData {
  return {
    business: {
      name: business.name,
      nuit: business.nuit,
      email: business.email,
      phone: business.phone,
      whatsapp: business.whatsapp,
      address: business.address,
      city: business.city,
      province: business.province,
      logoUrl: logoUrlFor(business.logo_path),
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
    reference: quotation.quotation_number ?? "Rascunho",
    title: quotation.title,
    issueDate: quotation.issue_date,
    validUntil: quotation.valid_until,
    notes: quotation.notes,
    terms: quotation.terms,
    items: items.map((item) => ({
      description: item.description,
      quantityMilli: item.quantity_milli,
      unit: item.unit,
      unitPriceCents: item.unit_price_cents,
      discountBp: item.discount_bp,
      lineTotalCents: item.line_total_cents,
    })),
    subtotalCents: quotation.subtotal_cents,
    discountCents: quotation.discount_cents,
    taxCents: quotation.tax_cents,
    totalCents: quotation.total_cents,
  };
}

export function documentForQuotation(
  business: Business,
  customer: CustomerRow,
  quotation: QuotationRow,
  items: ItemRow[],
): DocumentData {
  const snapshot = parseSnapshot(quotation);
  if (snapshot) return documentFromSnapshot(snapshot);
  return documentFromLive(business, customer, quotation, items);
}
