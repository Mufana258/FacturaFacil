"use server";

import { revalidatePath } from "next/cache";
import { db, nowIso, uid } from "@/lib/db";
import { requireBusiness } from "@/lib/auth";
import { catalogSchema } from "@/lib/schemas";
import { parseMoney } from "@/lib/money";
import { zodErrors, type ActionResult } from "@/lib/action";

function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export async function createCatalogItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { business } = await requireBusiness();
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados do item.", fieldErrors: zodErrors(parsed.error) };
  }

  const price = parseMoney(parsed.data.price);
  if (price === null || price < 0) {
    return { ok: false, message: "Preço inválido.", fieldErrors: { price: "Introduza um preço válido, ex: 1.500,00" } };
  }

  const id = uid();
  const created = nowIso();
  db()
    .prepare(
      `INSERT INTO catalog_items (id, business_id, name, description, type, unit, price_cents, category, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      id,
      business.id,
      parsed.data.name,
      nullable(parsed.data.description),
      parsed.data.type,
      parsed.data.unit,
      price,
      nullable(parsed.data.category),
      created,
      created,
    );

  revalidatePath("/catalogo");
  return { ok: true, message: "Item adicionado ao catálogo.", data: { id } };
}

export async function updateCatalogItemAction(id: string, input: unknown): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados do item.", fieldErrors: zodErrors(parsed.error) };
  }

  const price = parseMoney(parsed.data.price);
  if (price === null || price < 0) {
    return { ok: false, message: "Preço inválido.", fieldErrors: { price: "Introduza um preço válido, ex: 1.500,00" } };
  }

  const result = db()
    .prepare(
      `UPDATE catalog_items SET name = ?, description = ?, type = ?, unit = ?, price_cents = ?, category = ?, updated_at = ?
       WHERE id = ? AND business_id = ?`,
    )
    .run(
      parsed.data.name,
      nullable(parsed.data.description),
      parsed.data.type,
      parsed.data.unit,
      price,
      nullable(parsed.data.category),
      nowIso(),
      id,
      business.id,
    );

  if (result.changes === 0) return { ok: false, message: "Item não encontrado." };

  revalidatePath("/catalogo");
  return { ok: true, message: "Item atualizado." };
}

export async function toggleCatalogItemAction(id: string, active: boolean): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const result = db()
    .prepare("UPDATE catalog_items SET is_active = ?, updated_at = ? WHERE id = ? AND business_id = ?")
    .run(active ? 1 : 0, nowIso(), id, business.id);
  if (result.changes === 0) return { ok: false, message: "Item não encontrado." };
  revalidatePath("/catalogo");
  return { ok: true, message: active ? "Item reativado." : "Item arquivado." };
}
