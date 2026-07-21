"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import GradeProdutos from "@/components/catalogo/GradeProdutos";
import {
  EstadoErro,
  EstadoVazio,
  GradeEsqueleto,
} from "@/components/catalogo/estados";
import { useProdutos } from "@/components/catalogo/useProdutos";

/** Prévia: o catálogo inteiro mora em `/catalogo`. */
const ITENS_PREVIA = 8;

const GRADE = "md:grid-cols-4";

/**
 * Prévia do catálogo na home — ESCURA, coerente com o hero.
 *
 * Deixou de ser o catálogo inteiro: busca, filtro, ordenação e a grade densa
 * vivem na PLP dedicada (`/catalogo`). Aqui ficam 8 peças e um convite. A
 * lógica de carga é a mesma (`useProdutos`), não duplicada.
 *
 * A âncora `#catalogo` é PRESERVADA: o botão do Hero (`lenis.scrollTo`), o
 * drawer do carrinho, o checkout e o 404 de produto apontam para cá.
 */
export default function Catalog() {
  const { status, produtos, recarregar } = useProdutos();
  const previa = produtos.slice(0, ITENS_PREVIA);

  return (
    <section id="catalogo" className="w-full bg-background px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-xs text-gold">Catálogo</p>
            <h2 className="mt-3 max-w-xl font-serif text-[1.75rem] font-normal leading-[1.2] text-foreground sm:text-[1.875rem]">
              Fragrâncias em curadoria
            </h2>
            <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-muted">
              Uma seleção viva de perfumes importados e decants de nicho.
              Encontre a sua assinatura.
            </p>
          </div>

          <Link
            href="/catalogo"
            className="group inline-flex shrink-0 items-center font-sans text-sm text-foreground transition-colors duration-300 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pb-1"
          >
            Ver o catálogo completo{" "}
            <span
              aria-hidden="true"
              className="ml-2 inline-block motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-lux motion-safe:group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Reveal>

        <div className="mt-12">
          {status === "loading" && (
            <GradeEsqueleto itens={ITENS_PREVIA} className={GRADE} />
          )}
          {status === "error" && <EstadoErro onRetry={recarregar} />}
          {status === "ready" && produtos.length === 0 && <EstadoVazio />}
          {status === "ready" && previa.length > 0 && (
            <GradeProdutos produtos={previa} className={GRADE} />
          )}
        </div>
      </div>
    </section>
  );
}
