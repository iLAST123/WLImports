"use client";

import { useState } from "react";
import Link from "next/link";
import { separarVolume } from "@/lib/produto-formato";
import type { Produto } from "@/lib/types";

/**
 * Card do catálogo — anatomia observada na Aesop (referencias-aesop.md §4):
 * plate tingido → tag editorial → nome (pequeno e pesado) → notas → volume →
 * preço → CTA. **Sem borda, sem raio, sem sombra**: a densidade vem do tipo
 * pequeno e do gap generoso, não de moldura (§3).
 *
 * DEGRADAÇÃO HONESTA (§9). O dado real do Bling tem só nome + preço + 1
 * imagem; `notas` e `destaque` só existem no mock. Cada linha some INTEIRA
 * quando falta dado — sem título órfão, sem placeholder, sem "não informado".
 * O card degradado (`imagem · nome · preço · CTA`) precisa ficar proposital,
 * não amputado: por isso nada aqui tem altura fixa e o CTA é empurrado para a
 * base com `mt-auto`, o que mantém a linha do grid alinhada mesmo com cards de
 * conteúdo desigual.
 *
 * LINK vs. BOTÃO. A Aesop põe "Add to cart" dentro do card; aqui o card
 * continua sendo UM ÚNICO <Link> com CTA TEXTUAL. Motivos, nesta ordem:
 * (1) botão dentro de <a> é HTML inválido e quebra a navegação por teclado;
 * (2) a alternativa (link no nome + botão irmão) exigiria overlay
 *     `stretched-link`, dobrando as paradas de tab em uma grade de 100+ itens;
 * (3) sem tamanho/variante no dado, comprar direto da grade esconderia do
 *     cliente a única tela onde a informação de compra existe (a PDP).
 * Acessibilidade vence estética.
 *
 * Só tokens semânticos: o mesmo card serve a prévia ESCURA da home e a PLP
 * CLARA sem uma condicional de cor.
 */
export default function ProductCard({ produto }: { produto: Produto }) {
  // A imagem vem de `/api/imagem` (proxy da URL assinada, que pode caducar).
  // Se falhar, caímos no monograma serif — nunca imagem quebrada.
  const [erroImagem, setErroImagem] = useState(false);
  const mostrarImagem = Boolean(produto.imagemURL) && !erroImagem;

  // O volume é o único campo "rico" recuperável do dado real: ele já vive
  // dentro do nome. Aqui só SEPARAMOS — se não houver casamento confiável, o
  // nome volta intacto e a linha de volume não é renderizada.
  const { nome, volume } = separarVolume(produto.nome);
  const inicial = nome.trim().charAt(0).toUpperCase() || "W";

  return (
    <Link
      href={`/produto/${produto.id}`}
      // Sem aria-label: o nome acessível vem do conteúdo (nome → notas →
      // volume → preço), mais informativo que um rótulo genérico.
      className="group flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Plate de imagem tingida — a foto senta num retângulo `bg-surface`,
          não no fundo da página (§1). */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
        {mostrarImagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemURL}
            alt={produto.nome}
            loading="lazy"
            onError={() => setErroImagem(true)}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-lux motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-lux motion-safe:group-hover:scale-[1.03]"
          >
            <span className="text-gold-gradient select-none font-serif text-5xl opacity-80">
              {inicial}
            </span>
          </div>
        )}

        {/* Tag editorial — só o mock preenche `destaque`; produto real nunca. */}
        {produto.destaque && (
          <span className="absolute left-0 top-0 bg-background/85 px-2 py-1 font-sans text-xs text-gold">
            {produto.destaque}
          </span>
        )}
      </div>

      {/* Nome: 14px, peso alto, entrelinha apertada, sentence case (§2.5).
          `font-semibold` (600) e não `font-bold`: o Manrope carregado no
          layout tem 400/500/600 — pedir 700 só produziria negrito sintético. */}
      <h3 className="mt-4 break-words font-sans text-sm font-semibold leading-[1.15] text-foreground transition-colors duration-300 group-hover:text-gold">
        {nome}
      </h3>

      {produto.notas && (
        <p className="mt-1.5 font-sans text-sm leading-snug text-muted">
          {produto.notas}
        </p>
      )}

      {volume && (
        <p className="mt-1 font-sans text-xs text-muted">{volume}</p>
      )}

      {/* Preço 0/ausente já chega como `consultar` do servidor — jamais
          "R$ 0,00". */}
      <p className="mt-2 font-sans text-sm text-foreground">
        {produto.precoFormatado ?? "Sob consulta"}
      </p>

      <span
        aria-hidden="true"
        className="mt-auto pt-4 font-sans text-xs text-muted transition-colors duration-300 group-hover:text-gold group-focus-visible:text-gold"
      >
        Ver detalhes{" "}
        <span className="inline-block motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-lux motion-safe:group-hover:translate-x-1">
          →
        </span>
      </span>
    </Link>
  );
}
