"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import type { Produto } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

const gradeVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/**
 * Grade de cards, compartilhada pela prévia da home e pela PLP.
 *
 * Gap medido na Aesop: 50px na linha, 30px na coluna, 4 colunas em 1440 (§3).
 *
 * `viewport.amount: 0` é obrigatório: com o catálogo real (100+ itens) a grade
 * é muito mais alta que a janela, e qualquer fração exigida > 0 nunca seria
 * atingida — todos os cards ficariam presos em opacity 0 (bug já vivido).
 */
export default function GradeProdutos({
  produtos,
  className = "",
}: {
  produtos: Produto[];
  className?: string;
}) {
  return (
    <motion.ul
      variants={gradeVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      className={`grid list-none grid-cols-2 gap-x-5 gap-y-10 lg:gap-x-[30px] lg:gap-y-[50px] ${className}`}
    >
      <AnimatePresence mode="popLayout">
        {produtos.map((p) => (
          <motion.li key={p.id} layout variants={cardVariants} exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}>
            <ProductCard produto={p} />
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
