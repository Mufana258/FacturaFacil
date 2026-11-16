"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImageUp, Trash2 } from "lucide-react";
import { defaultsSchema } from "@/lib/schemas";
import { changePasswordAction, removeLogoAction, updateDefaultsAction, uploadLogoAction } from "@/app/actions/business";
import { Field, FormMessage, SubmitButton } from "@/components/form-controls";

type DefaultsValues = z.infer<typeof defaultsSchema>;

export function DefaultsForm({ defaults }: { defaults: DefaultsValues }) {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DefaultsValues>({ resolver: zodResolver(defaultsSchema), defaultValues: defaults });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        const result = await updateDefaultsAction(values);
        if (!result.ok) {
          setMessage({ tone: "error", text: result.message });
          for (const [name, text] of Object.entries(result.fieldErrors ?? {})) {
            setError(name as keyof DefaultsValues, { message: text });
          }
          return;
        }
        setMessage({ tone: "ok", text: result.message ?? "Guardado." });
      })}
    >
      <FormMessage tone={message?.tone ?? "ok"}>{message?.text}</FormMessage>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Validade predefinida (dias)" htmlFor="d-validity" error={errors.defaultValidityDays?.message}>
          <input id="d-validity" type="number" min={1} max={365} className="input" {...register("defaultValidityDays")} />
        </Field>
        <Field
          label="Taxa de IVA predefinida (%)"
          htmlFor="d-tax"
          hint="0 se não aplica IVA. Aplicada a novas linhas de cotação."
          error={errors.defaultTaxPercent?.message}
        >
          <input id="d-tax" className="input" inputMode="decimal" {...register("defaultTaxPercent")} />
        </Field>
        <Field label="Notas predefinidas" htmlFor="d-notes" className="sm:col-span-2" error={errors.defaultNotes?.message}>
          <textarea id="d-notes" className="textarea" placeholder="Ex: Preços válidos por 30 dias." {...register("defaultNotes")} />
        </Field>
        <Field
          label="Termos e condições predefinidos"
          htmlFor="d-terms"
          className="sm:col-span-2"
          error={errors.defaultTerms?.message}
        >
          <textarea
            id="d-terms"
            className="textarea"
            placeholder="Ex: 50% na adjudicação, restante na entrega."
            {...register("defaultTerms")}
          />
        </Field>
      </div>
      <SubmitButton className="btn btn-primary" pendingLabel="A guardar…">
        Guardar predefinições
      </SubmitButton>
    </form>
  );
}

export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const upload = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage({ tone: "error", text: "Selecione uma imagem." });
      return;
    }
    const data = new FormData();
    data.set("logo", file);
    startTransition(async () => {
      const result = await uploadLogoAction(data);
      setMessage({ tone: result.ok ? "ok" : "error", text: result.message ?? "" });
      if (result.ok) {
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await removeLogoAction();
      setMessage({ tone: result.ok ? "ok" : "error", text: result.message ?? "" });
      if (result.ok) router.refresh();
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logótipo" className="h-16 w-16 rounded-lg border border-[var(--line)] bg-white object-contain p-1" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-[var(--line)] text-[10.5px] muted">
            Sem logo
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="input !py-1.5 !text-[12px]" />
          <p className="mt-1 text-[11px] muted">PNG, JPG ou WebP até 2 MB.</p>
        </div>
      </div>
      {message ? <div className={`toast mt-3 ${message.tone === "ok" ? "toast-ok" : "toast-error"}`}>{message.text}</div> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={upload} disabled={isPending}>
          <ImageUp size={14} /> {isPending ? "A enviar…" : "Carregar logótipo"}
        </button>
        {logoUrl ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={isPending}>
            <Trash2 size={14} /> Remover
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PasswordForm() {
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (newPassword !== confirm) {
          setMessage({ tone: "error", text: "As palavras-passe novas não coincidem." });
          return;
        }
        startTransition(async () => {
          const result = await changePasswordAction({ currentPassword, newPassword });
          setMessage({ tone: result.ok ? "ok" : "error", text: result.message ?? "" });
          if (result.ok) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirm("");
          }
        });
      }}
    >
      <FormMessage tone={message?.tone ?? "ok"}>{message?.text}</FormMessage>
      <Field label="Palavra-passe atual" htmlFor="p-current">
        <input
          id="p-current"
          className="input"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nova palavra-passe" htmlFor="p-new" hint="Mínimo de 8 caracteres.">
          <input
            id="p-new"
            className="input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </Field>
        <Field label="Confirmar nova palavra-passe" htmlFor="p-confirm">
          <input
            id="p-confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </Field>
      </div>
      <button className="btn btn-primary" disabled={isPending}>
        {isPending ? "A guardar…" : "Alterar palavra-passe"}
      </button>
    </form>
  );
}
