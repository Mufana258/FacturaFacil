import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4">
      <div className="card card-pad max-w-[420px] text-center">
        <p className="font-mono text-[12px] text-[var(--muted)]">404</p>
        <h1 className="mt-1 font-heading text-[22px] text-[var(--navy)]">Página não encontrada</h1>
        <p className="mt-1 text-[13px] muted">
          O endereço pode estar errado ou o registo já não existe. Registos de outros negócios nunca são expostos.
        </p>
        <Link href="/painel" className="btn btn-primary mt-5">
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
