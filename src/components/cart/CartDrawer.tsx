"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLenis } from "lenis/react";
import { ehSobConsulta, useCarrinho, type ItemCarrinho } from "@/lib/carrinho";

const EASE = [0.22, 1, 0.36, 1] as const;

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/* -------------------------------------------------------------------------- */

function Thumb({ item }: { item: ItemCarrinho }) {
  // Mesmo contrato do ProductCard: URL assinada pode caducar → cai na inicial.
  const [erro, setErro] = useState(false);
  const mostrar = Boolean(item.imagemURL) && !erro;
  const inicial = item.nome.trim().charAt(0).toUpperCase() || "W";

  return (
    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-border bg-background">
      {mostrar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imagemURL}
          alt=""
          loading="lazy"
          onError={() => setErro(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface to-background"
        >
          <span className="text-gold-gradient select-none font-serif text-2xl font-semibold opacity-80">
            {inicial}
          </span>
        </div>
      )}
    </div>
  );
}

function LinhaItem({ item }: { item: ItemCarrinho }) {
  const { alterarQuantidade, remover } = useCarrinho();
  const sobConsulta = ehSobConsulta(item);

  return (
    <li className="flex gap-4 border-b border-border/70 py-5 first:pt-0">
      <Thumb item={item} />

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate font-serif text-base leading-snug text-foreground">
          {item.nome}
        </h3>
        <p className="mt-1 font-sans text-sm text-gold">
          {sobConsulta ? "Sob consulta" : item.precoFormatado ?? "Sob consulta"}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          {/* Stepper */}
          <div className="flex items-center rounded-sm border border-border">
            <button
              type="button"
              onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
              aria-label={`Diminuir quantidade de ${item.nome}`}
              className="flex h-9 w-9 items-center justify-center font-sans text-base text-muted outline-none transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"
            >
              &minus;
            </button>
            <span
              aria-live="polite"
              className="w-8 text-center font-sans text-sm tabular-nums text-foreground"
            >
              {item.quantidade}
            </span>
            <button
              type="button"
              onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
              aria-label={`Aumentar quantidade de ${item.nome}`}
              className="flex h-9 w-9 items-center justify-center font-sans text-base text-muted outline-none transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => remover(item.id)}
            aria-label={`Remover ${item.nome} da sacola`}
            className="rounded-sm font-sans text-xs uppercase tracking-[0.14em] text-muted outline-none transition-colors hover:text-champagne focus-visible:ring-2 focus-visible:ring-gold"
          >
            Remover
          </button>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

export default function CartDrawer() {
  const {
    itens,
    aberto,
    fechar,
    subtotalFormatado,
    temItemSobConsulta,
    totalItens,
  } = useCarrinho();
  const painelRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.activeElement as HTMLElement | null;
    painelRef.current?.focus();

    // Trava de scroll: body para o navegador, `lenis.stop()` porque o Lenis
    // escuta a roda no window e ignoraria o overflow do body.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar();
        return;
      }
      if (evento.key !== "Tab") return;

      const painel = painelRef.current;
      if (!painel) return;
      const focaveis = Array.from(
        painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)
      ).filter((el) => el.offsetParent !== null || el === painel);
      if (focaveis.length === 0) {
        evento.preventDefault();
        painel.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (evento.shiftKey && (ativo === primeiro || ativo === painel)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      lenis?.start();
      anterior?.focus?.();
    };
  }, [aberto, fechar, lenis]);

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[70]">
          {/* Overlay clicável — fora do trap de foco (o botão "fechar" do
              cabeçalho já cobre teclado e leitor de tela). */}
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={fechar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-0 h-full w-full cursor-default bg-background/80 backdrop-blur-sm"
          />

          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sua sacola"
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-gold/20 bg-surface shadow-2xl outline-none sm:w-[420px]"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
              <h2 className="font-serif text-xl tracking-wide text-foreground">
                Sua sacola
              </h2>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar carrinho"
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted outline-none transition-colors hover:text-gold focus-visible:ring-2 focus-visible:ring-gold"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  className="h-5 w-5"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Corpo */}
            <div
              data-lenis-prevent
              className="flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            >
              {itens.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <p className="font-serif text-lg text-champagne">
                    Sua sacola ainda está vazia.
                  </p>
                  <p className="mt-2 max-w-[26ch] font-sans text-sm leading-relaxed text-muted">
                    Os frascos que você escolher aparecem aqui.
                  </p>
                  <Link
                    href="/#catalogo"
                    onClick={fechar}
                    className="mt-6 rounded-sm border-b border-gold/40 pb-1 font-sans text-xs uppercase tracking-[0.2em] text-gold outline-none transition-colors hover:text-champagne focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    Explorar a curadoria
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {itens.map((item) => (
                    <LinhaItem key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>

            {/* Rodapé */}
            {itens.length > 0 && (
              <div className="border-t border-border px-5 py-5 sm:px-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-sans text-xs uppercase tracking-[0.2em] text-muted">
                    Subtotal
                  </span>
                  <span className="font-serif text-xl text-foreground">
                    {subtotalFormatado}
                  </span>
                </div>

                {temItemSobConsulta && (
                  <p className="mt-2 font-sans text-xs leading-relaxed text-muted">
                    O subtotal não inclui itens sob consulta — combinamos o valor
                    deles no atendimento.
                  </p>
                )}

                <Link
                  href="/checkout"
                  onClick={fechar}
                  className="mt-5 flex w-full items-center justify-center rounded-sm bg-gold px-6 py-3.5 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-background outline-none transition-colors duration-300 hover:bg-champagne focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  Finalizar compra
                </Link>

                <p className="mt-3 text-center font-sans text-[0.7rem] text-muted">
                  {totalItens} {totalItens === 1 ? "item" : "itens"} na sacola
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
