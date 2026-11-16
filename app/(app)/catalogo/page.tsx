import Link from "next/link";
import { Package, Plus, Search } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CatalogRow } from "@/lib/quotations";
import { formatMoney } from "@/lib/money";
import { EmptyState, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { toggleCatalogItemAction } from "@/app/actions/catalog";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; arquivados?: string }>;
}) {
  const { business } = await requireBusiness();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const showInactive = params.arquivados === "1";

  const rows = db()
    .prepare(
      `SELECT * FROM catalog_items
       WHERE business_id = ? AND is_active = ?
         AND (? = '' OR name LIKE ? OR COALESCE(description, '') LIKE ? OR COALESCE(category, '') LIKE ?)
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all(business.id, showInactive ? 0 : 1, q, `%${q}%`, `%${q}%`, `%${q}%`) as CatalogRow[];

  return (
    <div>
      <PageHeader
        title="Produtos e Serviços"
        subtitle="Catálogo reutilizável para acelerar a criação de cotações."
        actions={
          <Link href="/catalogo/novo" className="btn btn-primary">
            <Plus size={15} /> Adicionar
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative flex-1 min-w-[220px] max-w-md" action="/catalogo">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input name="q" defaultValue={q} placeholder="Pesquisar item ou categoria" className="input !pl-9" />
        </form>
        <Link
          href={showInactive ? "/catalogo" : "/catalogo?arquivados=1"}
          className={`btn ${showInactive ? "btn-primary" : "btn-ghost"}`}
        >
          {showInactive ? "Ver ativos" : "Ver arquivados"}
        </Link>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Package size={26} />}
            title={showInactive ? "Sem itens arquivados" : "O catálogo está vazio"}
            description={
              showInactive
                ? "Itens arquivados não aparecem ao criar cotações."
                : "Guarde os seus produtos e serviços para os reutilizar nas cotações."
            }
            action={
              !showInactive ? (
                <Link href="/catalogo/novo" className="btn btn-accent">
                  Adicionar primeiro item
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th className="text-right">Preço</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-medium">{row.name}</p>
                      {row.description ? <p className="max-w-md truncate text-[12px] muted">{row.description}</p> : null}
                      {row.category ? <span className="badge badge-rascunho mt-1">{row.category}</span> : null}
                    </td>
                    <td className="muted capitalize">{row.type}</td>
                    <td className="muted">{row.unit}</td>
                    <td className="text-right font-semibold">{formatMoney(row.price_cents)} MT</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/catalogo/${row.id}/editar`} className="btn btn-ghost btn-sm">
                          Editar
                        </Link>
                        <ActionButton
                          action={toggleCatalogItemAction.bind(null, row.id, row.is_active === 0)}
                          className={row.is_active ? "btn btn-danger btn-sm" : "btn btn-ghost btn-sm"}
                          confirmMessage={row.is_active ? "Arquivar este item do catálogo?" : undefined}
                        >
                          {row.is_active ? "Arquivar" : "Reativar"}
                        </ActionButton>
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
