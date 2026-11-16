import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { CatalogForm } from "@/components/catalog-form";
import { PageHeader } from "@/components/ui";

export default async function NewCatalogItemPage() {
  await requireBusiness();
  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/catalogo" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]">
        <ArrowLeft size={14} /> Produtos e Serviços
      </Link>
      <PageHeader title="Novo item" subtitle="Produtos e serviços guardados aqui ficam disponíveis nas cotações." />
      <div className="card card-pad sm:p-6">
        <CatalogForm mode="create" />
      </div>
    </div>
  );
}
