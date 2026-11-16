"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { duplicateQuotationAction } from "@/app/actions/quotations";

export function DuplicateButton({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost w-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await duplicateQuotationAction(quotationId);
          if (result.ok && result.data) {
            router.push(`/cotacoes/${result.data.id}/editar`);
            router.refresh();
          }
        })
      }
    >
      <CopyPlus size={15} /> {isPending ? "A duplicar…" : "Duplicar"}
    </button>
  );
}
