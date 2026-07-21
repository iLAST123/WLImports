"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { useLenis } from "lenis/react";
import Cortina, { CORTINA_TOTAL_MS } from "@/components/Cortina";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Chave de sessão da cortina — quem volta do produto/checkout não revê a abertura. */
const CORTINA_KEY = "wlimports:cortina:v1";

/**
 * "pendente" = o snapshot do servidor (e o render de hidratação): nada de
 * cortina no HTML, então sem JS o hero fica simplesmente visível e não há
 * mismatch de hidratação. Só depois de hidratar o React troca pelo snapshot do
 * cliente, que é quem lê o sessionStorage.
 */
type EstadoCortina = "pendente" | "rodando" | "concluida";

/**
 * Decisão memoizada no módulo: o sessionStorage é lido (e marcado) uma única
 * vez por carga de página, então o snapshot do useSyncExternalStore é estável.
 */
let decisao: EstadoCortina | null = null;

function lerDecisao(): EstadoCortina {
  if (decisao === null) {
    try {
      const jaViu = window.sessionStorage.getItem(CORTINA_KEY) === "1";
      decisao = jaViu ? "concluida" : "rodando";
      if (!jaViu) window.sessionStorage.setItem(CORTINA_KEY, "1");
    } catch {
      // sessionStorage bloqueado (modo restrito): trata como "já viu", assim
      // ninguém fica preso numa abertura que se repete a cada navegação.
      decisao = "concluida";
    }
  }
  return decisao;
}

/** A decisão nunca muda durante a vida da página — nada a que se inscrever. */
const inscrever = () => () => {};
const snapshotServidor = (): EstadoCortina => "pendente";

const container: Variants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: { staggerChildren: 0.13, delayChildren: delay },
  }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/** Parágrafo e CTA chegam depois do bloco kicker + wordmark. */
const itemTardio: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE, delay: 0.14 },
  },
};

/** Wordmark: o letter-spacing assenta (abre e fecha) enquanto o clip revela. */
const wordmark: Variants = {
  hidden: { letterSpacing: "0.06em" },
  visible: {
    letterSpacing: "-0.025em",
    transition: { duration: 1.1, ease: EASE },
  },
};

/** Clip/mask reveal de baixo pra cima — puro transform dentro de overflow-hidden. */
const wordmarkInner: Variants = {
  hidden: { y: "112%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE } },
};

/** Hairline dourada que se estende sob a wordmark. */
const hairline: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 1.2, ease: EASE, delay: 0.15 },
  },
};

export default function Hero() {
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const sectionRef = useRef<HTMLElement>(null);
  const [encerrada, setEncerrada] = useState(false);

  const snapshot = useSyncExternalStore(
    inscrever,
    lerDecisao,
    snapshotServidor
  );

  // Sob reduced-motion a cortina não existe (nem monta): o hero aparece direto.
  const cortina: EstadoCortina =
    snapshot === "pendente"
      ? "pendente"
      : reduced || encerrada || snapshot === "concluida"
        ? "concluida"
        : "rodando";

  // Rede de segurança: se a animação não completar (aba em background, JS
  // interrompido), a cortina sai sozinha logo depois do tempo previsto.
  useEffect(() => {
    if (cortina !== "rodando") return;
    const id = window.setTimeout(
      () => setEncerrada(true),
      CORTINA_TOTAL_MS + 400
    );
    return () => window.clearTimeout(id);
  }, [cortina]);

  // Conteúdo entra quando a cortina está saindo; sem cortina, entra quase já.
  const delayEntrada = cortina === "rodando" ? 0.45 : reduced ? 0 : 0.1;

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
    <>
      <AnimatePresence>
        {cortina === "rodando" && (
          <Cortina key="cortina" onComplete={() => setEncerrada(true)} />
        )}
      </AnimatePresence>

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

        {/* Grão de filme — textura estática do design system (.grain-lux, ~5%).
            Sem movimento, então não precisa de fallback de reduced-motion. */}
        <div aria-hidden="true" className="grain-lux pointer-events-none absolute inset-0" />

        {/* Vinheta radial — fecha as bordas e dá corpo cinematográfico ao vídeo.
            Escurece só as extremidades; o centro (onde vive o texto) fica intacto,
            então o contraste AA do conteúdo não é afetado. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_100%)] opacity-80"
        />

        {/* Overlay em gradiente — mais denso embaixo, garante contraste AA */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-background/30" />

        {/* Conteúdo */}
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative z-10 flex w-full max-w-full flex-col items-center px-6 text-center"
        >
          <motion.div
            variants={container}
            custom={delayEntrada}
            initial="hidden"
            animate={cortina === "pendente" ? "hidden" : "visible"}
            className="flex w-full flex-col items-center"
          >
            <motion.p
              variants={item}
              className="mb-5 font-sans text-xs uppercase tracking-[0.42em] text-champagne sm:text-sm"
            >
              Alta perfumaria importada
            </motion.p>

            {/* Wordmark: máscara com overflow-hidden + translateY interno.
                O padding/margem negativa evita cortar os descendentes ("p"). */}
            <motion.h1
              variants={wordmark}
              className="overflow-hidden pb-[0.12em] font-serif text-6xl font-semibold leading-[0.95] tracking-tight sm:text-8xl lg:text-[9.5rem]"
            >
              <motion.span
                variants={wordmarkInner}
                className="text-gold-gradient block will-change-transform"
              >
                WLimports
              </motion.span>
            </motion.h1>

            <motion.span
              aria-hidden="true"
              variants={hairline}
              className="mt-2 block h-px w-[min(22rem,80%)] origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
            />

            <motion.p
              variants={itemTardio}
              className="mt-6 max-w-xl font-sans text-base leading-relaxed text-foreground/85 sm:text-lg"
            >
              Fragrâncias raras, originais garantidos e decants de nicho — uma
              curadoria para quem entende exclusividade como assinatura.
            </motion.p>

            <motion.div variants={itemTardio} className="mt-10">
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
            animate={
              reduced ? undefined : { scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }
            }
            style={{ transformOrigin: "top" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>
    </>
  );
}
