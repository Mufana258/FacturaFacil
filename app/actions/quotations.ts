"use server";

import { revalidatePath } from "next/cache";
import { db, nowIso, todayIso, uid } from "@/lib/db";
import { requireBusiness } from "@/lib/auth";
import { quotationSchema } from "@/lib/schemas";
import { computeTotals, parseMoney, parsePercentToBp, parseQuantity } from "@/lib/money";
import {
  allocateQuotationNumber,
  buildSnapshot,
  createShareToken,
  revokeShareTokens,
  type CustomerRow,
  type ItemRow,
  type QuotationRow,
} from "@/lib/quotations";
import { zodErrors, type ActionResult } from "@/lib/action";
import { STATUSES, type QuotationStatus } from "@/lib/schemas";

function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

type ParsedLines = {
  description: string;
  quantityMilli: number;
  unit: string;
  unitPriceCents: number;
  discountBp: number;
  taxRateBp: number;
  lineTotalCents: number;
}[];

function parseLines(input: unknown): { lines: ParsedLines; error?: string } {
  const parsed = quotationSchema.safeParse(input);
  if (!parsed.success) return { lines: [], error: "Verifique os dados da cotação." };

  const lines: ParsedLines = [];
  for (const [index, line] of parsed.data.lines.entries()) {
    const quantityMilli = parseQuantity(line.quantity);
    const unitPriceCents = parseMoney(line.unitPrice);
    const discountBp = parsePercentToBp(line.discountPercent || "0");
    const taxRateBp = parsePercentToBp(line.taxPercent || "0");

    if (quantityMilli === null) return { lines: [], error: `Item ${index + 1}: quantidade inválida.` };
    if (unitPriceCents === null || unitPriceCents < 0) return { lines: [], error: `Item ${index + 1}: preço inválido.` };
    if (discountBp === null) return { lines: [], error: `Item ${index + 1}: desconto inválido (0 a 100).` };
    if (taxRateBp === null) return { lines: [], error: `Item ${index + 1}: taxa de IVA inválida (0 a 100).` };

    lines.push({
      description: line.description.trim(),
      quantityMilli,
      unit: line.unit,
      unitPriceCents,
      discountBp,
      taxRateBp,
      lineTotalCents: 0,
    });
  }
  return { lines };
}

async function loadQuotation(id: string, businessId: string): Promise<QuotationRow | null> {
  const row = db().prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?").get(id, businessId) as
    | QuotationRow
    | undefined;
  return row ?? null;
}

export async function saveQuotationAction(
  id: string | null,
  input: unknown,
  mode: "rascunho" | "emitir",
): Promise<ActionResult<{ id: string }>> {
  const { business } = await requireBusiness();
  const parsed = quotationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados da cotação.", fieldErrors: zodErrors(parsed.error) };
  }

  if (parsed.data.validUntil < parsed.data.issueDate) {
    return { ok: false, message: "A validade não pode ser anterior à data de emissão." };
  }

  const { lines, error } = parseLines(input);
  if (error) return { ok: false, message: error };

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(parsed.data.customerId, business.id) as CustomerRow | undefined;
  if (!customer) return { ok: false, message: "Cliente inválido." };

  const quoteDiscount = parseMoney(parsed.data.discount || "0");
  if (quoteDiscount === null || quoteDiscount < 0) {
    return { ok: false, message: "Desconto da cotação inválido.", fieldErrors: { discount: "Valor inválido" } };
  }

  const totals = computeTotals(
    lines.map((l) => ({
      quantityMilli: l.quantityMilli,
      unitPriceCents: l.unitPriceCents,
      discountBp: l.discountBp,
      taxRateBp: l.taxRateBp,
    })),
    quoteDiscount,
  );

  let quotationId = id;
  if (quotationId) {
    const existing = await loadQuotation(quotationId, business.id);
    if (!existing) return { ok: false, message: "Cotação não encontrada." };
    if (existing.quotation_number !== null || existing.status !== "rascunho") {
      return { ok: false, message: "Cotações emitidas não podem ser editadas. Duplique para criar uma nova versão." };
    }
  } else {
    quotationId = uid();
  }

  const timestamp = nowIso();
  db().exec("BEGIN IMMEDIATE");
  try {
    if (id) {
      db()
        .prepare(
          `UPDATE quotations SET customer_id = ?, title = ?, issue_date = ?, valid_until = ?, notes = ?, terms = ?,
             subtotal_cents = ?, discount_cents = ?, quote_discount_cents = ?, tax_cents = ?, total_cents = ?, updated_at = ?
           WHERE id = ? AND business_id = ?`,
        )
        .run(
          parsed.data.customerId,
          nullable(parsed.data.title),
          parsed.data.issueDate,
          parsed.data.validUntil,
          nullable(parsed.data.notes),
          nullable(parsed.data.terms),
          totals.subtotalCents,
          totals.discountCents,
          quoteDiscount,
          totals.taxCents,
          totals.totalCents,
          timestamp,
          quotationId,
          business.id,
        );
      db().prepare("DELETE FROM quotation_items WHERE quotation_id = ? AND business_id = ?").run(
        quotationId,
        business.id,
      );
    } else {
      db()
        .prepare(
          `INSERT INTO quotations (id, business_id, customer_id, quotation_number, title, issue_date, valid_until, status,
             subtotal_cents, discount_cents, quote_discount_cents, tax_cents, total_cents, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          quotationId,
          business.id,
          parsed.data.customerId,
          nullable(parsed.data.title),
          parsed.data.issueDate,
          parsed.data.validUntil,
          totals.subtotalCents,
          totals.discountCents,
          quoteDiscount,
          totals.taxCents,
          totals.totalCents,
          nullable(parsed.data.notes),
          nullable(parsed.data.terms),
          timestamp,
          timestamp,
        );
    }

    const insertItem = db().prepare(
      `INSERT INTO quotation_items (id, quotation_id, business_id, catalog_item_id, description, quantity_milli, unit,
        unit_price_cents, discount_bp, tax_rate_bp, line_total_cents, sort_order)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    lines.forEach((line, index) => {
      insertItem.run(
        uid(),
        quotationId,
        business.id,
        line.description,
        line.quantityMilli,
        line.unit,
        line.unitPriceCents,
        line.discountBp,
        line.taxRateBp,
        totals.lines[index]?.netCents ?? 0,
        index,
      );
    });

    db().exec("COMMIT");
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }

  if (mode === "emitir") {
    const issueResult = await issueQuotation(quotationId, business.id);
    if (!issueResult.ok) return { ok: false, message: issueResult.message };
  }

  revalidatePath("/cotacoes");
  revalidatePath("/painel");
  revalidatePath(`/cotacoes/${quotationId}`);
  return { ok: true, message: mode === "emitir" ? "Cotação emitida." : "Rascunho guardado.", data: { id: quotationId } };
}

export async function issueQuotation(quotationId: string, businessId?: string): Promise<ActionResult<{ number: string }>> {
  const { business } = await requireBusiness();
  if (businessId && businessId !== business.id) return { ok: false, message: "Cotação não encontrada." };

  const quotation = await loadQuotation(quotationId, business.id);
  if (!quotation) return { ok: false, message: "Cotação não encontrada." };
  if (quotation.quotation_number) {
    return { ok: true, message: "Cotação já emitida.", data: { number: quotation.quotation_number } };
  }

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(quotation.customer_id, business.id) as CustomerRow | undefined;
  if (!customer) return { ok: false, message: "Cliente inválido." };

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ? ORDER BY sort_order")
    .all(quotation.id, business.id) as ItemRow[];
  if (items.length === 0) return { ok: false, message: "Adicione pelo menos um item antes de emitir." };

  const year = Number(quotation.issue_date.slice(0, 4));
  const number = allocateQuotationNumber(business.id, year);
  const snapshot = buildSnapshot(business, customer, quotation, items, number);

  db()
    .prepare(
      `UPDATE quotations SET quotation_number = ?, status = 'enviada', issued_snapshot = ?, issued_at = ?, updated_at = ?
       WHERE id = ? AND business_id = ?`,
    )
    .run(number, JSON.stringify(snapshot), nowIso(), nowIso(), quotation.id, business.id);

  revalidatePath("/cotacoes");
  revalidatePath("/painel");
  revalidatePath(`/cotacoes/${quotation.id}`);
  return { ok: true, message: `Cotação ${number} emitida.`, data: { number } };
}

export async function updateQuotationStatusAction(id: string, status: string): Promise<ActionResult> {
  const { business } = await requireBusiness();
  if (!STATUSES.includes(status as QuotationStatus)) return { ok: false, message: "Estado inválido." };

  const quotation = await loadQuotation(id, business.id);
  if (!quotation) return { ok: false, message: "Cotação não encontrada." };

  if (status === "enviada" && !quotation.quotation_number) {
    const issued = await issueQuotation(id, business.id);
    return issued.ok ? { ok: true, message: issued.message } : issued;
  }
  if (!quotation.quotation_number) {
    return { ok: false, message: "Emita a cotação antes de alterar o estado." };
  }

  db()
    .prepare("UPDATE quotations SET status = ?, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(status, nowIso(), id, business.id);

  revalidatePath("/cotacoes");
  revalidatePath(`/cotacoes/${id}`);
  revalidatePath("/painel");
  return { ok: true, message: "Estado atualizado." };
}

export async function archiveQuotationAction(id: string, archived: boolean): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const result = db()
    .prepare("UPDATE quotations SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(archived ? nowIso() : null, nowIso(), id, business.id);
  if (result.changes === 0) return { ok: false, message: "Cotação não encontrada." };
  revalidatePath("/cotacoes");
  revalidatePath(`/cotacoes/${id}`);
  return { ok: true, message: archived ? "Cotação arquivada." : "Cotação restaurada." };
}

export async function duplicateQuotationAction(id: string): Promise<ActionResult<{ id: string }>> {
  const { business } = await requireBusiness();
  const original = await loadQuotation(id, business.id);
  if (!original) return { ok: false, message: "Cotação não encontrada." };

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ? ORDER BY sort_order")
    .all(original.id, business.id) as ItemRow[];

  const newId = uid();
  const created = nowIso();
  const issueDate = todayIso();
  const validUntil = new Date(Date.now() + business.default_validity_days * 86400000).toISOString().slice(0, 10);

  db().exec("BEGIN IMMEDIATE");
  try {
    db()
      .prepare(
        `INSERT INTO quotations (id, business_id, customer_id, quotation_number, title, issue_date, valid_until, status,
          subtotal_cents, discount_cents, quote_discount_cents, tax_cents, total_cents, notes, terms, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        newId,
        business.id,
        original.customer_id,
        original.title ? `${original.title} (cópia)` : "Cópia de cotação",
        issueDate,
        validUntil,
        original.subtotal_cents,
        original.discount_cents,
        original.quote_discount_cents,
        original.tax_cents,
        original.total_cents,
        original.notes,
        original.terms,
        created,
        created,
      );
    const insertItem = db().prepare(
      `INSERT INTO quotation_items (id, quotation_id, business_id, catalog_item_id, description, quantity_milli, unit,
        unit_price_cents, discount_bp, tax_rate_bp, line_total_cents, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((item) => {
      insertItem.run(
        uid(),
        newId,
        business.id,
        item.catalog_item_id,
        item.description,
        item.quantity_milli,
        item.unit,
        item.unit_price_cents,
        item.discount_bp,
        item.tax_rate_bp,
        item.line_total_cents,
        item.sort_order,
      );
    });
    db().exec("COMMIT");
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }

  revalidatePath("/cotacoes");
  return { ok: true, message: "Cotação duplicada como rascunho.", data: { id: newId } };
}

export async function createShareLinkAction(id: string): Promise<ActionResult<{ token: string }>> {
  const { business } = await requireBusiness();
  const quotation = await loadQuotation(id, business.id);
  if (!quotation) return { ok: false, message: "Cotação não encontrada." };
  if (!quotation.quotation_number) return { ok: false, message: "Emita a cotação antes de partilhar." };

  revokeShareTokens(id, business.id);
  const token = createShareToken(id, business.id, 30);
  revalidatePath(`/cotacoes/${id}`);
  return { ok: true, message: "Novo link de partilha criado. O anterior foi revogado.", data: { token } };
}

export async function revokeShareLinkAction(id: string): Promise<ActionResult> {
  const { business } = await requireBusiness();
  revokeShareTokens(id, business.id);
  revalidatePath(`/cotacoes/${id}`);
  return { ok: true, message: "Link de partilha revogado." };
}
