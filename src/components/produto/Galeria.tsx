"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Galeria da PDP.
 *
 * Pele Aesop (§1/§4 de `referencias-aesop.md`): a foto senta num **plate
 * tingido** (`bg-surface`), sem borda, sem raio e sem sombra — a moldura sai e
 * a hierarquia passa a vir do respiro. `object-contain` com folga interna
 * porque o dado real do Bling é packshot de fundo claro: `cover` cortaria o
 * frasco.
 *
 * As URLs vêm do proxy `/api/imagem` (a URL assinada da AWS por trás pode
 * caducar) — por isso cada imagem tem `onError` próprio e cai no placeholder
 * de inicial serif. Nunca imagem quebrada.
 *
 * Degradação: com **uma** imagem (o caso real de 100% do catálogo do Bling) não
 * existe tira de miniaturas — nem uma miniatura solitária, nem um espaço
 * reservado. Sem lightbox/zoom de propósito (fora de escopo); a troca entre
 * imagens é só um crossfade de opacity, que o MotionConfig global neutraliza
 * sob `prefers-reduced-motion`.
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
      {/* Plate */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface lg:flex-1">
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
              className="absolute inset-0 h-full w-full p-8 object-contain sm:p-12"
            />
          ) : (
            <motion.div
              key="placeholder"
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-gold-gradient select-none font-serif text-8xl opacity-80">
                {inicial}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Miniaturas — só existem com mais de uma imagem */}
      {imagens.length > 1 && (
        <div
          role="group"
          aria-label="Imagens do produto"
          className="flex gap-3 overflow-x-auto pb-1 lg:w-16 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
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
                className={`relative aspect-[4/5] w-14 shrink-0 overflow-hidden bg-surface p-2 transition-opacity duration-300 ease-lux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none lg:w-full ${
                  ativoAtual
                    ? "opacity-100 outline outline-1 outline-foreground"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {falhas.has(i) ? (
                  <span
                    aria-hidden="true"
                    className="text-gold-gradient flex h-full w-full select-none items-center justify-center font-serif text-lg"
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
                    className="h-full w-full object-contain"
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
