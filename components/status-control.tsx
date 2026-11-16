"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_LABEL, type QuotationStatus } from "@/lib/schemas";
import { updateQuotationStatusAction } from "@/app/actions/quotations";

export function StatusControl({
  quotationId,
  status,
  isDraft,
}: {
  quotationId: string;
  status: QuotationStatus;
  isDraft: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const options = isDraft ? (["rascunho", "enviada"] as QuotationStatus[]) : STATUSES.filter((s) => s !== "rascunho");

  return (
    <div>
      <label className="label" htmlFor="status-select">
        Estado
      </label>
      <div className="flex items-center gap-2">
        <select
          id="status-select"
          className="select !py-1.5 !text-[12.5px]"
          value={status}
          disabled={isPending}
          onChange={(event) => {
            const next = event.target.value;
            setError("");
            startTransition(async () => {
              const result = await updateQuotationStatusAction(quotationId, next);
              if (!result.ok) setError(result.message);
              router.refresh();
            });
          }}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option === "enviada" && isDraft ? "Emitir e enviar" : STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        {isPending ? <span className="text-[11.5px] muted">…</span> : null}
      </div>
      {error ? <p className="mt-1 text-[11.5px] text-[#b91c1c]">{error}</p> : null}
    </div>
  );
}
