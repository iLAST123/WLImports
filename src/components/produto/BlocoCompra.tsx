"use client";

import { useEffect, useRef, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import type { Produto } from "@/lib/types";

const QTD_MIN = 1;
const QTD_MAX = 99;
const FEEDBACK_MS = 1500;

/**
 * Coluna de compra da PDP.
 *
 * Regra de domínio: `consultar: true` = produto SEM preço cadastrado no ERP.
 * Nunca exibir "R$ 0,00" — vira "Sob consulta" e o CTA muda de rótulo, mas o
 * comportamento é o mesmo (o item entra na sacola sem preço e o valor é
 * confirmado no atendimento).
 */
export default function BlocoCompra({ produto }: { produto: Produto }) {
  const { adicionar, abrir } = useCarrinho();
  const [quantidade, setQuantidade] = useState(QTD_MIN);
  const [adicionado, setAdicionado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Um único cleanup para o timeout: o componente pode sair da árvore enquanto
  // o feedback ainda está no ar.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const semPreco = produto.consultar === true || !produto.precoFormatado;
  const rotuloBase = semPreco ? "Consultar disponibilidade" : "Adicionar à sacola";

  const ajustar = (delta: number) =>
    setQuantidade((q) => Math.min(QTD_MAX, Math.max(QTD_MIN, q + delta)));

  const handleAdicionar = () => {
    adicionar(produto, quantidade);
    abrir();
    setAdicionado(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdicionado(false), FEEDBACK_MS);
  };

  return (
    <div className="lg:sticky lg:top-24">
      {produto.categoria && (
        <p className="font-sans text-xs uppercase tracking-[0.28em] text-gold">
          {produto.categoria}
        </p>
      )}

      <h1 className="mt-3 break-words font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        {produto.nome}
      </h1>

      {produto.descricaoCurta && (
        <p className="mt-4 max-w-prose font-sans text-sm leading-relaxed text-muted">
          {produto.descricaoCurta}
        </p>
      )}

      <div className="mt-8 border-t border-border pt-8">
        <p className="font-sans text-2xl font-medium text-gold">
          {semPreco ? "Sob consulta" : produto.precoFormatado}
        </p>
        {semPreco && (
          <p className="mt-2 max-w-sm font-sans text-xs leading-relaxed text-muted">
            Este item não tem preço publicado. Adicione à sacola e o valor será
            confirmado com você no atendimento, sem compromisso.
          </p>
        )}
      </div>

      {/* Quantidade */}
      <div className="mt-8 flex items-center gap-5">
        <span
          id="rotulo-quantidade"
          className="font-sans text-xs uppercase tracking-[0.22em] text-muted"
        >
          Quantidade
        </span>
        <div
          role="group"
          aria-labelledby="rotulo-quantidade"
          className="flex items-center border border-border"
        >
          <BotaoQtd
            rotulo="Diminuir quantidade"
            onClick={() => ajustar(-1)}
            desabilitado={quantidade <= QTD_MIN}
          >
            −
          </BotaoQtd>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="min-w-12 select-none text-center font-sans text-base text-foreground"
          >
            {quantidade}
            <span className="sr-only"> unidades</span>
          </span>
          <BotaoQtd
            rotulo="Aumentar quantidade"
            onClick={() => ajustar(1)}
            desabilitado={quantidade >= QTD_MAX}
          >
            +
          </BotaoQtd>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleAdicionar}
        className="mt-8 w-full bg-gold px-8 py-4 font-sans text-sm font-medium uppercase tracking-[0.18em] text-background transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {adicionado ? "Adicionado ✓" : rotuloBase}
      </button>

      {/* O rótulo do botão muda no lugar; leitores de tela não reagem a isso
          de forma confiável — daí a região viva dedicada. */}
      <p aria-live="polite" className="sr-only">
        {adicionado
          ? `${produto.nome} adicionado à sacola. Quantidade ${quantidade}.`
          : ""}
      </p>

      <p className="mt-4 font-sans text-xs leading-relaxed text-muted/80">
        Produto original, com procedência verificada. Você finaliza a compra
        pelo atendimento — nada é cobrado neste site.
      </p>
    </div>
  );
}

function BotaoQtd({
  rotulo,
  onClick,
  desabilitado,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      className="px-4 py-3 font-sans text-lg leading-none text-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:text-muted/40"
    >
      {children}
    </button>
  );
}
