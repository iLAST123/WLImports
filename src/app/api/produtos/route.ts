import { NextResponse } from "next/server";
import { getProdutos } from "@/lib/bling";

// Cache no nível da rota alinhado ao revalidate do fetch do Bling.
export const revalidate = 600;

// Credenciais do Bling vivem só aqui, no servidor — nunca no client.
export async function GET() {
  return NextResponse.json(await getProdutos());
}
