import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getProdutos } from "@/lib/bling";
import { SITE_URL, urlProduto } from "@/lib/urls";

/**
 * Sitemap: home, `/catalogo` e TODOS os produtos com URL canônica (`slug-id`).
 *
 * `sitemap.ts` é cacheado por padrão no Next 16 — o que congelaria o mock de um
 * build com env vazias. `connection()` (Request-time API) opta a rota para
 * avaliação em RUNTIME, resolvendo `getProdutos()` a cada request. Zero chamada
 * nova ao Bling: reusa o Data Cache 600s da listagem.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const { produtos } = await getProdutos();
  const agora = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: agora,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalogo`,
      lastModified: agora,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...produtos.map((p) => ({
      url: urlProduto(p.nome, p.id),
      lastModified: agora,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
