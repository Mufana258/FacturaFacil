"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[11.5px] muted">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel ?? "A processar…" : children}
    </button>
  );
}

export function FormMessage({ tone, children }: { tone: "ok" | "error"; children?: ReactNode }) {
  if (!children) return null;
  return <div className={`toast ${tone === "ok" ? "toast-ok" : "toast-error"}`}>{children}</div>;
}
