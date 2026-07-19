"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { Produto, ProdutosResponse } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";

type Status = "loading" | "error" | "ready";

const EASE = [0.22, 1, 0.36, 1] as const;

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Catalog() {
  const [status, setStatus] = useState<Status>("loading");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const carregar = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/produtos");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ProdutosResponse;
      setProdutos(data.produtos ?? []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  // Carga inicial: o estado já nasce "loading", então o effect só dispara o
  // fetch — os setState acontecem depois do await (fora do corpo síncrono do
  // effect), evitando cascata de renders.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/produtos");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ProdutosResponse;
        if (cancelado) return;
        setProdutos(data.produtos ?? []);
        setStatus("ready");
      } catch {
        if (!cancelado) setStatus("error");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // Categorias derivadas apenas das existentes nos dados.
  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const p of produtos) if (p.categoria) set.add(p.categoria);
    return Array.from(set).sort();
  }, [produtos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const okBusca = !termo || p.nome.toLowerCase().includes(termo);
      const okCat = !categoria || p.categoria === categoria;
      return okBusca && okCat;
    });
  }, [produtos, busca, categoria]);

  const limparFiltros = () => {
    setBusca("");
    setCategoria(null);
  };

  return (
    <section
      id="catalogo"
      className="w-full scroll-mt-0 bg-background px-6 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* Cabeçalho */}
        <Reveal className="mb-4 flex flex-col items-center text-center">
          <p className="mb-4 font-sans text-xs uppercase tracking-[0.36em] text-gold">
            Catálogo
          </p>
          <h2 className="font-serif text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Fragrâncias em curadoria
          </h2>
          <p className="mt-4 max-w-lg font-sans text-base leading-relaxed text-muted">
            Uma seleção viva de perfumes importados e decants de nicho.
            Encontre a sua assinatura.
          </p>
        </Reveal>

        {/* Controles */}
        {status === "ready" && produtos.length > 0 && (
          <Reveal className="mb-12 mt-10 flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md">
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome…"
                aria-label="Buscar perfume por nome"
                className="w-full border-b border-border bg-transparent px-1 py-3 font-sans text-base text-foreground placeholder:text-muted/70 transition-colors focus:border-gold focus:outline-none"
              />
            </div>

            {categorias.length > 0 && (
              <div
                role="group"
                aria-label="Filtrar por categoria"
                className="flex flex-wrap items-center justify-center gap-2"
              >
                <FiltroChip
                  ativo={categoria === null}
                  onClick={() => setCategoria(null)}
                >
                  Todos
                </FiltroChip>
                {categorias.map((c) => (
                  <FiltroChip
                    key={c}
                    ativo={categoria === c}
                    onClick={() => setCategoria(c)}
                  >
                    {c}
                  </FiltroChip>
                ))}
              </div>
            )}
          </Reveal>
        )}

        {/* Estados */}
        {status === "loading" && <SkeletonGrid />}

        {status === "error" && (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <p className="font-serif text-xl text-foreground">
              Não foi possível carregar o catálogo.
            </p>
            <p className="max-w-sm font-sans text-sm text-muted">
              Algo interrompeu a conexão. Tente novamente em instantes.
            </p>
            <button
              type="button"
              onClick={carregar}
              className="mt-2 border border-gold/50 px-6 py-3 font-sans text-sm uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {status === "ready" && produtos.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-serif text-xl text-foreground">
              Catálogo em atualização.
            </p>
            <p className="mt-2 font-sans text-sm text-muted">
              Novas fragrâncias chegam em breve.
            </p>
          </div>
        )}

        {status === "ready" && produtos.length > 0 && (
          <>
            {filtrados.length > 0 ? (
              <motion.div
                variants={gridVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3"
              >
                <AnimatePresence mode="popLayout">
                  {filtrados.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      variants={cardVariants}
                      exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                    >
                      <ProductCard produto={p} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="py-20 text-center">
                <p className="font-serif text-xl text-foreground">
                  Nenhuma fragrância encontrada.
                </p>
                <p className="mt-2 font-sans text-sm text-muted">
                  Ajuste a busca ou limpe os filtros para ver tudo.
                </p>
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="mt-6 border border-gold/50 px-6 py-3 font-sans text-sm uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-full border px-4 py-2 font-sans text-xs uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        ativo
          ? "border-gold bg-gold/10 text-champagne"
          : "border-border text-muted hover:border-gold/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-sm border border-border bg-surface"
        >
          <div className="aspect-[4/5] w-full animate-pulse bg-background" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-background" />
            <div className="h-3 w-full animate-pulse rounded bg-background" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-background" />
          </div>
        </div>
      ))}
    </div>
  );
}
