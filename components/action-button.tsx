"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";

export function ActionButton({
  action,
  children,
  confirmMessage,
  className = "btn btn-ghost btn-sm",
  successToast = true,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirmMessage?: string;
  className?: string;
  successToast?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={isPending}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          startTransition(async () => {
            const result = await action();
            if (!result.ok) setToast({ tone: "error", text: result.message });
            else if (successToast) setToast({ tone: "ok", text: result.message ?? "Feito." });
            router.refresh();
          });
        }}
      >
        {isPending ? "…" : children}
      </button>
      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2">
          <div className={`toast ${toast.tone === "ok" ? "toast-ok" : "toast-error"} shadow-lg`}>{toast.text}</div>
        </div>
      ) : null}
    </>
  );
}
