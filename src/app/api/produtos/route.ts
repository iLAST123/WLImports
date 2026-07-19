import { NextResponse } from "next/server";
import { getProdutos } from "@/lib/bling";

// Dinâmica DE PROPÓSITO: com `revalidate` de rota, o handler seria
// prerenderizado no build — e um build sem credenciais congelaria o mock por
// até 600s mesmo com as env vars presentes em runtime. O cache correto vive no
// fetch das páginas do Bling (`next: { revalidate: 600 }` em src/lib/bling.ts);
// o caminho mock é instantâneo.
export const dynamic = "force-dynamic";

// Credenciais do Bling vivem só aqui, no servidor — nunca no client.
export async function GET() {
  return NextResponse.json(await getProdutos());
}
