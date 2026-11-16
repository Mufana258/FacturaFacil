import Link from "next/link";
import { ResetRequestForm } from "@/components/auth-forms";

export default function RecoverPage() {
  return (
    <div className="card card-pad sm:p-7">
      <h2 className="font-heading text-[23px] text-[var(--navy)]">Recuperar palavra-passe</h2>
      <p className="mt-1 mb-5 text-[13px] muted">
        Indique o email da conta. O link de recuperação é válido durante 1 hora.
      </p>
      <ResetRequestForm />
      <p className="mt-5 text-center text-[12.5px] muted">
        <Link href="/entrar" className="font-semibold text-[var(--navy)] underline-offset-2 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}
