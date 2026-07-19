"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { useLenis } from "lenis/react";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.16, delayChildren: 0.2 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export default function Hero() {
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Parallax sutil do conteúdo — só transform. Neutralizado com reduced-motion.
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.8],
    [1, reduced ? 1 : 0]
  );

  const handleCatalogo = () => {
    const target = document.getElementById("catalogo");
    if (lenis) {
      lenis.scrollTo("#catalogo", { offset: 0 });
    } else if (target) {
      // Sem Lenis (ex.: reduced-motion) o salto respeita a preferência do usuário.
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-background"
    >
      {/* Fundo: vídeo (motion) ou poster estático (reduced-motion) */}
      {reduced ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/videos/hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
      )}

      {/* Overlay em gradiente — mais denso embaixo, garante contraste AA */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background/30"
      />

      {/* Conteúdo */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex flex-col items-center px-6 text-center"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.p
            variants={item}
            className="mb-5 font-sans text-xs uppercase tracking-[0.42em] text-champagne sm:text-sm"
          >
            Alta perfumaria importada
          </motion.p>

          <motion.h1
            variants={item}
            className="text-gold-gradient font-serif text-6xl font-semibold leading-[0.95] tracking-tight sm:text-8xl lg:text-[9.5rem]"
          >
            WLimports
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl font-sans text-base leading-relaxed text-foreground/85 sm:text-lg"
          >
            Fragrâncias raras, originais garantidos e decants de nicho — uma
            curadoria para quem entende exclusividade como assinatura.
          </motion.p>

          <motion.div variants={item} className="mt-10">
            <button
              type="button"
              onClick={handleCatalogo}
              className="group relative inline-flex items-center gap-3 px-8 py-4 font-sans text-sm uppercase tracking-[0.22em] text-foreground transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
            >
              <span>Ver Catálogo</span>
              {/* Hairline dourada que expande no hover */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 mx-auto h-px w-full origin-center scale-x-100 bg-gold/50 transition-all duration-500 group-hover:bg-gold"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-champagne transition-all duration-500 group-hover:w-full"
              />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Indicador de scroll discreto */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8, ease: EASE }}
      >
        <motion.div
          className="h-12 w-px bg-gradient-to-b from-gold to-transparent"
          animate={reduced ? undefined : { scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
          style={{ transformOrigin: "top" }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
