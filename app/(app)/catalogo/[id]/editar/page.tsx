import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CatalogRow } from "@/lib/quotations";
import { formatMoney } from "@/lib/money";
import { CatalogForm } from "@/components/catalog-form";
import { PageHeader } from "@/components/ui";

export default async function EditCatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const item = db()
    .prepare("SELECT * FROM catalog_items WHERE id = ? AND business_id = ?")
    .get(id, business.id) as CatalogRow | undefined;
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]">
        <ArrowLeft size={14} /> Produtos e Serviços
      </Link>
      <PageHeader title="Editar item" subtitle="Cotações já emitidas mantêm os preços originais." />
      <div className="card card-pad sm:p-6">
        <CatalogForm
          mode="edit"
          itemId={item.id}
          defaults={{
            name: item.name,
            description: item.description ?? "",
            type: item.type,
            unit: item.unit,
            price: formatMoney(item.price_cents),
            category: item.category ?? "",
          }}
        />
      </div>
    </div>
  );
}
