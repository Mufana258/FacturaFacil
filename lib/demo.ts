import { db } from "./db";

export const DEMO_EMAIL = "demo@facturafacil.co.mz";

export function demoLoginEnabled(): boolean {
  if (process.env.DEMO_MODE === "0") return false;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "1") return false;
  return Boolean(db().prepare("SELECT id FROM users WHERE email = ?").get(DEMO_EMAIL));
}
