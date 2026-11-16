import { z } from "zod";

export const PROVINCES = [
  "Maputo Cidade",
  "Maputo Província",
  "Gaza",
  "Inhambane",
  "Sofala",
  "Manica",
  "Tete",
  "Zambézia",
  "Nampula",
  "Cabo Delgado",
  "Niassa",
] as const;

export const UNITS = ["unidade", "hora", "dia", "mês", "metro", "metro quadrado", "kg", "serviço"] as const;

export const STATUSES = ["rascunho", "enviada", "aceite", "rejeitada", "expirada"] as const;
export type QuotationStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceite: "Aceite",
  rejeitada: "Rejeitada",
  expirada: "Expirada",
};

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Indique o seu nome completo"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "Introduza a palavra-passe"),
});

export const businessSchema = z.object({
  name: z.string().trim().min(2, "O nome do negócio é obrigatório"),
  nuit: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(25).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  province: z.string().trim().max(100).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
});

export const settingsSchema = businessSchema.extend({
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
  defaultTaxPercent: z.string().trim().max(10),
  defaultNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultTerms: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const defaultsSchema = z.object({
  defaultValidityDays: z.coerce.number().int().min(1, "Mínimo 1 dia").max(365, "Máximo 365 dias"),
  defaultTaxPercent: z.string().trim().max(10),
  defaultNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultTerms: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2, "O nome do cliente é obrigatório"),
  companyName: z.string().trim().max(150).optional().or(z.literal("")),
  nuit: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(25).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

export const catalogSchema = z.object({
  name: z.string().trim().min(2, "O nome é obrigatório"),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  type: z.enum(["produto", "servico"]),
  unit: z.string().trim().min(1),
  price: z.string().trim().min(1, "Indique o preço"),
  category: z.string().trim().max(100).optional().or(z.literal("")),
});

export const quotationLineSchema = z.object({
  description: z.string().trim().min(2, "Descreva o item"),
  quantity: z.string().trim().min(1, "Indique a quantidade"),
  unit: z.string().trim().min(1),
  unitPrice: z.string().trim().min(1, "Indique o preço"),
  discountPercent: z.string().trim().optional().or(z.literal("")),
  taxPercent: z.string().trim().optional().or(z.literal("")),
});

export const quotationSchema = z.object({
  customerId: z.string().min(1, "Selecione um cliente"),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: z.string().min(1, "Indique a data de emissão"),
  validUntil: z.string().min(1, "Indique a validade"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(4000).optional().or(z.literal("")),
  discount: z.string().trim().optional().or(z.literal("")),
  lines: z.array(quotationLineSchema).min(1, "Adicione pelo menos um item"),
});

export type QuotationInput = z.infer<typeof quotationSchema>;
