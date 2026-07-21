import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/urls";

/**
 * robots.txt: crawl liberado, exceto as rotas de API e o checkout (superfície
 * transacional, não indexável). Referencia o sitemap com a origem absoluta.
 *
 * Não precisa ser dinâmico: não depende de dado do Bling — só de `SITE_URL`,
 * que é `NEXT_PUBLIC_*` inlined no build. Sair estático é o comportamento
 * correto aqui.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/checkout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
