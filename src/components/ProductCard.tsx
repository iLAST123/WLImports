"use client";

import type { Produto } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ProductCard({ produto }: { produto: Produto }) {
  const inicial = produto.nome.trim().charAt(0).toUpperCase() || "W";

  // Card não-interativo: sem tabIndex — não deve criar parada de tab para
  // teclado. Se um dia virar link para página de produto, promover o wrapper
  // a <a> e reintroduzir focus-visible.
  return (
    <article className="group flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-gold/40">
      {/* Mídia */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-background">
        {produto.imagemURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemURL}
            alt={produto.nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-background transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          >
            <span className="text-gold-gradient select-none font-serif text-7xl font-semibold opacity-80">
              {inicial}
            </span>
          </div>
        )}
        {produto.categoria && (
          <span className="absolute left-3 top-3 rounded-full border border-gold/30 bg-background/70 px-3 py-1 font-sans text-[0.65rem] uppercase tracking-[0.18em] text-champagne backdrop-blur-sm">
            {produto.categoria}
          </span>
        )}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg leading-snug text-foreground">
          {produto.nome}
        </h3>
        {produto.descricaoCurta && (
          <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-muted">
            {produto.descricaoCurta}
          </p>
        )}
        <p className="mt-4 font-sans text-base font-medium text-gold">
          {typeof produto.preco === "number"
            ? brl.format(produto.preco)
            : "Sob consulta"}
        </p>
      </div>
    </article>
  );
}
