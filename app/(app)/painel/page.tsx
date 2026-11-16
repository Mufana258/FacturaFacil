import Link from "next/link";
import { ArrowRight, FilePlus2, Package, UserPlus, Users } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db, todayIso } from "@/lib/db";
import { effectiveStatus, type QuotationRow } from "@/lib/quotations";
import { formatDate, formatMoney } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const { user, business } = await requireBusiness();
  const database = db();

  const monthPrefix = todayIso().slice(0, 7);

  const total = database
    .prepare("SELECT COUNT(*) AS n FROM quotations WHERE business_id = ? AND archived_at IS NULL")
    .get(business.id) as { n: number };
  const monthRows = database
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS value FROM quotations
       WHERE business_id = ? AND archived_at IS NULL AND substr(created_at, 1, 7) = ?`,
    )
    .get(business.id, monthPrefix) as { n: number; value: number };
  const accepted = database
    .prepare(
      "SELECT COUNT(*) AS n FROM quotations WHERE business_id = ? AND archived_at IS NULL AND status = 'aceite'",
    )
    .get(business.id) as { n: number };
  const pendingRows = database
    .prepare(
      `SELECT COUNT(*) AS n FROM quotations
       WHERE business_id = ? AND archived_at IS NULL AND status = 'enviada' AND valid_until >= ?`,
    )
    .get(business.id, todayIso()) as { n: number };

  const recent = database
    .prepare(
      `SELECT q.*, c.name AS customer_name FROM quotations q
       JOIN customers c ON c.id = q.customer_id
       WHERE q.business_id = ? AND q.archived_at IS NULL
       ORDER BY q.created_at DESC LIMIT 6`,
    )
    .all(business.id) as (QuotationRow & { customer_name: string })[];

  const firstName = (user.full_name ?? "").trim().split(" ")[0] || "bem-vindo";

  return (
    <div>
      <PageHeader
        title={`Olá, ${firstName}`}
        subtitle={`Resumo de ${business.name} · ${formatDate(todayIso())}`}
        actions={
          <Link href="/cotacoes/nova" className="btn btn-primary">
            <FilePlus2 size={15} /> Nova Cotação
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Cotações totais" value={String(total.n)} />
        <StatCard label="Este mês" value={String(monthRows.n)} hint="Criadas no mês corrente" />
        <StatCard label="Valor cotado no mês" value={formatMoney(monthRows.value)} hint="MT" accent />
        <StatCard label="Aceites" value={String(accepted.n)} />
        <StatCard label="Pendentes" value={String(pendingRows.n)} hint="Enviadas e válidas" />
      </div>

      <section className="mt-6">
        <h2 className="mb-2.5 text-[13.5px] font-semibold text-[#334155]">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link href="/cotacoes/nova" className="card card-pad flex items-center gap-3 !py-3.5 hover:border-[var(--navy)]/30">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--navy-soft)] text-[var(--navy)]">
              <FilePlus2 size={17} />
            </span>
            <span className="text-[13px] font-semibold">Nova Cotação</span>
          </Link>
          <Link href="/clientes/novo" className="card card-pad flex items-center gap-3 !py-3.5 hover:border-[var(--navy)]/30">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#ecfdf5] text-[var(--emerald-dark)]">
              <UserPlus size={17} />
            </span>
            <span className="text-[13px] font-semibold">Adicionar Cliente</span>
          </Link>
          <Link href="/catalogo/novo" className="card card-pad flex items-center gap-3 !py-3.5 hover:border-[var(--navy)]/30">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fffbeb] text-[#b45309]">
              <Package size={17} />
            </span>
            <span className="text-[13px] font-semibold">Adicionar Serviço</span>
          </Link>
          <Link href="/cotacoes" className="card card-pad flex items-center gap-3 !py-3.5 hover:border-[var(--navy)]/30">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f5f9] text-[#475569]">
              <Users size={17} />
            </span>
            <span className="text-[13px] font-semibold">Ver Todas as Cotações</span>
          </Link>
        </div>
      </section>

      <section className="mt-6 card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <h2 className="text-[13.5px] font-semibold text-[#334155]">Cotações recentes</h2>
          <Link href="/cotacoes" className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--navy)]">
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<FilePlus2 size={26} />}
            title="Ainda não há cotações"
            description="Crie a sua primeira cotação e partilhe-a com o cliente em minutos."
            action={
              <Link href="/cotacoes/nova" className="btn btn-accent">
                Criar primeira cotação
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-[12.5px] font-medium">
                      {row.quotation_number ?? <span className="muted">Rascunho</span>}
                    </td>
                    <td className="font-medium">{row.customer_name}</td>
                    <td className="muted">{formatDate(row.issue_date)}</td>
                    <td className="text-right font-semibold">{formatMoney(row.total_cents)}</td>
                    <td>
                      <StatusBadge status={effectiveStatus(row)} />
                    </td>
                    <td className="text-right">
                      <Link href={`/cotacoes/${row.id}`} className="btn btn-ghost btn-sm">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
