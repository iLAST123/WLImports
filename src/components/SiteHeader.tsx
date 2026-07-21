"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CartButton from "@/components/cart/CartButton";
import CartDrawer from "@/components/cart/CartDrawer";

const LIMIAR_SCROLL = 24;

/**
 * Header global. Sobre o hero full-bleed ele começa transparente e só ganha
 * fundo/blur/hairline depois de rolar — discreto por definição.
 * Listener nativo `passive` (não depende do Lenis) para não acoplar o header
 * ao smooth scroll, que é desligado sob prefers-reduced-motion.
 */
export default function SiteHeader() {
  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolado(window.scrollY > LIMIAR_SCROLL);
    aoRolar(); // estado correto já no primeiro paint (reload no meio da página)
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b motion-safe:transition-colors motion-safe:duration-500 ${
          rolado
            ? "border-gold/15 bg-background/70 backdrop-blur-md"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:h-20 sm:px-8">
          <Link
            href="/"
            aria-label="WLimports — página inicial"
            className="rounded-sm font-serif text-base uppercase tracking-[0.32em] text-foreground outline-none transition-colors duration-300 hover:text-champagne focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:text-lg sm:tracking-[0.38em]"
          >
            WLimports
          </Link>

          <CartButton />
        </div>
      </header>

      {/* Fora do <header>: `backdrop-blur` cria containing block e prenderia
          o drawer `fixed` dentro da faixa do header. */}
      <CartDrawer />
    </>
  );
}
