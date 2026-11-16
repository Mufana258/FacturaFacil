import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/auth-forms";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/painel");
  return (
    <div className="card card-pad sm:p-7">
      <h2 className="font-heading text-[23px] text-[var(--navy)]">Criar conta</h2>
      <p className="mt-1 mb-5 text-[13px] muted">Depois de criar a conta, configura o seu negócio.</p>
      <RegisterForm />
      <p className="mt-5 text-center text-[12.5px] muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-[var(--navy)] underline-offset-2 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
