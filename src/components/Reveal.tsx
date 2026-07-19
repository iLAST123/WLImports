"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Reveal on scroll (fade + slide) reutilizável.
 * O `delay` precisa viver DENTRO da transition da variant `visible`: uma
 * transition definida na variant tem precedência sobre a prop `transition`
 * do componente (que seria silenciosamente ignorada).
 * Com `prefers-reduced-motion: reduce`, o MotionConfig global ("user") remove
 * o deslocamento e o conteúdo aparece imediatamente visível — nada fica preso
 * em opacity 0.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "span";
}) {
  const MotionTag = motion[as];
  const variants: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: EASE, delay },
    },
  };
  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
    >
      {children}
    </MotionTag>
  );
}
