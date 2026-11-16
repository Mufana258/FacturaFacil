import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CustomerRow } from "@/lib/quotations";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/ui";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const customer = db()
    .prepare("SELECT * FROM customers WHERE id = ? AND business_id = ?")
    .get(id, business.id) as CustomerRow | undefined;
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href={`/clientes/${customer.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium muted hover:text-[var(--navy)]"
      >
        <ArrowLeft size={14} /> {customer.name}
      </Link>
      <PageHeader title="Editar cliente" subtitle="As alterações não alteram cotações já emitidas." />
      <div className="card card-pad sm:p-6">
        <CustomerForm
          mode="edit"
          customerId={customer.id}
          defaults={{
            name: customer.name,
            companyName: customer.company_name ?? "",
            nuit: customer.nuit ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            whatsapp: customer.whatsapp ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            notes: customer.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
