"use client";

import { useCarrinho } from "@/lib/carrinho";

/**
 * Gatilho do drawer da sacola. O badge só aparece com itens — no primeiro
 * render (antes da hidratação do localStorage) `totalItens` é 0, então o
 * markup do servidor e do cliente batem.
 */
export default function CartButton() {
  const { totalItens, aberto, abrir } = useCarrinho();

  const rotulo =
    totalItens > 0
      ? `Abrir carrinho, ${totalItens} ${totalItens === 1 ? "item" : "itens"}`
      : "Abrir carrinho, vazio";

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={rotulo}
      aria-haspopup="dialog"
      aria-expanded={aberto}
      className="relative -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground/90 outline-none transition-colors duration-300 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Sacola — SVG inline, sem lib de ícone. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[22px] w-[22px]"
      >
        <path d="M6 7h12l1.2 12.2a1.5 1.5 0 0 1-1.5 1.65H6.3a1.5 1.5 0 0 1-1.5-1.65L6 7Z" />
        <path d="M9 9.5V6.6a3 3 0 0 1 6 0v2.9" />
      </svg>

      {totalItens > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-1 min-w-[18px] rounded-full bg-gold px-1 text-center font-sans text-[0.625rem] font-semibold leading-[18px] text-background"
        >
          {totalItens > 99 ? "99+" : totalItens}
        </span>
      )}
    </button>
  );
}
