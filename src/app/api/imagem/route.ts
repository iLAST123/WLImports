import { NextRequest } from "next/server";
import { getImagemOriginal } from "@/lib/bling";

// Rota dinâmica (usa searchParams) — o cache fica no `Cache-Control` da
// resposta, não em revalidate de rota.

// Proxy de imagem: `GET /api/imagem?id=123`.
//
// Design SSRF-safe: o client passa SOMENTE o id numérico. NUNCA aceitamos uma
// URL arbitrária por query — a URL assinada da AWS é resolvida no servidor a
// partir do catálogo já buscado. Sem isso, o proxy viraria um open relay que
// buscaria qualquer host que o cliente pedisse.
export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("id");
  const id = Number(idParam);
  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return new Response("id inválido", { status: 400 });
  }

  const url = await getImagemOriginal(id);
  if (!url) return new Response("imagem não encontrada", { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return new Response("falha ao buscar imagem", { status: 502 });
  }
  if (!upstream.ok) return new Response("imagem indisponível", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=300",
    },
  });
}
