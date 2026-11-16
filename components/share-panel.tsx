"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, MessageCircle, RefreshCw, ShieldOff } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { createShareLinkAction, revokeShareLinkAction } from "@/app/actions/quotations";

export function SharePanel({
  quotationId,
  businessName,
  reference,
  totalCents,
  whatsapp,
  initialToken,
}: {
  quotationId: string;
  businessName: string;
  reference: string;
  totalCents: number;
  whatsapp: string | null;
  initialToken: string | null;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const url = token ? `${origin}/s/${token}` : "";

  const message = `Olá, segue a cotação ${reference} de ${businessName} no valor de ${formatMoney(
    totalCents,
  )} MT. Pode consultar o documento através deste link: ${url}`;

  const digits = (whatsapp ?? "").replace(/\D/g, "");
  const waNumber = digits.startsWith("258") ? digits : digits.length === 9 ? `258${digits}` : digits;

  return (
    <div className="card card-pad">
      <div className="flex items-center gap-2">
        <Link2 size={15} className="text-[var(--navy)]" />
        <h2 className="text-[13px] font-semibold">Partilha segura</h2>
      </div>

      {!token ? (
        <p className="mt-2 text-[12.5px] muted">
          Gere um link imprevisível para o cliente consultar a cotação. O link expira em 30 dias e pode ser revogado.
        </p>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <input readOnly value={url} className="input !py-1.5 !text-[11.5px]" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn btn-ghost btn-sm shrink-0"
              aria-label="Copiar link"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-accent w-full !py-2"
          >
            <MessageCircle size={15} /> Partilhar no WhatsApp
          </a>
          <p className="text-[11px] muted">
            Abre o WhatsApp com a mensagem pré-preenchida. O PDF deve ser anexado manualmente na conversa.
          </p>
        </div>
      )}

      {error ? <p className="mt-2 text-[12px] text-[#b91c1c]">{error}</p> : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={isPending}
          onClick={() => {
            setError("");
            startTransition(async () => {
              const result = await createShareLinkAction(quotationId);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setToken(result.data!.token);
              router.refresh();
            });
          }}
        >
          {token ? <RefreshCw size={13} /> : <Link2 size={13} />}
          {token ? "Gerar novo link" : "Gerar link"}
        </button>
        {token ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={isPending}
            onClick={() => {
              setError("");
              startTransition(async () => {
                const result = await revokeShareLinkAction(quotationId);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                setToken(null);
                router.refresh();
              });
            }}
          >
            <ShieldOff size={13} /> Revogar
          </button>
        ) : null}
      </div>
    </div>
  );
}
