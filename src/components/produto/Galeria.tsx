"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Galeria da PDP.
 *
 * As URLs vêm do proxy `/api/imagem` (a URL assinada da AWS por trás pode
 * caducar) — por isso cada imagem tem `onError` próprio e cai no placeholder
 * de inicial serif, mesmo padrão do ProductCard. Nunca imagem quebrada.
 *
 * Sem lightbox/zoom de propósito (fora de escopo): a troca entre imagens é só
 * um crossfade curto de opacity, que o MotionConfig global neutraliza sob
 * `prefers-reduced-motion`.
 */
export default function Galeria({
  imagens,
  nome,
}: {
  imagens: string[];
  nome: string;
}) {
  const inicial = nome.trim().charAt(0).toUpperCase() || "W";
  const [ativa, setAtiva] = useState(0);
  // Índices cujo carregamento falhou — Set imutável para o React ver a troca.
  const [falhas, setFalhas] = useState<ReadonlySet<number>>(() => new Set());

  const marcarFalha = (i: number) =>
    setFalhas((anterior) => new Set(anterior).add(i));

  const temImagens = imagens.length > 0;
  const indice = Math.min(ativa, Math.max(imagens.length - 1, 0));
  const src = temImagens ? imagens[indice] : undefined;
  const mostrarImagem = Boolean(src) && !falhas.has(indice);

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start lg:gap-6">
      {/* Palco */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm border border-border bg-surface lg:flex-1">
        {/* mode padrão (sync): entrando e saindo se sobrepõem no mesmo
            inset-0, que é exatamente o crossfade desejado. */}
        <AnimatePresence initial={false}>
          {mostrarImagem ? (
            <motion.img
              key={src}
              src={src}
              alt={nome}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              onError={() => marcarFalha(indice)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <motion.div
              key="placeholder"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-background"
            >
              <span className="text-gold-gradient select-none font-serif text-8xl font-semibold opacity-80">
                {inicial}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Miniaturas — só fazem sentido com mais de uma imagem */}
      {imagens.length > 1 && (
        <div
          role="group"
          aria-label="Imagens do produto"
          className="flex gap-3 overflow-x-auto pb-1 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {imagens.map((url, i) => {
            const ativoAtual = i === indice;
            return (
              <button
                key={url}
                type="button"
                onClick={() => setAtiva(i)}
                aria-label={`Ver imagem ${i + 1} de ${imagens.length}`}
                aria-pressed={ativoAtual}
                aria-current={ativoAtual ? "true" : undefined}
                className={`relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-sm border bg-surface transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-full ${
                  ativoAtual
                    ? "border-gold"
                    : "border-border opacity-70 hover:border-gold/40 hover:opacity-100"
                }`}
              >
                {falhas.has(i) ? (
                  <span
                    aria-hidden="true"
                    className="text-gold-gradient flex h-full w-full select-none items-center justify-center font-serif text-xl font-semibold"
                  >
                    {inicial}
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    onError={() => marcarFalha(i)}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
