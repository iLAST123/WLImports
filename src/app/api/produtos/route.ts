import { NextResponse } from "next/server";
import { getProdutos } from "@/lib/bling";

// Credenciais do Bling vivem só aqui, no servidor — nunca no client.
export async function GET() {
  return NextResponse.json(await getProdutos());
}
