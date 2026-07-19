"use client";

import { ReactLenis } from "lenis/react";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

// Assina o media query como fonte externa (padrão idiomático — evita setState
// dentro de effect). Snapshot no servidor é `false` (sem Lenis desligado no SSR).
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}

/**
 * Smooth scroll global via Lenis.
 * Desativado quando o usuário pede `prefers-reduced-motion: reduce` — nesse
 * caso os filhos são renderizados sem o wrapper do Lenis e o navegador usa o
 * `scroll-behavior: smooth` nativo (fallback declarado no globals.css).
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{ lerp: 0.1, duration: 1.1, smoothWheel: true }}
    >
      {children}
    </ReactLenis>
  );
}
