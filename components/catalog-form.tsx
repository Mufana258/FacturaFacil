"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { catalogSchema, UNITS } from "@/lib/schemas";
import { createCatalogItemAction, updateCatalogItemAction } from "@/app/actions/catalog";
import { Field, FormMessage, SubmitButton } from "@/components/form-controls";

type Values = z.infer<typeof catalogSchema>;

export function CatalogForm({
  mode,
  itemId,
  defaults,
}: {
  mode: "create" | "edit";
  itemId?: string;
  defaults?: Partial<Values>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(catalogSchema),
    defaultValues: { type: "servico", unit: "unidade", ...defaults },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        const result = mode === "create" ? await createCatalogItemAction(values) : await updateCatalogItemAction(itemId!, values);
        if (!result.ok) {
          setMessage(result.message);
          for (const [name, text] of Object.entries(result.fieldErrors ?? {})) {
            setError(name as keyof Values, { message: text });
          }
          return;
        }
        router.push("/catalogo");
        router.refresh();
      })}
    >
      <FormMessage tone="error">{message}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" htmlFor="i-name" error={errors.name?.message} className="sm:col-span-2">
          <input id="i-name" className="input" placeholder="Ex: Instalação de ar condicionado" {...register("name")} />
        </Field>
        <Field label="Descrição" htmlFor="i-desc" error={errors.description?.message} className="sm:col-span-2">
          <textarea id="i-desc" className="textarea" placeholder="Detalhes que aparecem na cotação" {...register("description")} />
        </Field>
        <Field label="Tipo *" htmlFor="i-type" error={errors.type?.message}>
          <select id="i-type" className="select" {...register("type")}>
            <option value="servico">Serviço</option>
            <option value="produto">Produto</option>
          </select>
        </Field>
        <Field label="Unidade *" htmlFor="i-unit" error={errors.unit?.message}>
          <select id="i-unit" className="select" {...register("unit")}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preço unitário (MT) *" htmlFor="i-price" hint="Ex: 1.500,00" error={errors.price?.message}>
          <input id="i-price" className="input" inputMode="decimal" placeholder="0,00" {...register("price")} />
        </Field>
        <Field label="Categoria" htmlFor="i-cat" hint="Opcional" error={errors.category?.message}>
          <input id="i-cat" className="input" {...register("category")} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary" pendingLabel="A guardar…">
          {mode === "create" ? "Adicionar item" : "Guardar alterações"}
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
