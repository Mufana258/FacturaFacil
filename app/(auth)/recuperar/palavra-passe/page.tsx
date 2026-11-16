import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";

export default function ResetPasswordPage() {
  return (
    <div className="card card-pad sm:p-7">
      <h2 className="font-heading text-[23px] text-[var(--navy)]">Definir nova palavra-passe</h2>
      <p className="mt-1 mb-5 text-[13px] muted">Depois de guardar, todas as sessões antigas são encerradas.</p>
      <Suspense fallback={<p className="text-[13px] muted">A carregar…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-5 text-center text-[12.5px] muted">
        <Link href="/entrar" className="font-semibold text-[var(--navy)] underline-offset-2 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}
