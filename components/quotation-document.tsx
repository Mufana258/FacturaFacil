import { formatDate, formatMoney, formatMZN, formatPercentFromBp, formatQuantity } from "@/lib/money";
import { STATUS_LABEL, type QuotationStatus } from "@/lib/schemas";

export type DocumentItem = {
  description: string;
  quantityMilli: number;
  unit: string;
  unitPriceCents: number;
  discountBp: number;
  lineTotalCents: number;
};

export type DocumentData = {
  business: {
    name: string;
    nuit: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    logoUrl: string | null;
  };
  customer: {
    name: string;
    company_name: string | null;
    nuit: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
  };
  reference: string;
  title: string | null;
  issueDate: string;
  validUntil: string;
  notes: string | null;
  terms: string | null;
  items: DocumentItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

export function QuotationDocument({ data, badge }: { data: DocumentData; badge?: QuotationStatus }) {
  const { business, customer } = data;
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-[var(--line)] object-contain" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[var(--navy)] font-heading text-[19px] text-white">
              {business.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div>
            <h2 className="font-heading text-[18px] leading-tight text-[var(--navy)]">{business.name}</h2>
            <div className="mt-1 space-y-0.5 text-[11.5px] muted">
              {business.nuit ? <p>NUIT: {business.nuit}</p> : null}
              {business.address ? <p>{business.address}</p> : null}
              <p>
                {[business.city, business.province].filter(Boolean).join(" · ")}
                {business.city || business.province ? "" : null}
              </p>
              <p>{[business.phone, business.email].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--emerald-dark)]">
            Cotação
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold">{data.reference}</p>
          {badge ? (
            <div className="mt-2">
              <span className={`badge badge-${badge}`}>{STATUS_LABEL[badge]}</span>
            </div>
          ) : null}
          <div className="mt-2 space-y-0.5 text-[11.5px] muted">
            <p>Emissão: {formatDate(data.issueDate)}</p>
            <p>Validade: {formatDate(data.validUntil)}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 border-b border-[var(--line)] px-5 py-4 sm:grid-cols-2 sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] muted">Para</p>
          <p className="mt-1 text-[13.5px] font-semibold">{customer.name}</p>
          <div className="mt-0.5 space-y-0.5 text-[12px] muted">
            {customer.company_name ? <p>{customer.company_name}</p> : null}
            {customer.nuit ? <p>NUIT: {customer.nuit}</p> : null}
            {customer.address ? <p>{customer.address}</p> : null}
            {customer.city ? <p>{customer.city}</p> : null}
            <p>{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] muted">Assunto</p>
          <p className="mt-1 text-[13px]">{data.title || "Proposta comercial"}</p>
        </div>
      </div>

      <div className="overflow-x-auto px-5 py-4 sm:px-6">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[10px] uppercase tracking-[0.08em] muted">
              <th className="py-2 pr-2 font-semibold">Descrição</th>
              <th className="py-2 pr-2 text-right font-semibold">Qtd.</th>
              <th className="py-2 pr-2 font-semibold">Unid.</th>
              <th className="py-2 pr-2 text-right font-semibold">Preço</th>
              <th className="py-2 pr-2 text-right font-semibold">Desc.</th>
              <th className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-[#f1f5f9] align-top">
                <td className="max-w-[280px] whitespace-pre-line py-2.5 pr-2">{item.description}</td>
                <td className="py-2.5 pr-2 text-right">{formatQuantity(item.quantityMilli)}</td>
                <td className="py-2.5 pr-2">{item.unit}</td>
                <td className="py-2.5 pr-2 text-right">{formatMoney(item.unitPriceCents)}</td>
                <td className="py-2.5 pr-2 text-right">{item.discountBp ? `${formatPercentFromBp(item.discountBp)}%` : "—"}</td>
                <td className="py-2.5 text-right font-medium">{formatMoney(item.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-1 border-t border-[var(--line)] px-5 py-4 sm:px-6">
        <div className="w-full max-w-[280px] space-y-1.5 text-[12.5px]">
          <Row label="Subtotal" value={formatMoney(data.subtotalCents)} />
          <Row label="Descontos" value={`-${formatMoney(data.discountCents)}`} />
          <Row label="IVA" value={formatMoney(data.taxCents)} />
          <div className="divider !my-2" />
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] muted">Total</span>
            <span className="text-[18px] font-semibold text-[var(--navy)]">{formatMZN(data.totalCents)}</span>
          </div>
        </div>
      </div>

      {data.notes || data.terms ? (
        <div className="grid gap-3 border-t border-[var(--line)] bg-[#fbfdff] px-5 py-4 text-[11.5px] sm:grid-cols-2 sm:px-6">
          {data.notes ? (
            <div>
              <p className="font-semibold uppercase tracking-[0.1em] muted">Notas</p>
              <p className="mt-1 whitespace-pre-line">{data.notes}</p>
            </div>
          ) : null}
          {data.terms ? (
            <div>
              <p className="font-semibold uppercase tracking-[0.1em] muted">Termos e condições</p>
              <p className="mt-1 whitespace-pre-line">{data.terms}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <footer className="border-t border-[var(--line)] px-5 py-3 text-[10.5px] muted sm:px-6">
        {[business.name, business.phone, business.email, business.address].filter(Boolean).join(" · ")}
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
