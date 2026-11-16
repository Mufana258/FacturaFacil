"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Send, Trash2, UserPlus, X } from "lucide-react";
import { quotationSchema, UNITS } from "@/lib/schemas";
import { computeTotals, formatMoney, formatMZN, parseMoney, parsePercentToBp, parseQuantity } from "@/lib/money";
import { saveQuotationAction } from "@/app/actions/quotations";
import { createCustomerAction } from "@/app/actions/customers";
import { Field, FormMessage } from "@/components/form-controls";

type Values = z.infer<typeof quotationSchema>;

export type BuilderCustomer = { id: string; name: string; company_name: string | null };
export type BuilderCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  priceCents: number;
};
export type BuilderInitial = {
  id: string;
  customerId: string;
  title: string;
  issueDate: string;
  validUntil: string;
  notes: string;
  terms: string;
  discount: string;
  lines?: {
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    discountPercent: string;
    taxPercent: string;
  }[];
};

const emptyLine = (taxPercent: string) => ({
  description: "",
  quantity: "1",
  unit: "unidade",
  unitPrice: "",
  discountPercent: "0",
  taxPercent,
});

export function QuotationBuilder({
  mode,
  customers: initialCustomers,
  catalog,
  taxPercent,
  today,
  defaultValidUntil,
  initial,
  initialCustomerId,
}: {
  mode: "create" | "edit";
  customers: BuilderCustomer[];
  catalog: BuilderCatalogItem[];
  taxPercent: string;
  today: string;
  defaultValidUntil: string;
  initial?: BuilderInitial;
  initialCustomerId?: string;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", whatsapp: "" });
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customerId: initial?.customerId ?? initialCustomerId ?? "",
      title: initial?.title ?? "",
      issueDate: initial?.issueDate ?? today,
      validUntil: initial?.validUntil ?? defaultValidUntil,
      notes: initial?.notes ?? "",
      terms: initial?.terms ?? "",
      discount: initial?.discount ?? "",
      lines: initial?.lines ?? [emptyLine(taxPercent)],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });
  const watchedDiscount = useWatch({ control, name: "discount" });

  const totals = useMemo(() => {
    const parsed = (watchedLines ?? []).map((line) => ({
      quantityMilli: parseQuantity(line?.quantity ?? "") ?? 0,
      unitPriceCents: parseMoney(line?.unitPrice ?? "") ?? 0,
      discountBp: parsePercentToBp(line?.discountPercent || "0") ?? 0,
      taxRateBp: parsePercentToBp(line?.taxPercent || "0") ?? 0,
    }));
    return computeTotals(parsed, Math.max(parseMoney(watchedDiscount || "0") ?? 0, 0));
  }, [watchedLines, watchedDiscount]);

  const addFromCatalog = (id: string) => {
    const item = catalog.find((entry) => entry.id === id);
    if (!item) return;
    append({
      description: item.description ? `${item.name} · ${item.description}` : item.name,
      quantity: "1",
      unit: item.unit,
      unitPrice: formatMoney(item.priceCents),
      discountPercent: "0",
      taxPercent,
    });
  };

  const addCustomer = async () => {
    setCreatingCustomer(true);
    const result = await createCustomerAction(newCustomer);
    setCreatingCustomer(false);
    if (!result.ok) {
      setToast({ tone: "error", text: result.message });
      return;
    }
    const id = result.data!.id;
    const created = { id, name: newCustomer.name.trim(), company_name: null };
    setCustomers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setValue("customerId", id, { shouldValidate: true });
    setNewCustomer({ name: "", phone: "", whatsapp: "" });
    setNewCustomerOpen(false);
    setToast({ tone: "ok", text: "Cliente criado e selecionado." });
  };

  const save = (mode: "rascunho" | "emitir") =>
    handleSubmit(async (values) => {
      setToast(null);
      for (const [index, line] of values.lines.entries()) {
        if (parseQuantity(line.quantity) === null) {
          setToast({ tone: "error", text: `Item ${index + 1}: quantidade inválida.` });
          return;
        }
        if (parseMoney(line.unitPrice) === null) {
          setToast({ tone: "error", text: `Item ${index + 1}: preço inválido.` });
          return;
        }
        if (parsePercentToBp(line.discountPercent || "0") === null) {
          setToast({ tone: "error", text: `Item ${index + 1}: desconto inválido.` });
          return;
        }
        if (parsePercentToBp(line.taxPercent || "0") === null) {
          setToast({ tone: "error", text: `Item ${index + 1}: taxa de IVA inválida.` });
          return;
        }
      }

      const result = await saveQuotationAction(initial?.id ?? null, values, mode);
      if (!result.ok) {
        setToast({ tone: "error", text: result.message });
        return;
      }
      router.push(`/cotacoes/${result.data!.id}`);
      router.refresh();
    })();

  const inputError = (message?: string) => (message ? <p className="field-error">{message}</p> : null);

  return (
    <form className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-4">
        <div className="card card-pad space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente *" htmlFor="customerId" error={typeof errors.customerId?.message === "string" ? errors.customerId.message : undefined}>
              <div className="flex gap-2">
                <select id="customerId" className="select" {...register("customerId")}>
                  <option value="">Selecionar cliente…</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company_name ? ` · ${customer.company_name}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost shrink-0"
                  onClick={() => setNewCustomerOpen((open) => !open)}
                  aria-label="Criar novo cliente"
                >
                  {newCustomerOpen ? <X size={15} /> : <UserPlus size={15} />}
                </button>
              </div>
            </Field>
            <Field label="Título da cotação" htmlFor="title" hint="Ex: Remodelação de escritório" error={errors.title?.message}>
              <input id="title" className="input" {...register("title")} />
            </Field>
            <Field label="Data de emissão *" htmlFor="issueDate" error={errors.issueDate?.message}>
              <input id="issueDate" type="date" className="input" {...register("issueDate")} />
            </Field>
            <Field label="Válida até *" htmlFor="validUntil" error={errors.validUntil?.message}>
              <input id="validUntil" type="date" className="input" {...register("validUntil")} />
            </Field>
          </div>

          {newCustomerOpen ? (
            <div className="rounded-xl border border-[var(--line)] bg-[#fbfdff] p-3.5">
              <p className="mb-2.5 text-[12.5px] font-semibold">Novo cliente rápido</p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                <input
                  className="input"
                  placeholder="Nome *"
                  value={newCustomer.name}
                  onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                />
                <input
                  className="input"
                  placeholder="Telefone"
                  value={newCustomer.phone}
                  onChange={(event) => setNewCustomer({ ...newCustomer, phone: event.target.value })}
                />
                <input
                  className="input"
                  placeholder="WhatsApp"
                  value={newCustomer.whatsapp}
                  onChange={(event) => setNewCustomer({ ...newCustomer, whatsapp: event.target.value })}
                />
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={creatingCustomer || newCustomer.name.trim().length < 2}
                  onClick={addCustomer}
                >
                  {creatingCustomer ? "A criar…" : "Criar e selecionar"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewCustomerOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[13.5px] font-semibold">Itens da cotação</h2>
            <div className="flex items-center gap-2">
              <select
                className="select !w-auto !py-1.5 !text-[12.5px]"
                value=""
                onChange={(event) => {
                  addFromCatalog(event.target.value);
                  event.target.value = "";
                }}
                aria-label="Adicionar do catálogo"
              >
                <option value="">Adicionar do catálogo…</option>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatMoney(item.priceCents)} MT
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => append(emptyLine(taxPercent))}>
                <Plus size={14} /> Item
              </button>
            </div>
          </div>

          <div className="hidden bg-[#fbfdff] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.05em] muted sm:grid sm:grid-cols-[1fr_74px_104px_112px_74px_74px_96px_30px] sm:gap-2">
            <span>Descrição</span>
            <span>Qtd.</span>
            <span>Unidade</span>
            <span>Preço unit.</span>
            <span>Desc. %</span>
            <span>IVA %</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="divide-y divide-[#eef2f7]">
            {fields.map((field, index) => {
              const lineErrors = errors.lines?.[index];
              const lineTotal = totals.lines[index]?.netCents ?? 0;
              return (
                <div
                  key={field.id}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_74px_104px_112px_74px_74px_96px_30px] sm:items-start"
                >
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      placeholder="Descrição do item"
                      aria-label={`Descrição item ${index + 1}`}
                      {...register(`lines.${index}.description`)}
                    />
                    {inputError(typeof lineErrors?.description?.message === "string" ? lineErrors.description.message : undefined)}
                  </div>
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      inputMode="decimal"
                      aria-label={`Quantidade item ${index + 1}`}
                      {...register(`lines.${index}.quantity`)}
                    />
                  </div>
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      list="units-list"
                      aria-label={`Unidade item ${index + 1}`}
                      {...register(`lines.${index}.unit`)}
                    />
                  </div>
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-label={`Preço unitário item ${index + 1}`}
                      {...register(`lines.${index}.unitPrice`)}
                    />
                  </div>
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      inputMode="decimal"
                      aria-label={`Desconto item ${index + 1}`}
                      {...register(`lines.${index}.discountPercent`)}
                    />
                  </div>
                  <div>
                    <input
                      className="input !py-1.5 !text-[13px]"
                      inputMode="decimal"
                      aria-label={`IVA item ${index + 1}`}
                      {...register(`lines.${index}.taxPercent`)}
                    />
                  </div>
                  <div className="flex h-[34px] items-center justify-end text-[12.5px] font-semibold sm:justify-end">
                    {formatMoney(lineTotal)}
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="p-1.5 text-[var(--muted)] hover:text-[#b91c1c] disabled:opacity-40"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <datalist id="units-list">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          {typeof errors.lines?.message === "string" ? (
            <p className="px-4 pb-3 text-[12px] text-[#b91c1c]">{errors.lines.message}</p>
          ) : null}
        </div>

        <div className="card card-pad grid gap-4 sm:grid-cols-2">
          <Field label="Notas" htmlFor="notes" hint="Aparecem no PDF, abaixo dos totais.">
            <textarea id="notes" className="textarea" {...register("notes")} />
          </Field>
          <Field label="Termos e condições" htmlFor="terms">
            <textarea id="terms" className="textarea" {...register("terms")} />
          </Field>
        </div>
      </div>

      <aside className="card card-pad lg:sticky lg:top-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] muted">Resumo</h2>
        <dl className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="muted">Subtotal</dt>
            <dd>{formatMoney(totals.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="muted">Descontos</dt>
            <dd>-{formatMoney(totals.discountCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="muted">IVA</dt>
            <dd>{formatMoney(totals.taxCents)}</dd>
          </div>
          <div className="divider !my-3" />
          <div className="flex items-baseline justify-between">
            <dt className="text-[12.5px] font-semibold uppercase tracking-wide muted">Total</dt>
            <dd className="text-[20px] font-semibold text-[var(--navy)]">{formatMZN(totals.totalCents)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <label className="label" htmlFor="discount">
            Desconto da cotação (MT)
          </label>
          <input id="discount" className="input" inputMode="decimal" placeholder="0,00" {...register("discount")} />
          <p className="mt-1 text-[11.5px] muted">Aplicado ao subtotal antes do IVA. Máximo: subtotal com descontos.</p>
        </div>

        {toast ? (
          <div className={`toast mt-4 ${toast.tone === "ok" ? "toast-ok" : "toast-error"}`}>{toast.text}</div>
        ) : null}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
            onClick={() => save("emitir")}
          >
            <Send size={15} /> {isSubmitting ? "A guardar…" : "Emitir Cotação"}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            disabled={isSubmitting}
            onClick={() => save("rascunho")}
          >
            <Save size={15} /> Guardar Rascunho
          </button>
        </div>
        <p className="mt-3 text-[11.5px] muted">
          Emitir gera o número sequencial definitivo e congela os dados desta cotação. Rascunhos podem ser editados.
        </p>
      </aside>
    </form>
  );
}
