import { Download, ShieldAlert } from "lucide-react";
import { resolveShareToken } from "@/lib/share";
import { documentForQuotation } from "@/lib/document";
import { effectiveStatus } from "@/lib/quotations";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { QuotationDocument } from "@/components/quotation-document";
import { formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function SharedQuotationPage({ params }: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(await clientKey("share-page"), 240, 60 * 60 * 1000);
  if (!limit.ok) {
    return <InvalidLink title="Demasiados pedidos" description="Aguarde alguns minutos e tente novamente." />;
  }

  const { token } = await params;
  const shared = resolveShareToken(token);
  if (!shared) {
    return (
      <InvalidLink
        title="Link inválido ou expirado"
        description="Este link de cotação já não está disponível. Peça um novo link ao seu fornecedor."
      />
    );
  }

  const { quotation, business, customer, items, expiresAt } = shared;
  const document = documentForQuotation(business, customer, quotation, items);

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="bg-[var(--navy)] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-[860px] items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="font-heading text-[16px]">FacturaFácil</span>
          </span>
          <span className="text-[11px] text-white/60">Documento partilhado</span>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-3 py-5 sm:px-6 sm:py-8">
        <QuotationDocument data={document} badge={effectiveStatus(quotation)} />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a href={`/s/${token}/pdf`} target="_blank" rel="noreferrer" className="btn btn-primary">
            <Download size={15} /> Descarregar PDF
          </a>
          <p className="text-[11.5px] muted">Link válido até {formatDate(expiresAt.slice(0, 10))}.</p>
        </div>

        <p className="mt-6 text-center text-[11px] muted">
          Partilhado por {business.name}. Documento comercial de cotação, não fiscal.
        </p>
      </main>
    </div>
  );
}

function InvalidLink({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4">
      <div className="card card-pad max-w-[420px] text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#fef2f2] text-[#b91c1c]">
          <ShieldAlert size={20} />
        </div>
        <h1 className="mt-3 font-heading text-[20px] text-[var(--navy)]">{title}</h1>
        <p className="mt-1 text-[13px] muted">{description}</p>
      </div>
    </div>
  );
}
