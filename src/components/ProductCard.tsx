"use client";

import { useState } from "react";
import Link from "next/link";
import type { Produto } from "@/lib/types";

export default function ProductCard({ produto }: { produto: Produto }) {
  const inicial = produto.nome.trim().charAt(0).toUpperCase() || "W";

  // A imagem vem de `/api/imagem` (proxy da URL assinada, que pode caducar).
  // Se falhar, caímos no placeholder de inicial serif — nunca imagem quebrada.
  const [erroImagem, setErroImagem] = useState(false);
  const mostrarImagem = Boolean(produto.imagemURL) && !erroImagem;

  // O card inteiro é o link para a PDP (uma única parada de tab, sem elemento
  // interativo aninhado dentro do <a> — o "Ver produto →" é texto, não botão).
  // O anel dourado de foco vive no <Link>, como o card não-interativo previa.
  return (
    <Link
      href={`/produto/${produto.id}`}
      // Sem aria-label: o nome acessível vem do próprio conteúdo (nome →
      // descrição → preço), que é mais informativo do que um rótulo genérico.
      className="group flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Mídia */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-background">
        {mostrarImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemURL}
            alt={produto.nome}
            loading="lazy"
            onError={() => setErroImagem(true)}
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
          {produto.precoFormatado ?? "Sob consulta"}
        </p>
        <span
          aria-hidden="true"
          className="mt-auto pt-5 font-sans text-xs uppercase tracking-[0.2em] text-muted/70 transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-gold group-focus-visible:text-gold"
        >
          Ver produto{" "}
          <span className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
