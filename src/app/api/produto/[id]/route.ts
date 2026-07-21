import { NextResponse } from "next/server";
import { getProdutoDetalhe } from "@/lib/bling";

// Dinâmica DE PROPÓSITO, mesmo motivo da rota da listagem
// (`src/app/api/produtos/route.ts`): com `revalidate` de rota o handler seria
// prerenderizado no BUILD, e um build sem credenciais congelaria o mock mesmo
// com as env vars presentes em runtime. O cache vive no fetch interno
// (`next: { revalidate: 600 }` em src/lib/bling.ts).
export const dynamic = "force-dynamic";

/**
 * `GET /api/produto/{id}` → `ProdutoDetalheResponse`.
 * Credenciais do Bling vivem só aqui, no servidor — nunca no client.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // No Next 16 o `params` de route handler é uma Promise.
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!idParam || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  const resposta = await getProdutoDetalhe(id);
  if (resposta.produto === null) {
    return NextResponse.json(
      { erro: "produto não encontrado", fonte: resposta.fonte },
      { status: 404 },
    );
  }

  return NextResponse.json(resposta);
}
