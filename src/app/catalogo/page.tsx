import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/sections/Footer";
import SuperficieLoja from "@/components/loja/SuperficieLoja";
import CapaCatalogo from "@/components/catalogo/CapaCatalogo";
import CatalogoCliente from "@/components/catalogo/CatalogoCliente";

export const metadata: Metadata = {
  title: "Catálogo — WLimports",
  description:
    "Perfumes importados originais e decants de nicho na curadoria WLimports. Autenticidade garantida e envio seguro.",
};

/**
 * PLP dedicada (referencias-aesop.md §3, §4, §6).
 *
 * Estrutura, de cima para baixo:
 *   [header creme, fixo — o padding do topo reserva a faixa dele]
 *   1. capa editorial escura full-bleed  ← a costura escuro→claro
 *   2. breadcrumb discreto
 *   3. barra de ferramentas tingida (busca · contagem · ordenação · categorias)
 *   4. grade densa: 4 colunas em desktop, 3 em tablet, 2 em mobile
 *   [rodapé escuro, FORA da superfície clara — fecha a página no preto da marca]
 *
 * A página é estática: o catálogo é buscado UMA vez no cliente, pelo mesmo
 * `/api/produtos` que a home já usa. Nenhuma chamada nova ao Bling.
 */
export default function PaginaCatalogo() {
  return (
    <>
      <SuperficieLoja className="pt-16 sm:pt-20">
        <CapaCatalogo />

        <div className="mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
          <nav aria-label="Você está em">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-muted">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-300 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Início
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted/60">
                /
              </li>
              <li aria-current="page" className="text-foreground">
                Catálogo
              </li>
            </ol>
          </nav>
        </div>

        <CatalogoCliente />
      </SuperficieLoja>

      {/*
        O rodapé fica FORA de <SuperficieLoja> de propósito: sem o
        `data-superficie="clara"` de ancestral ele volta aos tokens de :root e
        renderiza no preto quente da marca. É o espelho da capa — a página
        clara abre e fecha em escuro.
      */}
      <Footer />
    </>
  );
}
