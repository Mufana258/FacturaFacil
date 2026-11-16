import { requireBusiness } from "@/lib/auth";
import { formatPercentFromBp } from "@/lib/money";
import { logoUrlFor } from "@/lib/document";
import { PageHeader } from "@/components/ui";
import { BusinessProfileForm } from "@/components/business-forms";
import { DefaultsForm, LogoUploader, PasswordForm } from "@/components/settings-forms";

export default async function SettingsPage() {
  const { user, business } = await requireBusiness();

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHeader title="Definições" subtitle="Perfil do negócio, predefinições das cotações e conta." />

      <div className="space-y-4">
        <section className="card card-pad sm:p-6">
          <h2 className="mb-1 font-heading text-[18px] text-[var(--navy)]">Perfil do negócio</h2>
          <p className="mb-4 text-[12.5px] muted">Estes dados aparecem no cabeçalho das cotações e dos PDFs.</p>
          <BusinessProfileForm
            defaults={{
              name: business.name,
              nuit: business.nuit ?? "",
              email: business.email ?? "",
              phone: business.phone ?? "",
              whatsapp: business.whatsapp ?? "",
              address: business.address ?? "",
              city: business.city ?? "",
              province: business.province ?? "",
              website: business.website ?? "",
            }}
          />
        </section>

        <section className="card card-pad sm:p-6">
          <h2 className="mb-1 font-heading text-[18px] text-[var(--navy)]">Logótipo</h2>
          <p className="mb-4 text-[12.5px] muted">Usado nas cotações, no PDF e no link público.</p>
          <LogoUploader logoUrl={logoUrlFor(business.logo_path)} />
        </section>

        <section className="card card-pad sm:p-6">
          <h2 className="mb-1 font-heading text-[18px] text-[var(--navy)]">Predefinições das cotações</h2>
          <p className="mb-4 text-[12.5px] muted">
            Aplicadas automaticamente a cada nova cotação. Cada linha pode ter a sua própria taxa de IVA.
          </p>
          <DefaultsForm
            defaults={{
              defaultValidityDays: business.default_validity_days,
              defaultTaxPercent: formatPercentFromBp(business.default_tax_bp),
              defaultNotes: business.default_notes ?? "",
              defaultTerms: business.default_terms ?? "",
            }}
          />
        </section>

        <section className="card card-pad sm:p-6">
          <h2 className="mb-1 font-heading text-[18px] text-[var(--navy)]">Conta</h2>
          <p className="mb-4 text-[12.5px] muted">Sessão iniciada como {user.email}.</p>
          <PasswordForm />
        </section>

        <section className="card card-pad text-[12px] muted sm:p-6">
          Moeda: MZN · País: Moçambique. A versão 1 emite cotações comerciais, não documentos fiscais.
        </section>
      </div>
    </div>
  );
}
