import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProdutoDetalhe } from "@/lib/bling";
import Footer from "@/components/sections/Footer";
import Galeria from "@/components/produto/Galeria";
import BlocoCompra from "@/components/produto/BlocoCompra";

// Dinâmica DE PROPÓSITO — mesmo motivo documentado em
// `src/app/api/produtos/route.ts`: prerenderizar congelaria o caminho mock de
// um build sem credenciais, mesmo com as env vars presentes em runtime. O
// cache real vive no fetch do Bling (`next: { revalidate }` em lib/bling.ts).
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Aceita só id inteiro positivo; qualquer outra coisa é 404, não erro 500. */
function parseId(bruto: string): number | null {
  const id = Number(bruto);
  if (!bruto.trim() || !Number.isInteger(id) || id <= 0) return null;
  return id;
}

function truncar(texto: string, limite = 155): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id: bruto } = await params;
  const id = parseId(bruto);
  if (id === null) return { title: "Produto não encontrado — WLimports" };

  const { produto } = await getProdutoDetalhe(id);
  if (!produto) return { title: "Produto não encontrado — WLimports" };

  const descricao = truncar(
    produto.descricao ??
      produto.descricaoCurta ??
      `${produto.nome} na curadoria WLimports: perfume importado original, com autenticidade garantida e envio seguro.`,
  );

  return {
    title: `${produto.nome} — WLimports`,
    description: descricao,
    openGraph: {
      title: `${produto.nome} — WLimports`,
      description: descricao,
      type: "website",
      images: produto.imagens.length > 0 ? [produto.imagens[0]] : undefined,
    },
  };
}

export default async function PaginaProduto({ params }: Params) {
  const { id: bruto } = await params;
  const id = parseId(bruto);
  if (id === null) notFound();

  const { produto } = await getProdutoDetalhe(id);
  if (!produto) notFound();

  // Descrição rica quando existe; senão a curta; senão o bloco some inteiro —
  // sem título órfão e sem texto de enchimento.
  const textoDescricao = produto.descricao ?? produto.descricaoCurta;
  const paragrafos = (textoDescricao ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="flex flex-1 flex-col">
      <div className="w-full px-6 pb-20 pt-28 sm:pt-32">
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb discreto */}
          <nav aria-label="Você está em" className="mb-10">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs uppercase tracking-[0.18em] text-muted">
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Início
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">
                /
              </li>
              <li>
                <Link
                  href="/#catalogo"
                  className="transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Catálogo
                </Link>
              </li>
              <li aria-hidden="true" className="text-border">
                /
              </li>
              {/* min-w-0 + break-words: nome longo do ERP não pode furar o
                  container em 390px. */}
              <li
                aria-current="page"
                className="min-w-0 break-words normal-case tracking-normal text-champagne/80"
              >
                {produto.nome}
              </li>
            </ol>
          </nav>

          {/* Galeria + compra */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
            <Galeria imagens={produto.imagens} nome={produto.nome} />
            <BlocoCompra produto={produto} />
          </div>

          {/* Descrição */}
          {paragrafos.length > 0 && (
            <section
              aria-labelledby="titulo-descricao"
              className="mt-24 max-w-2xl border-t border-border pt-12"
            >
              <h2
                id="titulo-descricao"
                className="font-sans text-xs uppercase tracking-[0.32em] text-gold"
              >
                Sobre a fragrância
              </h2>
              <div className="mt-6 space-y-5">
                {/*
                  Texto PURO vindo do ERP — renderizado como nós de texto do
                  React. Nunca dangerouslySetInnerHTML: conteúdo de terceiro
                  não é confiável.
                */}
                {paragrafos.map((paragrafo, i) => (
                  <p
                    key={i}
                    className="font-sans text-base leading-relaxed text-muted"
                  >
                    {paragrafo}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Faixa de confiança */}
          <section
            aria-label="Nossos compromissos"
            className="mt-24 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3"
          >
            {[
              {
                titulo: "Autenticidade garantida",
                texto: "Originais e lacrados, com procedência verificada item a item.",
              },
              {
                titulo: "Envio seguro",
                texto: "Embalagem protegida e rastreio do envio até a sua porta.",
              },
              {
                titulo: "Curadoria",
                texto: "Uma seleção enxuta de alta perfumaria — nada entra por acaso.",
              },
            ].map((item) => (
              <div key={item.titulo} className="bg-surface px-6 py-8">
                <p className="font-serif text-lg text-foreground">{item.titulo}</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                  {item.texto}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}
