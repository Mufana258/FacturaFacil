import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activeShareToken,
  effectiveStatus,
  normalizeWhatsApp,
  type CustomerRow,
  type ItemRow,
  type QuotationRow,
} from "@/lib/quotations";
import { documentForQuotation } from "@/lib/document";
import { PageHeader, StatusBadge } from "@/components/ui";
import { QuotationDocument } from "@/components/quotation-document";
import { SharePanel } from "@/components/share-panel";
import { StatusControl } from "@/components/status-control";
import { ActionButton } from "@/components/action-button";
import { DuplicateButton } from "@/components/duplicate-button";
import { archiveQuotationAction } from "@/app/actions/quotations";
import { formatDate, formatMoney } from "@/lib/money";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const quotation = db()
    .prepare("SELECT * FROM quotations WHERE id = ? AND business_id = ?")
    .get(id, business.id) as QuotationRow | undefined;
  if (!quotation) notFound();

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(quotation.customer_id, business.id) as CustomerRow;
  if (!customer) notFound();

  const items = db()
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? AND business_id = ? ORDER BY sort_order")
    .all(id, business.id) as ItemRow[];

  const status = effectiveStatus(quotation);
  const isDraft = quotation.quotation_number === null;
  const token = isDraft ? undefined : activeShareToken(id, business.id);
  const document = documentForQuotation(business, customer, quotation, items);

  return (
    <div>
      <Link
        href="/cotacoes"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]"
      >
        <ArrowLeft size={14} /> Cotações
      </Link>

      <PageHeader
        title={quotation.quotation_number ?? "Rascunho"}
        subtitle={`${customer.name} · ${formatMoney(quotation.total_cents)} MT`}
        actions={
          <>
            <StatusBadge status={status} />
            {isDraft ? (
              <Link href={`/cotacoes/${id}/editar`} className="btn btn-primary">
                <Pencil size={14} /> Editar rascunho
              </Link>
            ) : null}
            <a href={`/api/cotacoes/${id}/pdf`} className="btn btn-ghost" target="_blank" rel="noreferrer">
              <Download size={14} /> Descarregar PDF
            </a>
          </>
        }
      />

      {quotation.archived_at ? (
        <div className="toast toast-error mb-4">Esta cotação está arquivada desde {formatDate(quotation.archived_at)}.</div>
      ) : null}

      {!isDraft ? (
        <div className="toast toast-ok mb-4">
          Cotação emitida em {formatDate(quotation.issued_at?.slice(0, 10) ?? null)}. Os dados do documento estão
          congelados e não mudam com alterações futuras de preços ou dados do cliente.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <QuotationDocument data={document} badge={status} />

        <div className="space-y-4">
          <div className="card card-pad space-y-4">
            <StatusControl quotationId={id} status={quotation.status} isDraft={isDraft} />
            <div className="divider" />
            <DuplicateButton quotationId={id} />
            <ActionButton
              action={archiveQuotationAction.bind(null, id, !quotation.archived_at)}
              className={quotation.archived_at ? "btn btn-ghost w-full" : "btn btn-danger w-full"}
              confirmMessage={quotation.archived_at ? undefined : "Arquivar esta cotação?"}
            >
              {quotation.archived_at ? "Restaurar cotação" : "Arquivar cotação"}
            </ActionButton>
            <p className="text-[11px] muted">
              Arquivar retira a cotação das listas, sem alterar o documento nem o histórico.
            </p>
          </div>

          {isDraft ? (
            <div className="card card-pad text-[12.5px] muted">
              Emita a cotação para obter o número definitivo e o link de partilha para o cliente.
            </div>
          ) : (
            <SharePanel
              quotationId={id}
              businessName={business.name}
              reference={quotation.quotation_number!}
              totalCents={quotation.total_cents}
              whatsapp={normalizeWhatsApp(customer.whatsapp ?? customer.phone)}
              initialToken={token?.token ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
