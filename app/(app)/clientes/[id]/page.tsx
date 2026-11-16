import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus2, Mail, MapPin, Phone, StickyNote } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import { effectiveStatus, type CustomerRow, type QuotationRow } from "@/lib/quotations";
import { formatDate, formatMoney } from "@/lib/money";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { archiveCustomerAction, restoreCustomerAction } from "@/app/actions/customers";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(id, business.id) as CustomerRow | undefined;
  if (!customer) notFound();

  const quotations = db()
    .prepare(
      `SELECT * FROM quotations WHERE business_id = ? AND customer_id = ? AND archived_at IS NULL
       ORDER BY created_at DESC`,
    )
    .all(business.id, id) as QuotationRow[];

  const totalValue = quotations.reduce((sum, q) => sum + q.total_cents, 0);

  return (
    <div>
      <Link href="/clientes" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]">
        <ArrowLeft size={14} /> Clientes
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={customer.company_name ?? undefined}
        actions={
          <>
            <Link href={`/cotacoes/nova?cliente=${customer.id}`} className="btn btn-primary">
              <FilePlus2 size={15} /> Nova Cotação
            </Link>
            <Link href={`/clientes/${customer.id}/editar`} className="btn btn-ghost">
              Editar
            </Link>
            {customer.archived_at ? (
              <ActionButton action={restoreCustomerAction.bind(null, customer.id)} className="btn btn-ghost">
                Reativar
              </ActionButton>
            ) : (
              <ActionButton
                action={archiveCustomerAction.bind(null, customer.id)}
                className="btn btn-danger"
                confirmMessage="Arquivar este cliente? As cotações existentes mantêm-se."
              >
                Arquivar
              </ActionButton>
            )}
          </>
        }
      />

      {customer.archived_at ? (
        <div className="toast toast-error mb-4">Este cliente está arquivado desde {formatDate(customer.archived_at)}.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card card-pad space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] muted">Dados do cliente</h2>
          <InfoLine icon={<Phone size={14} />} label="Telefone" value={customer.phone} />
          <InfoLine icon={<Phone size={14} />} label="WhatsApp" value={customer.whatsapp} />
          <InfoLine icon={<Mail size={14} />} label="Email" value={customer.email} />
          <InfoLine icon={<MapPin size={14} />} label="Endereço" value={[customer.address, customer.city].filter(Boolean).join(", ") || null} />
          <InfoLine label="NUIT" value={customer.nuit} />
          {customer.notes ? (
            <div className="flex gap-2 border-t border-[var(--line)] pt-3 text-[12.5px]">
              <StickyNote size={14} className="mt-0.5 shrink-0 text-[var(--muted)]" />
              <p className="whitespace-pre-line">{customer.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
            <h2 className="text-[13.5px] font-semibold text-[#334155]">Histórico de cotações</h2>
            <span className="text-[12px] muted">
              {quotations.length} cotações · {formatMoney(totalValue)} MT
            </span>
          </div>
          {quotations.length === 0 ? (
            <EmptyState
              title="Sem cotações"
              description="Crie a primeira cotação para este cliente."
              action={
                <Link href={`/cotacoes/nova?cliente=${customer.id}`} className="btn btn-accent">
                  Criar cotação
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Data</th>
                    <th className="text-right">Total</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td className="font-mono text-[12.5px]">{quotation.quotation_number ?? "Rascunho"}</td>
                      <td className="muted">{formatDate(quotation.issue_date)}</td>
                      <td className="text-right font-semibold">{formatMoney(quotation.total_cents)}</td>
                      <td>
                        <StatusBadge status={effectiveStatus(quotation)} />
                      </td>
                      <td className="text-right">
                        <Link href={`/cotacoes/${quotation.id}`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex gap-2 text-[13px]">
      {icon ? <span className="mt-0.5 text-[var(--muted)]">{icon}</span> : null}
      <div>
        <p className="text-[11px] uppercase tracking-wide muted">{label}</p>
        <p className={value ? "" : "muted"}>{value ?? "—"}</p>
      </div>
    </div>
  );
}
