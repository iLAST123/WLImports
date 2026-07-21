// Ponto ÚNICO de montagem de URL de produto (DEC-006 §4). Tudo que aponta para
// `/produto/…` — links internos, `alternates.canonical`, JSON-LD, sitemap —
// passa por aqui, para que o formato canônico `slug-id` nunca divirja entre
// duas telas.

import { montarSlugProduto } from "./slug";

/**
 * Origem absoluta do site, sem barra final. `NEXT_PUBLIC_*` é inlined no build
 * (público por definição — nenhum segredo aqui). O fallback é o domínio de
 * produção na Vercel, para que canonical/sitemap tenham URL absoluta mesmo se a
 * env não estiver setada.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wl-imports.vercel.app"
).replace(/\/+$/, "");

/** Caminho RELATIVO canônico do produto — usado em `<Link>` interno. */
export function caminhoProduto(nome: string, id: number): string {
  return `/produto/${montarSlugProduto(nome, id)}`;
}

/** URL ABSOLUTA canônica do produto — usada em canonical, JSON-LD e sitemap. */
export function urlProduto(nome: string, id: number): string {
  return `${SITE_URL}${caminhoProduto(nome, id)}`;
}
