"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { customerSchema } from "@/lib/schemas";
import { createCustomerAction, updateCustomerAction } from "@/app/actions/customers";
import { Field, FormMessage, SubmitButton } from "@/components/form-controls";

type Values = z.infer<typeof customerSchema>;

export function CustomerForm({
  mode,
  customerId,
  defaults,
  onCreated,
}: {
  mode: "create" | "edit";
  customerId?: string;
  defaults?: Partial<Values>;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(customerSchema), defaultValues: defaults });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        const result =
          mode === "create"
            ? await createCustomerAction(values)
            : await updateCustomerAction(customerId!, values);

        if (!result.ok) {
          setMessage(result.message);
          for (const [name, text] of Object.entries(result.fieldErrors ?? {})) {
            setError(name as keyof Values, { message: text });
          }
          return;
        }
        if (mode === "create" && result.data?.id) {
          onCreated?.(result.data.id);
          router.push(`/clientes/${result.data.id}`);
        } else {
          router.push(`/clientes/${customerId}`);
        }
        router.refresh();
      })}
    >
      <FormMessage tone="error">{message}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do cliente *" htmlFor="c-name" error={errors.name?.message}>
          <input id="c-name" className="input" placeholder="Ex: Maria Silva" {...register("name")} />
        </Field>
        <Field label="Empresa" htmlFor="c-company" hint="Opcional" error={errors.companyName?.message}>
          <input id="c-company" className="input" {...register("companyName")} />
        </Field>
        <Field label="NUIT" htmlFor="c-nuit" hint="Opcional" error={errors.nuit?.message}>
          <input id="c-nuit" className="input" {...register("nuit")} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message}>
          <input id="c-email" className="input" type="email" {...register("email")} />
        </Field>
        <Field label="Telefone" htmlFor="c-phone" error={errors.phone?.message}>
          <input id="c-phone" className="input" placeholder="+258 84 000 0000" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="c-whatsapp" error={errors.whatsapp?.message}>
          <input id="c-whatsapp" className="input" placeholder="84 000 0000" {...register("whatsapp")} />
        </Field>
        <Field label="Endereço" htmlFor="c-address" className="sm:col-span-2" error={errors.address?.message}>
          <input id="c-address" className="input" {...register("address")} />
        </Field>
        <Field label="Cidade" htmlFor="c-city" error={errors.city?.message}>
          <input id="c-city" className="input" {...register("city")} />
        </Field>
        <Field label="Notas" htmlFor="c-notes" className="sm:col-span-2" error={errors.notes?.message}>
          <textarea id="c-notes" className="textarea" placeholder="Informações internas sobre o cliente" {...register("notes")} />
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton className="btn btn-primary" pendingLabel="A guardar…">
          {mode === "create" ? "Criar cliente" : "Guardar alterações"}
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
