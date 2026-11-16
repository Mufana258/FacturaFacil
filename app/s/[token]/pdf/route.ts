import { resolveShareToken } from "@/lib/share";
import { documentForQuotation, logoDataUri } from "@/lib/document";
import { effectiveStatus } from "@/lib/quotations";
import { STATUS_TEXT, renderQuotePdf } from "@/lib/pdf";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const limit = rateLimit(await clientKey("share-pdf"), 120, 60 * 60 * 1000);
  if (!limit.ok) return new Response("Demasiados pedidos. Tente novamente mais tarde.", { status: 429 });

  const { token } = await context.params;
  const shared = resolveShareToken(token);
  if (!shared) return new Response("Link inválido ou expirado", { status: 404 });

  const { quotation, business, customer, items } = shared;
  const document = documentForQuotation(business, customer, quotation, items);

  const pdf = await renderQuotePdf({
    data: document,
    logo: logoDataUri(business.logo_path),
    statusLabel: STATUS_TEXT[effectiveStatus(quotation)] ?? "",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Cotacao-${quotation.quotation_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
