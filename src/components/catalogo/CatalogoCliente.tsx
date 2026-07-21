"use client";

import { useId, useMemo, useState } from "react";
import {
  categoriasDe,
  contagem,
  filtrar,
  ordenar,
  ORDENS,
  type Ordem,
} from "@/components/catalogo/ordenacao";
import GradeProdutos from "@/components/catalogo/GradeProdutos";
import {
  EstadoErro,
  EstadoSemResultado,
  EstadoVazio,
  GradeEsqueleto,
} from "@/components/catalogo/estados";
import { useProdutos } from "@/components/catalogo/useProdutos";

const GRADE = "md:grid-cols-3 lg:grid-cols-4";

/**
 * Corpo da PLP: barra de ferramentas tingida + grade densa.
 *
 * Tudo (busca, categoria, ordenação, contagem) opera em memória sobre o
 * payload já carregado pelo `useProdutos` — nenhuma chamada nova ao Bling.
 */
export default function CatalogoCliente() {
  const { status, produtos, recarregar } = useProdutos();

  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("destaques");

  const idBusca = useId();
  const idOrdem = useId();

  const categorias = useMemo(() => categoriasDe(produtos), [produtos]);

  const visiveis = useMemo(
    () => ordenar(filtrar(produtos, { busca, categoria }), ordem),
    [produtos, busca, categoria, ordem],
  );

  const limpar = () => {
    setBusca("");
    setCategoria(null);
  };

  const temProdutos = status === "ready" && produtos.length > 0;

  return (
    <>
      {/* ---- Barra de ferramentas tingida (bg-surface) ---- */}
      {temProdutos && (
        <div className="w-full bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-sans text-sm font-semibold text-foreground">
                  Todas as fragrâncias
                </h2>
                {/* Contagem real, e ela muda ao filtrar — por isso é anunciada. */}
                <p
                  aria-live="polite"
                  className="mt-1 font-sans text-xs text-muted"
                >
                  {contagem(visiveis.length)}
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={idBusca}
                    className="font-sans text-xs text-muted"
                  >
                    Buscar
                  </label>
                  <input
                    id={idBusca}
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome da fragrância"
                    // border-muted: a borda é a única pista visual do campo.
                    className="h-11 w-full border border-muted bg-transparent px-3 font-sans text-sm text-foreground placeholder:text-muted/70 focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-56"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={idOrdem}
                    className="font-sans text-xs text-muted"
                  >
                    Ordenar
                  </label>
                  <select
                    id={idOrdem}
                    value={ordem}
                    onChange={(e) => setOrdem(e.target.value as Ordem)}
                    className="h-11 w-full border border-muted bg-transparent px-3 font-sans text-sm text-foreground focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-44"
                  >
                    {ORDENS.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Categorias derivadas do próprio dado. O catálogo real do Bling
                não expõe categoria (§9) — então esta faixa some sozinha, e é
                o comportamento correto, não uma falha. */}
            {categorias.length > 0 && (
              <div
                role="group"
                aria-label="Filtrar por categoria"
                className="mt-5 flex flex-wrap items-center gap-2"
              >
                <Chip ativo={categoria === null} onClick={() => setCategoria(null)}>
                  Todos
                </Chip>
                {categorias.map((c) => (
                  <Chip
                    key={c}
                    ativo={categoria === c}
                    onClick={() => setCategoria(c)}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Grade ---- */}
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        {status === "loading" && <GradeEsqueleto className={GRADE} />}
        {status === "error" && <EstadoErro onRetry={recarregar} />}
        {status === "ready" && produtos.length === 0 && <EstadoVazio />}
        {temProdutos &&
          (visiveis.length > 0 ? (
            <GradeProdutos produtos={visiveis} className={GRADE} />
          ) : (
            <EstadoSemResultado onLimpar={limpar} />
          ))}
      </div>
    </>
  );
}

/** Chip de filtro em sentence case — sem uppercase, sem tracking decorativo. */
function Chip({
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
      className={`inline-flex h-11 items-center border px-4 sm:h-9 font-sans text-xs transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        ativo
          ? "border-gold text-gold"
          : "border-muted text-muted hover:border-gold hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
