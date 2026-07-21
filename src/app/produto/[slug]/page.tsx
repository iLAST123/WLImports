import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { getProdutoDetalhe } from "@/lib/bling";
import { separarVolume } from "@/lib/produto-formato";
import { SITE_URL, caminhoProduto, urlProduto } from "@/lib/urls";
import { extrairIdDeSlug, montarSlugProduto } from "@/lib/slug";
import Footer from "@/components/sections/Footer";
import SuperficieLoja from "@/components/loja/SuperficieLoja";
import Galeria from "@/components/produto/Galeria";
import BlocoCompra from "@/components/produto/BlocoCompra";
import Acordeao, { type SecaoAcordeao } from "@/components/produto/Acordeao";
import { precoDoProduto } from "@/components/produto/preco";

// Renderização DINÂMICA por request via `connection()` (idioma do Next 16 que
// substitui `unstable_noStore`; sem a flag `cacheComponents`, é o preferido ao
// `export const dynamic = "force-dynamic"`, hoje deprecado). Sem isso, um build
// com env vazias congelaria o caminho mock no HTML. O cache real de dados vive
// no fetch do Bling (`next: { revalidate: 600 }` em lib/bling.ts) — zero
// chamada nova ao Bling por request.

type Params = { params: Promise<{ slug: string }> };

function truncar(texto: string, limite = 155): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const id = extrairIdDeSlug(slug);
  if (id === null) return { title: "Produto não encontrado — WLimports" };

  const { produto } = await getProdutoDetalhe(id);
  if (!produto) return { title: "Produto não encontrado — WLimports" };

  const descricao = truncar(
    produto.descricao ??
      produto.descricaoCurta ??
      `${produto.nome} na curadoria WLimports: perfume importado original, com autenticidade garantida e envio seguro.`,
  );

  // Canonical SEMPRE aponta ao slug canônico, independente do param recebido
  // (id legado ou slug desatualizado consolidam neste endereço). Absoluto via
  // SITE_URL; `metadataBase` (layout) cobre o OG relativo.
  const canonical = urlProduto(produto.nome, id);

  return {
    title: `${produto.nome} — WLimports`,
    description: descricao,
    alternates: { canonical },
    openGraph: {
      title: `${produto.nome} — WLimports`,
      description: descricao,
      url: canonical,
      type: "website",
      images: produto.imagens.length > 0 ? [produto.imagens[0]] : undefined,
    },
  };
}

/**
 * Ficha de produto — ordem observada na Aesop (`referencias-aesop.md` §7):
 * breadcrumb → nome → volume → preço → lede sensorial → badge/notas → compra →
 * acordeão → faixa de confiança.
 *
 * ⚠️ Esta tela tem DOIS estados de primeira classe (§9):
 *
 * - **cheia** (mock): lede + notas + destaque + galeria com miniaturas + acordeão;
 * - **magra** (Bling real, que é o caso de 100% do catálogo hoje): nome, volume,
 *   preço, UMA imagem, quantidade + botão, faixa de confiança. **E mais nada.**
 *
 * A regra é a mesma para todo bloco: **sem dado, o bloco inteiro não é
 * renderizado** — nem título órfão, nem placeholder, nem "descrição não
 * disponível". A coluna direita simplesmente termina mais cedo; o equilíbrio no
 * estado magro vem da composição (largura da coluna, plate 4/5, respiro), nunca
 * de texto de enchimento.
 */
export default async function PaginaProduto({ params }: Params) {
  await connection();

  const { slug } = await params;
  const id = extrairIdDeSlug(slug);
  if (id === null) notFound();

  const { produto } = await getProdutoDetalhe(id);
  if (!produto) notFound();

  // Consolidação de URL: se o param recebido não é o slug canônico — cobre o
  // legado só-dígitos (`/produto/123`) E o slug desatualizado por rename no ERP
  // — redireciona PERMANENTEMENTE (308) para a URL canônica. `notFound`/
  // `permanentRedirect` lançam, então ficam antes de qualquer render.
  const slugCanonico = montarSlugProduto(produto.nome, id);
  if (slug !== slugCanonico) {
    permanentRedirect(caminhoProduto(produto.nome, id));
  }

  // ── JSON-LD Product (SEO). Imagens em URL ABSOLUTA (proxy `/api/imagem` via
  // SITE_URL). `offers` só quando há preço válido — "Sob consulta" fica SEM
  // offers, jamais preço 0. Sem brand/rating/review inventados. Nome vem do
  // ERP (não confiável) → escape de `<` no serialize.
  const canonical = urlProduto(produto.nome, id);

  // Volume não é campo do ERP: ele já vive dentro do nome ("… 100ml") e é só
  // SEPARADO (produto-formato.ts). Quando a extração não tem confiança, o nome
  // volta intacto e `volume` é undefined — e a linha some.
  const { nome, volume } = separarVolume(produto.nome);
  const { semPreco, texto: preco } = precoDoProduto(produto);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.nome,
    url: canonical,
  };
  if (produto.imagens.length > 0) {
    jsonLd.image = produto.imagens.map((src) => `${SITE_URL}${src}`);
  }
  if (produto.descricao) jsonLd.description = produto.descricao;
  if (!semPreco && typeof produto.preco === "number") {
    jsonLd.offers = {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: produto.preco,
      availability: "https://schema.org/InStock",
      url: canonical,
    };
  }

  // Descrição rica quando existe; senão a curta; senão nada.
  const paragrafos = (produto.descricao ?? produto.descricaoCurta ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  // O 1º parágrafo é o LEDE (fica solto, com respiro, logo abaixo do preço — a
  // assinatura editorial da Aesop). O resto vai para o acordeão. Com um único
  // parágrafo não há acordeão nenhum: ele já foi dito por inteiro no lede.
  const [lede, ...restante] = paragrafos;
  const secoes: SecaoAcordeao[] =
    restante.length > 0
      ? [{ id: "descricao", titulo: "Descrição", paragrafos: restante }]
      : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SuperficieLoja className="px-6 pb-24 pt-28 sm:pt-32">
        <div className="mx-auto w-full max-w-5xl">
          <nav aria-label="Você está em" className="mb-10 sm:mb-14">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-muted">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-300 ease-lux hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  Início
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/catalogo"
                  className="transition-colors duration-300 ease-lux hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
                >
                  Catálogo
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              {/* min-w-0 + break-words: nome longo do ERP não pode furar o
                  container em 390px. */}
              <li aria-current="page" className="min-w-0 break-words text-foreground">
                {nome}
              </li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
            <Galeria imagens={produto.imagens} nome={produto.nome} />

            <div className="lg:pt-1">
              <h1 className="break-words font-serif text-[1.625rem] font-normal leading-tight text-foreground sm:text-3xl">
                {nome}
              </h1>

              {volume && (
                <p className="mt-2 font-sans text-sm text-muted">
                  <span className="sr-only">Volume: </span>
                  {volume}
                </p>
              )}

              <p className="mt-5 font-sans text-base font-medium text-foreground">
                {preco}
              </p>
              {semPreco && (
                <p className="mt-2 max-w-sm font-sans text-xs leading-relaxed text-muted">
                  Este item não tem preço publicado. Adicione à sacola e o valor
                  será confirmado com você no atendimento, sem compromisso.
                </p>
              )}

              {/*
                Lede sensorial. Texto PURO vindo do ERP, renderizado como nó de
                texto do React — `dangerouslySetInnerHTML` é proibido nesta
                superfície (DEC-004 §2).
              */}
              {lede && (
                <p className="mt-6 max-w-prose font-sans text-sm leading-relaxed text-muted">
                  {lede}
                </p>
              )}

              {/* Exclusivos do mock: o Bling não expõe nenhum dos dois. */}
              {produto.destaque && (
                <p className="mt-6 font-sans text-xs text-gold">
                  {produto.destaque}
                </p>
              )}
              {produto.notas && (
                <p className="mt-2 font-sans text-sm text-muted">
                  <span className="sr-only">Notas: </span>
                  {produto.notas}
                </p>
              )}

              <div className="mt-10">
                <BlocoCompra produto={produto} />
              </div>

              {/* Sem seção não há acordeão — nem o espaçamento dele. A coluna
                  simplesmente termina no botão de compra. */}
              {secoes.length > 0 && (
                <div className="mt-12">
                  <Acordeao secoes={secoes} />
                </div>
              )}
            </div>
          </div>

          {/* Faixa de confiança — conteúdo nosso, verdadeiro. */}
          <section
            aria-label="Nossos compromissos"
            className="mt-24 grid grid-cols-1 gap-8 border-t border-border pt-10 sm:grid-cols-3 sm:gap-10"
          >
            {[
              {
                titulo: "Autenticidade garantida",
                texto:
                  "Originais e lacrados, com procedência verificada item a item.",
              },
              {
                titulo: "Envio seguro",
                texto:
                  "Embalagem protegida e rastreio do envio até a sua porta.",
              },
              {
                titulo: "Curadoria",
                texto:
                  "Uma seleção enxuta de alta perfumaria — nada entra por acaso.",
              },
            ].map((item) => (
              <div key={item.titulo}>
                <p className="font-sans text-sm font-medium text-foreground">
                  {item.titulo}
                </p>
                <p className="mt-2 max-w-xs font-sans text-sm leading-relaxed text-muted">
                  {item.texto}
                </p>
              </div>
            ))}
          </section>
        </div>
      </SuperficieLoja>

      {/* Fora da superfície clara de propósito: o rodapé é território da marca
          (escuro), como na Aesop. */}
      <Footer />
    </>
  );
}
