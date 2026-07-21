"use client";

import { motion } from "framer-motion";

/**
 * Cortina de abertura da home (T-C1 — "fator UAU").
 *
 * NÃO é preloader: não espera `load`, não espera o vídeo, não bloqueia nem
 * atrasa nada. O hero já está no DOM desde o primeiro paint; esta camada é
 * puramente decorativa, montada só depois que o JS hidratou (por isso, sem JS,
 * o site simplesmente aparece normal). `pointer-events-none` desde o frame
 * zero — nunca captura clique, mesmo enquanto cobre a tela.
 *
 * Só anima `transform` (translateY). Duração total ≤ 1.2s (0.12s de respiro +
 * 0.9s de saída). Quem monta é o Hero, que também cuida do sessionStorage e do
 * prefers-reduced-motion (sob reduced-motion este componente nem é montado).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Respiro + saída. Mantido < 1.2s conforme a spec de abertura. */
export const CORTINA_DELAY = 0.12;
export const CORTINA_DURACAO = 0.9;
export const CORTINA_TOTAL_MS = (CORTINA_DELAY + CORTINA_DURACAO) * 1000;

type CortinaProps = {
  onComplete?: () => void;
};

export default function Cortina({ onComplete }: CortinaProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-background will-change-transform"
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        transition={{
          duration: CORTINA_DURACAO,
          ease: EASE,
          delay: CORTINA_DELAY,
        }}
        onAnimationComplete={onComplete}
      >
        {/* Fio dourado na borda da "tampa" — o brilho que passa ao abrir. */}
        <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />
      </motion.div>
    </div>
  );
}
