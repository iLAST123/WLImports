import type { Produto } from "@/lib/types";

export type Ordem = "destaques" | "menor-preco" | "maior-preco" | "nome";

/** Rótulos em sentence case — o idioma da vitrine (referencias-aesop.md §2). */
export const ORDENS: ReadonlyArray<{ valor: Ordem; rotulo: string }> = [
  { valor: "destaques", rotulo: "Destaques" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "nome", rotulo: "Nome" },
];

/** Funções puras, sobre o payload já carregado. Zero request novo. */
export function filtrar(
  produtos: Produto[],
  { busca, categoria }: { busca: string; categoria: string | null },
): Produto[] {
  const termo = busca.trim().toLowerCase();
  if (!termo && !categoria) return produtos;
  return produtos.filter((p) => {
    const okBusca = !termo || p.nome.toLowerCase().includes(termo);
    const okCat = !categoria || p.categoria === categoria;
    return okBusca && okCat;
  });
}

/**
 * `destaques` = ordem de chegada do ERP (é a curadoria de quem cadastrou —
 * não inventamos ranking). Produto "Sob consulta" nunca disputa posição de
 * preço: vai sempre para o fim, tanto em asc quanto em desc.
 */
export function ordenar(produtos: Produto[], ordem: Ordem): Produto[] {
  if (ordem === "destaques") return produtos;

  const copia = [...produtos];

  if (ordem === "nome") {
    return copia.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const sinal = ordem === "menor-preco" ? 1 : -1;
  return copia.sort((a, b) => {
    const pa = a.preco;
    const pb = b.preco;
    if (pa === undefined && pb === undefined) return 0;
    if (pa === undefined) return 1;
    if (pb === undefined) return -1;
    return (pa - pb) * sinal;
  });
}

/** Categorias derivadas do próprio dado — some sozinho quando não há nenhuma. */
export function categoriasDe(produtos: Produto[]): string[] {
  const set = new Set<string>();
  for (const p of produtos) if (p.categoria) set.add(p.categoria);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function contagem(n: number): string {
  return `${n} ${n === 1 ? "produto" : "produtos"}`;
}
