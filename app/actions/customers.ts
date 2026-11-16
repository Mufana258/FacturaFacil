"use server";

import { revalidatePath } from "next/cache";
import { db, nowIso, uid } from "@/lib/db";
import { requireBusiness } from "@/lib/auth";
import { customerSchema } from "@/lib/schemas";
import { zodErrors, type ActionResult } from "@/lib/action";

function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function values(d: Record<string, string | undefined>) {
  return [
    d.name?.trim() ?? "",
    nullable(d.companyName),
    nullable(d.nuit),
    nullable(d.email),
    nullable(d.phone),
    nullable(d.whatsapp),
    nullable(d.address),
    nullable(d.city),
    nullable(d.notes),
  ];
}

export async function createCustomerAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { business } = await requireBusiness();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados do cliente.", fieldErrors: zodErrors(parsed.error) };
  }

  const id = uid();
  const created = nowIso();
  db()
    .prepare(
      `INSERT INTO customers (id, business_id, name, company_name, nuit, email, phone, whatsapp, address, city, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, business.id, ...values(parsed.data), created, created);

  revalidatePath("/clientes");
  revalidatePath("/painel");
  return { ok: true, message: "Cliente criado.", data: { id } };
}

export async function updateCustomerAction(id: string, input: unknown): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados do cliente.", fieldErrors: zodErrors(parsed.error) };
  }

  const result = db()
    .prepare(
      `UPDATE customers SET name = ?, company_name = ?, nuit = ?, email = ?, phone = ?, whatsapp = ?, address = ?, city = ?, notes = ?, updated_at = ?
       WHERE id = ? AND business_id = ?`,
    )
    .run(...values(parsed.data), nowIso(), id, business.id);

  if (result.changes === 0) return { ok: false, message: "Cliente não encontrado." };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, message: "Cliente atualizado." };
}

export async function archiveCustomerAction(id: string): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const result = db()
    .prepare("UPDATE customers SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(nowIso(), nowIso(), id, business.id);
  if (result.changes === 0) return { ok: false, message: "Cliente não encontrado." };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, message: "Cliente arquivado. As cotações anteriores mantêm-se válidas." };
}

export async function restoreCustomerAction(id: string): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const result = db()
    .prepare("UPDATE customers SET archived_at = NULL, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(nowIso(), id, business.id);
  if (result.changes === 0) return { ok: false, message: "Cliente não encontrado." };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true, message: "Cliente reativado." };
}
