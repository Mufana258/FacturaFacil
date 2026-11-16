import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/ui";

export default async function NewCustomerPage() {
  await requireBusiness();
  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/clientes" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]">
        <ArrowLeft size={14} /> Clientes
      </Link>
      <PageHeader title="Novo cliente" subtitle="Apenas o nome é obrigatório." />
      <div className="card card-pad sm:p-6">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
