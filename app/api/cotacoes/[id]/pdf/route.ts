import { getBusinessForUser, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveStatus, type CustomerRow, type ItemRow, type QuotationRow } from "@/lib/quotations";
import { documentForQuotation, logoDataUri } from "@/lib/document";
import { STATUS_TEXT, renderQuotePdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return new Response("Negócio não configurado", { status: 403 });

  const { id } = await context.params;
  const quotation = db()
    .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?")
    .get(id, business.id) as QuotationRow | undefined;
  if (!quotation) return new Response("Cotação não encontrada", { status: 404 });

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(quotation.customer_id, business.id) as CustomerRow | undefined;
  if (!customer) return new Response("Cliente não encontrado", { status: 404 });

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ? ORDER BY sort_order")
    .all(quotation.id, business.id) as ItemRow[];

  const document = documentForQuotation(business, customer, quotation, items);
  const label = STATUS_TEXT[effectiveStatus(quotation)] ?? "";

  const pdf = await renderQuotePdf({ data: document, logo: logoDataUri(business.logo_path), statusLabel: label });

  const filename = `Cotacao-${quotation.quotation_number ?? "rascunho"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
