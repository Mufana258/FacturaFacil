import { redirect } from "next/navigation";
import { getBusinessForUser, requireUser } from "@/lib/auth";
import { OnboardingForm } from "@/components/business-forms";

export default async function OnboardingPage() {
  const user = await requireUser();
  const business = await getBusinessForUser(user.id);
  if (business) redirect("/painel");

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="font-heading text-[19px] text-[var(--navy)]">FacturaFácil</span>
      </div>
      <div className="card card-pad sm:p-7">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--emerald-dark)]">
          Passo 1 de 1
        </p>
        <h1 className="mt-1 font-heading text-[25px] text-[var(--navy)]">Configure o seu negócio</h1>
        <p className="mt-1 mb-6 text-[13px] muted">
          Estes dados aparecem no cabeçalho das suas cotações e PDFs. Pode alterar mais tarde.
        </p>
        <OnboardingForm defaultEmail={user.email} />
      </div>
    </div>
  );
}
