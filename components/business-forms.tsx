"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { businessSchema, PROVINCES } from "@/lib/schemas";
import { createBusinessAction, updateBusinessProfileAction } from "@/app/actions/business";
import { Field, FormMessage, SubmitButton } from "@/components/form-controls";

type Values = z.infer<typeof businessSchema>;

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(businessSchema),
    defaultValues: { email: defaultEmail, province: "Maputo Cidade", city: "Maputo" },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        const result = await createBusinessAction(values);
        if (result && !result.ok) {
          setMessage(result.message);
          for (const [name, text] of Object.entries(result.fieldErrors ?? {})) {
            setError(name as keyof Values, { message: text });
          }
        }
      })}
    >
      <FormMessage tone="error">{message}</FormMessage>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do negócio *" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
          <input id="name" className="input" placeholder="Ex: Ateliê Ndalu" {...register("name")} />
        </Field>
        <Field label="NUIT" htmlFor="nuit" hint="Opcional" error={errors.nuit?.message}>
          <input id="nuit" className="input" placeholder="123456789" {...register("nuit")} />
        </Field>
        <Field label="Email do negócio" htmlFor="email" error={errors.email?.message}>
          <input id="email" className="input" type="email" {...register("email")} />
        </Field>
        <Field label="Telefone" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" className="input" placeholder="+258 84 000 0000" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp" hint="Usado nos botões de partilha" error={errors.whatsapp?.message}>
          <input id="whatsapp" className="input" placeholder="84 000 0000" {...register("whatsapp")} />
        </Field>
        <Field label="Endereço" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
          <input id="address" className="input" placeholder="Av. Julius Nyerere, 123" {...register("address")} />
        </Field>
        <Field label="Cidade" htmlFor="city" error={errors.city?.message}>
          <input id="city" className="input" {...register("city")} />
        </Field>
        <Field label="Província" htmlFor="province" error={errors.province?.message}>
          <select id="province" className="select" {...register("province")}>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Website" htmlFor="website" hint="Opcional" error={errors.website?.message} className="sm:col-span-2">
          <input id="website" className="input" placeholder="www.exemplo.co.mz" {...register("website")} />
        </Field>
      </div>

      <div className="rounded-lg bg-[var(--navy-soft)] px-3.5 py-3 text-[12px] text-[#334155]">
        País: Moçambique · Moeda: Metical (MZN). O logótipo pode ser carregado depois, nas Definições.
      </div>

      <SubmitButton className="btn btn-primary w-full" pendingLabel="A criar negócio…">
        Concluir configuração
      </SubmitButton>
    </form>
  );
}

export function BusinessProfileForm({ defaults }: { defaults: Values }) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(businessSchema), defaultValues: defaults });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        const result = await updateBusinessProfileAction(values);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.message });
          for (const [name, text] of Object.entries(result.fieldErrors ?? {})) {
            setError(name as keyof Values, { message: text });
          }
          return;
        }
        setMessage({ tone: "ok", text: result.message ?? "Guardado." });
      })}
    >
      <FormMessage tone={message?.tone ?? "ok"}>{message?.text}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome do negócio *" htmlFor="s-name" error={errors.name?.message} className="sm:col-span-2">
          <input id="s-name" className="input" {...register("name")} />
        </Field>
        <Field label="NUIT" htmlFor="s-nuit" error={errors.nuit?.message}>
          <input id="s-nuit" className="input" {...register("nuit")} />
        </Field>
        <Field label="Email" htmlFor="s-email" error={errors.email?.message}>
          <input id="s-email" className="input" type="email" {...register("email")} />
        </Field>
        <Field label="Telefone" htmlFor="s-phone" error={errors.phone?.message}>
          <input id="s-phone" className="input" {...register("phone")} />
        </Field>
        <Field label="WhatsApp" htmlFor="s-whatsapp" error={errors.whatsapp?.message}>
          <input id="s-whatsapp" className="input" {...register("whatsapp")} />
        </Field>
        <Field label="Endereço" htmlFor="s-address" error={errors.address?.message} className="sm:col-span-2">
          <input id="s-address" className="input" {...register("address")} />
        </Field>
        <Field label="Cidade" htmlFor="s-city" error={errors.city?.message}>
          <input id="s-city" className="input" {...register("city")} />
        </Field>
        <Field label="Província" htmlFor="s-province" error={errors.province?.message}>
          <select id="s-province" className="select" {...register("province")}>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <SubmitButton className="btn btn-primary" pendingLabel="A guardar…">
        Guardar perfil
      </SubmitButton>
    </form>
  );
}
