import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import type { CustomerRow } from "@/lib/quotations";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; arquivados?: string }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const showArchived = params.arquivados === "1";

  const rows = db()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id) AS quotations_count
       FROM customers c
       WHERE c.business_id = ?
         AND ${showArchived ? "c.archived_at IS NOT NULL" : "c.archived_at IS NULL"}
         AND (? = '' OR c.name LIKE ? OR COALESCE(c.company_name, '') LIKE ? OR COALESCE(c.phone, '') LIKE ?)
       ORDER BY c.name COLLATE NOCASE ASC`,
    )
    .all(business.id, q, `%${q}%`, `%${q}%`, `%${q}%`) as (CustomerRow & { quotations_count: number })[];

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Guarde os dados dos seus clientes para emitir cotações mais rápido."
        actions={
          <Link href="/clientes/novo" className="btn btn-primary">
            <Plus size={15} /> Adicionar Cliente
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative flex-1 min-w-[220px] max-w-md" action="/clientes">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Pesquisar por nome, empresa ou telefone"
            className="input !pl-9"
          />
        </form>
        <Link
          href={showArchived ? "/clientes" : "/clientes?arquivados=1"}
          className={`btn ${showArchived ? "btn-primary" : "btn-ghost"}`}
        >
          {showArchived ? "Ver ativos" : "Ver arquivados"}
        </Link>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Users size={26} />}
            title={showArchived ? "Sem clientes arquivados" : "Ainda não tem clientes"}
            description={
              showArchived
                ? "Os clientes arquivados mantêm o histórico de cotações."
                : "Adicione o primeiro cliente para começar a criar cotações."
            }
            action={
              !showArchived ? (
                <Link href="/clientes/novo" className="btn btn-accent">
                  Adicionar cliente
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Cidade</th>
                  <th className="text-right">Cotações</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/clientes/${row.id}`} className="font-medium hover:text-[var(--navy)]">
                        {row.name}
                      </Link>
                      {row.company_name ? <p className="text-[12px] muted">{row.company_name}</p> : null}
                    </td>
                    <td className="muted">
                      {row.phone ?? row.whatsapp ?? "—"}
                      {row.email ? <p className="text-[12px]">{row.email}</p> : null}
                    </td>
                    <td className="muted">{row.city ?? "—"}</td>
                    <td className="text-right">{row.quotations_count}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/clientes/${row.id}`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                        <Link href={`/clientes/${row.id}/editar`} className="btn btn-ghost btn-sm">
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
