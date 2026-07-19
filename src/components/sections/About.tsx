"use client";

import { useReducedMotion } from "framer-motion";
import Reveal from "@/components/Reveal";

const pilares = [
  {
    titulo: "Originais garantidos",
    texto: "Cada frasco é importado de fontes autenticadas — procedência rastreável, nunca réplicas.",
  },
  {
    titulo: "Curadoria de nicho",
    texto: "Selecionamos casas raras e composições autorais que fogem do óbvio das prateleiras.",
  },
  {
    titulo: "Envio seguro",
    texto: "Embalagem protegida e rastreio ponta a ponta, para que a fragrância chegue intacta.",
  },
];

export default function About() {
  const reduced = useReducedMotion();

  return (
    <section className="w-full bg-background px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        {/* Bloco de vídeo lateral */}
        <Reveal className="relative aspect-[4/5] overflow-hidden rounded-sm border border-border bg-surface">
          {reduced ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/videos/about-poster.jpg"
              alt="Aplicação de perfume sob luz dourada"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/videos/about-poster.jpg"
              aria-label="Aplicação de perfume sob luz dourada"
            >
              <source src="/videos/about.mp4" type="video/mp4" />
            </video>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/15"
          />
        </Reveal>

        {/* Coluna de texto */}
        <div className="flex flex-col">
          <Reveal>
            <p className="mb-4 font-sans text-xs uppercase tracking-[0.36em] text-gold">
              A casa WLimports
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Perfume é memória.
              <br />
              <span className="italic text-champagne">Nós importamos as raras.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-xl font-sans text-base leading-relaxed text-muted">
              A WLimports nasceu do desejo de aproximar a alta perfumaria de quem
              a valoriza. Trazemos perfumes importados originais e decants de
              nicho, escolhidos um a um por assinatura olfativa e procedência.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-muted">
              Sem excessos, sem atalhos: curadoria criteriosa, autenticidade
              verificada e um atendimento que trata cada fragrância como peça
              única — porque, para você, ela é.
            </p>
          </Reveal>

          {/* Pilares com hairlines douradas */}
          <ul className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
            {pilares.map((p, i) => (
              <Reveal
                key={p.titulo}
                as="li"
                delay={0.1 + i * 0.08}
                className="flex flex-col bg-surface p-6"
              >
                <span
                  aria-hidden="true"
                  className="mb-4 h-px w-8 bg-gold"
                />
                <h3 className="font-serif text-lg text-foreground">
                  {p.titulo}
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                  {p.texto}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
