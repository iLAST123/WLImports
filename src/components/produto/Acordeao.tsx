"use client";

import { useState } from "react";

export interface SecaoAcordeao {
  /** Sufixo estável do id — vira `acordeao-<id>` / `painel-<id>`. */
  id: string;
  titulo: string;
  /** Parágrafos em TEXTO PURO (DEC-004 §2). Nunca HTML. */
  paragrafos: string[];
}

/**
 * Acordeão da ficha de produto (referencias-aesop.md §7).
 *
 * A Aesop usa `Description | Ingredients | Packaging and recycling`. **Nós só
 * temos descrição** (§9) — então este componente renderiza SÓ as seções que o
 * chamador conseguiu montar com dado real. Ele não conhece nenhum título fixo,
 * justamente para não existir a tentação de criar uma aba "Ingredientes" vazia.
 * Sem seção, não há acordeão: o componente devolve `null` e a coluna termina no
 * botão de compra.
 *
 * Quando há uma única seção ela abre por padrão — um acordeão fechado de um
 * item só esconde o único conteúdo da página sem ganho nenhum.
 *
 * Movimento: transição CSS de `grid-template-rows` (0fr → 1fr), o degrau mais
 * barato da pirâmide — anima altura sem medir nada em JS. `motion-reduce`
 * desliga. O conteúdo fechado leva `inert`, então não recebe foco nem é lido
 * por leitor de tela enquanto está colapsado.
 */
export default function Acordeao({ secoes }: { secoes: SecaoAcordeao[] }) {
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(
    () => new Set(secoes.length === 1 ? [secoes[0].id] : []),
  );

  if (secoes.length === 0) return null;

  const alternar = (id: string) =>
    setAbertas((anterior) => {
      const proximo = new Set(anterior);
      if (!proximo.delete(id)) proximo.add(id);
      return proximo;
    });

  return (
    <div className="border-t border-border">
      {secoes.map((secao) => {
        const aberta = abertas.has(secao.id);
        return (
          <section key={secao.id} className="border-b border-border">
            <h2>
              <button
                type="button"
                id={`acordeao-${secao.id}`}
                aria-expanded={aberta}
                aria-controls={`painel-${secao.id}`}
                onClick={() => alternar(secao.id)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left font-sans text-sm text-foreground transition-colors duration-300 ease-lux hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                <span className="min-w-0 break-words">{secao.titulo}</span>
                <Chevron aberta={aberta} />
              </button>
            </h2>

            <div
              className={`grid transition-[grid-template-rows] duration-500 ease-lux motion-reduce:transition-none ${
                aberta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden" inert={!aberta}>
                <div
                  id={`painel-${secao.id}`}
                  role="region"
                  aria-labelledby={`acordeao-${secao.id}`}
                  className="space-y-4 pb-6 pr-2"
                >
                  {secao.paragrafos.map((paragrafo, i) => (
                    <p
                      key={i}
                      className="font-sans text-sm leading-relaxed text-muted"
                    >
                      {paragrafo}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chevron({ aberta }: { aberta: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-3 w-3 shrink-0 transition-transform duration-500 ease-lux motion-reduce:transition-none ${
        aberta ? "-rotate-180" : ""
      }`}
    >
      <path
        d="M2 5.5 8 11l6-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="square"
      />
    </svg>
  );
}
