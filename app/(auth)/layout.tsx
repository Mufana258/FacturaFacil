import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[var(--navy)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-28 -top-24 h-80 w-80 rounded-full bg-[var(--emerald)]/15 blur-3xl" />
        <Link href="/" className="relative flex items-center">
          <span className="font-heading text-[24px]">FacturaFácil</span>
        </Link>

        <div className="relative max-w-md">
          <h1 className="font-heading text-[34px] leading-[1.15]">
            Cotações profissionais, prontas em minutos.
          </h1>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/70">
            Crie orçamentos para os seus clientes, gere PDFs e partilhe no WhatsApp. Feito para pequenos
            negócios em Moçambique.
          </p>
          <ul className="mt-8 space-y-3 text-[13.5px] text-white/80">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" /> Cotações numeradas por empresa
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" /> Totais em Meticais com IVA configurável
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" /> PDF A4 e link seguro para o cliente
            </li>
          </ul>
        </div>

        <p className="relative text-[11.5px] text-white/40">
          Versão 1 gera cotações comerciais. Não substitui documentos fiscais.
        </p>
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
          <span className="font-heading text-[24px] text-[var(--navy)]">FacturaFácil</span>
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
