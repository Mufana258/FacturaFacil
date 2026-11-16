import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db, todayIso } from "@/lib/db";
import { effectiveStatus, type QuotationRow } from "@/lib/quotations";
import { formatDate, formatMoney } from "@/lib/money";
import { STATUSES, STATUS_LABEL } from "@/lib/schemas";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const PAGE_SIZE = 10;

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const estado = params.estado ?? "";
  const cliente = params.cliente ?? "";
  const de = params.de ?? "";
  const ate = params.ate ?? "";
  const ordem = params.ordem ?? "recentes";
  const page = Math.max(1, Number(params.pagina ?? "1") || 1);
  const archived = params.arquivados === "1";
  const today = todayIso();

  const where: string[] = ["q.business_id = ?"];
  const args: (string | number)[] = [business.id];
  where.push(archived ? "q.archived_at IS NOT NULL" : "q.archived_at IS NULL");

  if (q) {
    where.push("(COALESCE(q.quotation_number, '') LIKE ? OR COALESCE(q.title, '') LIKE ? OR c.name LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (cliente) {
    where.push("q.customer_id = ?");
    args.push(cliente);
  }
  if (de) {
    where.push("q.issue_date >= ?");
    args.push(de);
  }
  if (ate) {
    where.push("q.issue_date <= ?");
    args.push(ate);
  }
  if (estado === "expirada") {
    where.push("(q.status = 'expirada' OR (q.status = 'enviada' AND q.valid_until < ?))");
    args.push(today);
  } else if (estado === "enviada") {
    where.push("q.status = 'enviada' AND q.valid_until >= ?");
    args.push(today);
  } else if (estado && STATUSES.includes(estado as never)) {
    where.push("q.status = ? AND NOT (q.status = 'enviada' AND q.valid_until < ?)");
    args.push(estado, today);
  }

  const orderBy =
    ordem === "valor" ? "q.total_cents DESC" : ordem === "antigas" ? "q.created_at ASC" : "q.created_at DESC";
  const whereSql = where.join(" AND ");

  const totalRows = db()
    .prepare(`SELECT COUNT(*) AS n FROM quotations q JOIN customers c ON c.id = q.customer_id WHERE ${whereSql}`)
    .get(...args) as { n: number };
  const pages = Math.max(1, Math.ceil(totalRows.n / PAGE_SIZE));
  const currentPage = Math.min(page, pages);

  const rows = db()
    .prepare(
      `SELECT q.*, c.name AS customer_name FROM quotations q
       JOIN customers c ON c.id = q.customer_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
    )
    .all(...args, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE) as (QuotationRow & { customer_name: string })[];

  const customers = db()
    .prepare("SELECT id, name FROM customers WHERE business_id = ? ORDER BY name COLLATE NOCASE")
    .all(business.id) as { id: string; name: string }[];

  const queryString = (overrides: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { q, estado, cliente, de, ate, ordem, arquivados: archived ? "1" : "", ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    const text = search.toString();
    return text ? `/cotacoes?${text}` : "/cotacoes";
  };

  return (
    <div>
      <PageHeader
        title="Cotações"
        subtitle="Histórico completo com filtros, estados e partilha."
        actions={
          <Link href="/cotacoes/nova" className="btn btn-primary">
            <Plus size={15} /> Nova Cotação
          </Link>
        }
      />

      <form className="card card-pad mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6" action="/cotacoes">
        <div className="relative lg:col-span-2">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input name="q" defaultValue={q} placeholder="Número, título ou cliente" className="input !pl-9" />
        </div>
        <select name="estado" defaultValue={estado} className="select" aria-label="Estado">
          <option value="">Todos os estados</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <select name="cliente" defaultValue={cliente} className="select" aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <input type="date" name="de" defaultValue={de} className="input" aria-label="Data inicial" />
        <div className="flex gap-2">
          <input type="date" name="ate" defaultValue={ate} className="input" aria-label="Data final" />
          <button className="btn btn-primary" type="submit">
            Filtrar
          </button>
        </div>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
        <div className="flex items-center gap-2">
          <span className="muted">{totalRows.n} cotações</span>
          <Link href={queryString({ ordem: "recentes", pagina: undefined })} className={ordem === "recentes" ? "font-semibold text-[var(--navy)]" : "muted"}>
            Recentes
          </Link>
          <Link href={queryString({ ordem: "valor", pagina: undefined })} className={ordem === "valor" ? "font-semibold text-[var(--navy)]" : "muted"}>
            Maior valor
          </Link>
          <Link href={queryString({ ordem: "antigas", pagina: undefined })} className={ordem === "antigas" ? "font-semibold text-[var(--navy)]" : "muted"}>
            Antigas
          </Link>
        </div>
        <Link
          href={queryString({ arquivados: archived ? undefined : "1", pagina: undefined })}
          className="font-medium text-[var(--navy)] hover:underline"
        >
          {archived ? "Ver ativas" : "Ver arquivadas"}
        </Link>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} />}
            title={archived ? "Sem cotações arquivadas" : "Nenhuma cotação encontrada"}
            description={archived ? undefined : "Ajuste os filtros ou crie uma nova cotação."}
            action={
              !archived ? (
                <Link href="/cotacoes/nova" className="btn btn-accent">
                  Nova cotação
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Emissão</th>
                  <th>Validade</th>
                  <th className="text-right">Total</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/cotacoes/${row.id}`} className="font-mono text-[12.5px] font-medium hover:text-[var(--navy)]">
                        {row.quotation_number ?? <span className="muted">Rascunho</span>}
                      </Link>
                      {row.title ? <p className="max-w-[220px] truncate text-[12px] muted">{row.title}</p> : null}
                    </td>
                    <td>{row.customer_name}</td>
                    <td className="muted">{formatDate(row.issue_date)}</td>
                    <td className="muted">{formatDate(row.valid_until)}</td>
                    <td className="text-right font-semibold">{formatMoney(row.total_cents)}</td>
                    <td>
                      <StatusBadge status={effectiveStatus(row)} />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/cotacoes/${row.id}`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                        <a
                          href={`/api/cotacoes/${row.id}/pdf`}
                          className="btn btn-ghost btn-sm"
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 text-[12.5px]">
            <span className="muted">
              Página {currentPage} de {pages}
            </span>
            <div className="flex gap-2">
              <Link
                href={queryString({ pagina: String(Math.max(1, currentPage - 1)) })}
                className={`btn btn-ghost btn-sm ${currentPage === 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                Anterior
              </Link>
              <Link
                href={queryString({ pagina: String(Math.min(pages, currentPage + 1)) })}
                className={`btn btn-ghost btn-sm ${currentPage === pages ? "pointer-events-none opacity-40" : ""}`}
              >
                Seguinte
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
