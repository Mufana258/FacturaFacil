import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db, todayIso } from "@/lib/db";
import { formatMoney, formatPercentFromBp, formatQuantity } from "@/lib/money";
import type { CatalogRow, CustomerRow, ItemRow, QuotationRow } from "@/lib/quotations";
import { QuotationBuilder } from "@/components/quotation-builder";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const quotation = db()
    .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?")
    .get(id, business.id) as QuotationRow | undefined;
  if (!quotation) notFound();
  if (quotation.quotation_number !== null || quotation.status !== "rascunho") {
    redirect(`/cotacoes/${id}`);
  }

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ? ORDER BY sort_order")
    .all(id, business.id) as ItemRow[];

  const customers = (
    db()
      .prepare(
        "SELECT id, name, company_name FROM customers WHERE business_id = ? AND archived_at IS NULL ORDER BY name COLLATE NOCASE",
      )
      .all(business.id) as { id: string; name: string; company_name: string | null }[]
  ).map(({ id, name, company_name }) => ({ id, name, company_name }));

  const currentCustomer = db()
    .prepare("SELECT id, name, company_name, archived_at FROM customers WHERE id = ? AND business_id = ?")
    .get(quotation.customer_id, business.id) as (CustomerRow & { archived_at: string | null }) | undefined;

  const allCustomers =
    currentCustomer && !customers.some((c) => c.id === currentCustomer.id)
      ? [...customers, { id: currentCustomer.id, name: currentCustomer.name, company_name: currentCustomer.company_name }]
      : customers;

  const catalog = db()
    .prepare("SELECT * FROM catalog_items WHERE business_id = ? AND is_active = 1 ORDER BY name COLLATE NOCASE")
    .all(business.id) as CatalogRow[];

  const today = todayIso();

  return (
    <div>
      <Link
        href={`/cotacoes/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]"
      >
        <ArrowLeft size={14} /> {quotation.quotation_number ?? "Rascunho"}
      </Link>

      <div className="mb-5">
        <h1 className="font-heading text-[24px] text-[var(--navy)]">Editar rascunho</h1>
        <p className="mt-1 text-[13px] muted">Ao emitir, o documento é congelado e deixa de ser editável.</p>
      </div>

      <QuotationBuilder
        mode="edit"
        customers={allCustomers}
        catalog={catalog.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          priceCents: item.price_cents,
        }))}
        taxPercent={formatPercentFromBp(business.default_tax_bp)}
        today={today}
        defaultValidUntil={quotation.valid_until}
        initial={{
          id: quotation.id,
          customerId: quotation.customer_id,
          title: quotation.title ?? "",
          issueDate: quotation.issue_date,
          validUntil: quotation.valid_until,
          notes: quotation.notes ?? "",
          terms: quotation.terms ?? "",
          discount: quotation.quote_discount_cents ? formatMoney(quotation.quote_discount_cents) : "",
          lines:
            items.length > 0
              ? items.map((item) => ({
                  description: item.description,
                  quantity: formatQuantity(item.quantity_milli),
                  unit: item.unit,
                  unitPrice: formatMoney(item.unit_price_cents),
                  discountPercent: formatPercentFromBp(item.discount_bp),
                  taxPercent: formatPercentFromBp(item.tax_rate_bp),
                }))
              : undefined,
        }}
      />
    </div>
  );
}
