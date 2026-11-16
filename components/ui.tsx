import type { ReactNode } from "react";
import { STATUS_LABEL, type QuotationStatus } from "@/lib/schemas";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-heading text-[24px] leading-tight text-[var(--navy)] sm:text-[27px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13.5px] muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: QuotationStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-[var(--muted)]">{icon}</div> : null}
      <p className="text-[14.5px] font-semibold text-[var(--ink)]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card card-pad">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] muted">{label}</p>
      <p
        className={`mt-2 text-[22px] font-semibold leading-tight ${
          accent ? "text-[var(--emerald-dark)]" : "text-[var(--navy)]"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] muted">{hint}</p> : null}
    </div>
  );
}
