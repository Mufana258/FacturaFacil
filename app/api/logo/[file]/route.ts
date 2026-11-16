import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(file)) {
    return new Response("Não encontrado", { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, file));
    const ext = file.split(".").pop()!;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
