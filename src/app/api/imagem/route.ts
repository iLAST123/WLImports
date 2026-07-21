import { NextRequest } from "next/server";
import { getImagemProduto, invalidarImagemGrande } from "@/lib/bling";

// Rota dinâmica (usa searchParams) — o cache fica no `Cache-Control` da
// resposta, não em revalidate de rota.

// Proxy de imagem: `GET /api/imagem?id=123[&i=0]`.
//
// `i` (opcional, inteiro >= 0) seleciona a imagem da GALERIA do produto —
// `i=0` (ou ausente) é a principal, exatamente o comportamento anterior.
//
// Design SSRF-safe: o client passa SOMENTE o id numérico. NUNCA aceitamos uma
// URL arbitrária por query — as URLs assinadas da AWS são resolvidas no
// servidor (listagem cacheada + detalhe lazy do produto). Sem isso, o proxy
// viraria um open relay que buscaria qualquer host que o cliente pedisse.
//
// Qualidade: tenta primeiro a imagem em tamanho ORIGINAL (detalhe do produto);
// se indisponível ou se o upstream falhar (ex.: assinatura expirada), cai para
// a miniatura 70x70 da listagem — o card nunca fica sem foto por causa do
// proxy. O fallback sai com `max-age` curto para o browser re-tentar logo e
// trocar pela versão nítida.
export async function GET(req: NextRequest) {
  const idParam = req.nextUrl.searchParams.get("id");
  const id = Number(idParam);
  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return new Response("id inválido", { status: 400 });
  }

  // Índice da galeria: ausente = principal. Inválido → 404 (não existe essa
  // imagem), na mesma classe de resposta de um índice fora do range.
  const iParam = req.nextUrl.searchParams.get("i");
  // `Number("")` é 0 — string vazia é entrada inválida, não a principal.
  const indice = iParam === null ? 0 : Number(iParam.trim() || NaN);
  if (!Number.isInteger(indice) || indice < 0) {
    return new Response("imagem não encontrada", { status: 404 });
  }

  const { grande, miniatura } = await getImagemProduto(id, {}, indice);

  const candidatas: { url: string; origem: "detalhe" | "listagem" }[] = [];
  if (grande) candidatas.push({ url: grande, origem: "detalhe" });
  if (miniatura) candidatas.push({ url: miniatura, origem: "listagem" });
  if (candidatas.length === 0) {
    return new Response("imagem não encontrada", { status: 404 });
  }

  for (const candidata of candidatas) {
    let upstream: Response;
    try {
      upstream = await fetch(candidata.url);
    } catch {
      if (candidata.origem === "detalhe") invalidarImagemGrande(id);
      continue;
    }
    if (!upstream.ok) {
      if (candidata.origem === "detalhe") invalidarImagemGrande(id);
      continue;
    }

    // Hardening: as imagens "externas" do detalhe são URLs arbitrárias
    // cadastradas no ERP. Nunca repassamos um Content-Type não-imagem cru
    // (evita servir HTML de terceiro sob o nosso domínio) e sempre enviamos
    // nosniff.
    const tipoUpstream =
      upstream.headers.get("content-type")?.toLowerCase() ?? "";
    const tipoSeguro = tipoUpstream.startsWith("image/")
      ? tipoUpstream
      : "image/jpeg";

    return new Response(upstream.body, {
      headers: {
        "Content-Type": tipoSeguro,
        "X-Content-Type-Options": "nosniff",
        // Fallback (miniatura borrada) expira rápido para o browser re-tentar.
        "Cache-Control":
          candidata.origem === "detalhe"
            ? "public, max-age=300"
            : "public, max-age=60",
      },
    });
  }

  return new Response("imagem indisponível", { status: 502 });
}
