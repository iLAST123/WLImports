"use client";

import { useEffect, useRef, useState } from "react";
import { useCarrinho } from "@/lib/carrinho";
import type { Produto } from "@/lib/types";
import { precoDoProduto } from "./preco";

const QTD_MIN = 1;
const QTD_MAX = 99;
const FEEDBACK_MS = 1500;

/**
 * Ação de compra da PDP: quantidade + adicionar à sacola.
 *
 * O COMPORTAMENTO é o mesmo desde a DEC-004 (adiciona, abre o drawer, dá
 * feedback por 1,5s); o que mudou foi a pele e o escopo — nome, preço e texto
 * editorial saíram daqui e passaram a ser renderizados no servidor pela ficha
 * (`app/produto/[id]/page.tsx`), na ordem observada na Aesop (§7). Este
 * componente é client só porque precisa de estado e do contexto do carrinho;
 * quanto menos ele carregar, menor o JS da rota.
 *
 * Regra de domínio preservada: `consultar: true` = produto SEM preço no ERP →
 * o rótulo do CTA muda, o comportamento não (o item entra na sacola e o valor
 * é confirmado no atendimento).
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

  const { semPreco } = precoDoProduto(produto);
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
    <div>
      {/* Quantidade */}
      <div className="flex items-center gap-4">
        <span id="rotulo-quantidade" className="font-sans text-xs text-muted">
          Quantidade
        </span>
        {/* border-muted, não border-border: aqui a borda é a ÚNICA pista de
            que isto é um controle (contrato do globals.css, item 5). */}
        <div
          role="group"
          aria-labelledby="rotulo-quantidade"
          className="flex items-center border border-muted"
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
            className="min-w-10 select-none text-center font-sans text-sm text-foreground"
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

      {/* CTA — o "botão escuro" da página clara: bg-foreground + text-background
          (12,96:1). Retangular, sem raio, sentence case. */}
      <button
        type="button"
        onClick={handleAdicionar}
        className="mt-6 w-full bg-foreground px-8 py-3.5 font-sans text-sm font-medium text-background transition-colors duration-500 ease-lux hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
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

      <p className="mt-4 max-w-sm font-sans text-xs leading-relaxed text-muted">
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
      className="px-3.5 py-2.5 font-sans text-base leading-none text-foreground transition-colors duration-300 ease-lux hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:text-muted/40 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}
