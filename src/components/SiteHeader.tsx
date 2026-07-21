"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartButton from "@/components/cart/CartButton";
import CartDrawer from "@/components/cart/CartDrawer";

const LIMIAR_SCROLL = 24;

/** Navegação persistente. Sem mega-menu: não temos taxonomia real de
 *  categoria vinda do ERP (ver referencias-aesop.md §9) — prometer facetas que
 *  o dado não sustenta seria pior que três links honestos. */
const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/catalogo", rotulo: "Catálogo" },
  { href: "/#sobre", rotulo: "Sobre" },
] as const;

/**
 * Header global e BICROMÁTICO (referencias-aesop.md §5).
 *
 * A home é a única página escura do site: sobre o hero full-bleed o header
 * começa transparente e só ganha fundo/blur ao rolar. Em qualquer outra rota
 * (as páginas de compra, que são creme) ele é OPACO e de texto escuro.
 *
 * A virada não é feita com condicional de cor — isso violaria o item 3 do
 * contrato de `globals.css`. Ela é feita pelo próprio mecanismo do design
 * system: `data-superficie="clara"` no <header> remapeia os tokens no escopo,
 * então `bg-background` vira creme e `text-foreground` vira quase-preto sem
 * que uma única classe de cor mude.
 *
 * O listener é nativo e `passive` (não depende do Lenis, que é desligado sob
 * prefers-reduced-motion).
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const naHome = pathname === "/";

  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolado(window.scrollY > LIMIAR_SCROLL);
    aoRolar(); // estado correto já no primeiro paint (reload no meio da página)
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // Fora da home o header é sempre sólido; na home ele depende do scroll.
  const solido = !naHome || rolado;

  return (
    <>
      <header
        data-superficie={naHome ? undefined : "clara"}
        className={`fixed inset-x-0 top-0 z-50 border-b motion-safe:transition-colors motion-safe:duration-500 ${
          naHome
            ? solido
              ? "border-gold/15 bg-background/70 backdrop-blur-md"
              : "border-transparent bg-transparent"
            : "border-border bg-background"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:h-20 sm:gap-6 sm:px-8">
          <Link
            href="/"
            aria-label="WLimports — página inicial"
            className="shrink-0 font-serif text-lg text-foreground outline-none transition-colors duration-300 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:text-xl"
          >
            WLimports
          </Link>

          <nav aria-label="Navegação principal" className="min-w-0">
            <ul className="flex items-center gap-4 sm:gap-7">
              {LINKS.map((link) => {
                // `/#sobre` é âncora dentro da home — nunca "página atual".
                const ativo =
                  link.href === "/"
                    ? pathname === "/"
                    : link.href === "/catalogo" &&
                      pathname.startsWith("/catalogo");
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex h-11 items-center whitespace-nowrap px-0.5 font-sans text-sm outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        ativo
                          ? "text-foreground underline decoration-gold decoration-1 underline-offset-8"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {link.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="shrink-0">
            <CartButton />
          </div>
        </div>
      </header>

      {/* Fora do <header>: `backdrop-blur` cria containing block e prenderia
          o drawer `fixed` dentro da faixa do header. */}
      <CartDrawer />
    </>
  );
}
