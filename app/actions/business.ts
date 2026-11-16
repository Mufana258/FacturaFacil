"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, nowIso, uid, UPLOAD_DIR } from "@/lib/db";
import { getBusinessForUser, hashPassword, requireBusiness, requireUser, verifyPassword } from "@/lib/auth";
import { businessSchema, defaultsSchema } from "@/lib/schemas";
import { parsePercentToBp } from "@/lib/money";
import { zodErrors, type ActionResult } from "@/lib/action";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";

function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

export async function createBusinessAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados do negócio.", fieldErrors: zodErrors(parsed.error) };
  }

  const existing = await getBusinessForUser(user.id);
  if (existing) return { ok: false, message: "Já existe um negócio associado a esta conta." };

  const d = parsed.data;
  const created = nowIso();
  db()
    .prepare(
      `INSERT INTO businesses (id, owner_user_id, name, nuit, email, phone, whatsapp, address, city, province, website,
        default_validity_days, default_tax_bp, currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 30, 1600, 'MZN', ?, ?)`,
    )
    .run(
      uid(),
      user.id,
      d.name,
      nullable(d.nuit),
      nullable(d.email),
      nullable(d.phone),
      nullable(d.whatsapp),
      nullable(d.address),
      nullable(d.city),
      nullable(d.province),
      nullable(d.website),
      created,
      created,
    );

  redirect("/painel");
}

export async function updateBusinessProfileAction(input: unknown): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados.", fieldErrors: zodErrors(parsed.error) };
  }

  const d = parsed.data;
  db()
    .prepare(
      `UPDATE businesses SET name = ?, nuit = ?, email = ?, phone = ?, whatsapp = ?, address = ?, city = ?,
        province = ?, website = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      d.name,
      nullable(d.nuit),
      nullable(d.email),
      nullable(d.phone),
      nullable(d.whatsapp),
      nullable(d.address),
      nullable(d.city),
      nullable(d.province),
      nullable(d.website),
      nowIso(),
      business.id,
    );

  revalidatePath("/definicoes");
  revalidatePath("/painel");
  return { ok: true, message: "Perfil do negócio guardado." };
}

export async function updateDefaultsAction(input: unknown): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const parsed = defaultsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os valores.", fieldErrors: zodErrors(parsed.error) };
  }

  const taxBp = parsePercentToBp(parsed.data.defaultTaxPercent);
  if (taxBp === null) {
    return { ok: false, message: "Taxa de IVA inválida.", fieldErrors: { defaultTaxPercent: "Use um valor entre 0 e 100." } };
  }

  db()
    .prepare(
      `UPDATE businesses SET default_validity_days = ?, default_tax_bp = ?, default_notes = ?, default_terms = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      parsed.data.defaultValidityDays,
      taxBp,
      nullable(parsed.data.defaultNotes),
      nullable(parsed.data.defaultTerms),
      nowIso(),
      business.id,
    );

  revalidatePath("/definicoes");
  return { ok: true, message: "Predefinições guardadas." };
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadLogoAction(formData: FormData): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Selecione um ficheiro de imagem." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, message: "O logótipo deve ter no máximo 2 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = detectImage(bytes);
  if (!signature) {
    return { ok: false, message: "Formato inválido. Use PNG, JPG ou WebP." };
  }

  const filename = `${uid()}.${signature}`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  const previous = business.logo_path;
  db().prepare("UPDATE businesses SET logo_path = ?, updated_at = ? WHERE id = ?").run(filename, nowIso(), business.id);
  if (previous && /^[a-f0-9-]+\.(png|jpg|webp)$/.test(previous)) {
    await unlink(path.join(UPLOAD_DIR, previous)).catch(() => undefined);
  }

  revalidatePath("/definicoes");
  revalidatePath("/painel");
  return { ok: true, message: "Logótipo atualizado." };
}

export async function removeLogoAction(): Promise<ActionResult> {
  const { business } = await requireBusiness();
  const previous = business.logo_path;
  db().prepare("UPDATE businesses SET logo_path = NULL, updated_at = ? WHERE id = ?").run(nowIso(), business.id);
  if (previous && /^[a-f0-9-]+\.(png|jpg|webp)$/.test(previous)) {
    await unlink(path.join(UPLOAD_DIR, previous)).catch(() => undefined);
  }
  revalidatePath("/definicoes");
  return { ok: true, message: "Logótipo removido." };
}

function detectImage(bytes: Uint8Array): string | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Introduza a palavra-passe atual"),
  newPassword: z.string().min(8, "A nova palavra-passe deve ter pelo menos 8 caracteres"),
});

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Verifique os dados.", fieldErrors: zodErrors(parsed.error) };
  }

  const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as
    | { password_hash: string }
    | undefined;
  if (!row || !verifyPassword(parsed.data.currentPassword, row.password_hash)) {
    return { ok: false, message: "Palavra-passe atual incorreta.", fieldErrors: { currentPassword: "Incorreta" } };
  }

  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(parsed.data.newPassword), user.id);
  return { ok: true, message: "Palavra-passe alterada." };
}
