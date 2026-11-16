import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { addDaysIso, db, todayIso } from "@/lib/db";
import { formatPercentFromBp } from "@/lib/money";
import type { CatalogRow, CustomerRow } from "@/lib/quotations";
import { QuotationBuilder } from "@/components/quotation-builder";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;

  const customers = (
    db()
      .prepare(
        "SELECT id, name, company_name FROM customers WHERE business_id = ? AND archived_at IS NULL ORDER BY name COLLATE NOCASE",
      )
      .all(business.id) as { id: string; name: string; company_name: string | null }[]
  ).map(({ id, name, company_name }) => ({ id, name, company_name }));

  const catalog = db()
    .prepare(
      "SELECT * FROM catalog_items WHERE business_id = ? AND is_active = 1 ORDER BY name COLLATE NOCASE",
    )
    .all(business.id) as CatalogRow[];

  const today = todayIso();
  const preselected = params.cliente && customers.some((c) => c.id === params.cliente) ? params.cliente : "";

  return (
    <div>
      <Link
        href="/cotacoes"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]"
      >
        <ArrowLeft size={14} /> Cotações
      </Link>

      <div className="mb-5">
        <h1 className="font-heading text-[24px] text-[var(--navy)]">Nova cotação</h1>
        <p className="mt-1 text-[13px] muted">
          O número é atribuído ao emitir. Guarde como rascunho enquanto prepara os detalhes.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="toast toast-error mb-4">
          Ainda não tem clientes. Use o botão + ao lado do campo Cliente para criar um sem sair desta página.
        </div>
      ) : null}

      <QuotationBuilder
        mode="create"
        customers={customers}
        catalog={catalog.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          priceCents: item.price_cents,
        }))}
        taxPercent={formatPercentFromBp(business.default_tax_bp)}
        today={today}
        defaultValidUntil={addDaysIso(today, business.default_validity_days)}
        initial={undefined}
        initialCustomerId={preselected}
      />
    </div>
  );
}
