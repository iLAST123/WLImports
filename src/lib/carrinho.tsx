"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Produto } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export interface ItemCarrinho {
  id: number;
  nome: string;
  /** Ausente quando o produto é "sob consulta". */
  preco?: number;
  precoFormatado?: string;
  consultar?: boolean;
  imagemURL?: string;
  quantidade: number;
}

export const CHAVE_STORAGE = "wlimports:carrinho:v1";
export const QUANTIDADE_MAXIMA = 99;

/* -------------------------------------------------------------------------- */
/* Núcleo puro (sem React) — testável em Node, sem DOM                        */
/* -------------------------------------------------------------------------- */

export type AcaoCarrinho =
  | { tipo: "hidratar"; itens: ItemCarrinho[] }
  | { tipo: "adicionar"; produto: Produto; quantidade: number }
  | { tipo: "remover"; id: number }
  | { tipo: "alterarQuantidade"; id: number; quantidade: number }
  | { tipo: "limpar" };

/**
 * Normaliza uma quantidade para inteiro entre 0 e 99.
 * Retorna 0 para valores inválidos/negativos — e 0 sempre significa "remover".
 */
export function normalizarQuantidade(valor: unknown): number {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero)) return 0;
  const inteiro = Math.floor(numero);
  if (inteiro <= 0) return 0;
  return Math.min(inteiro, QUANTIDADE_MAXIMA);
}

/** Produto sem preço utilizável → "Sob consulta" (nunca "R$ 0,00"). */
export function ehSobConsulta(
  item: Pick<ItemCarrinho, "preco" | "consultar">
): boolean {
  return item.consultar === true || typeof item.preco !== "number";
}

function itemDeProduto(produto: Produto, quantidade: number): ItemCarrinho {
  const semPreco = produto.consultar === true || typeof produto.preco !== "number";
  return {
    id: produto.id,
    nome: produto.nome,
    preco: semPreco ? undefined : produto.preco,
    precoFormatado: semPreco ? undefined : produto.precoFormatado,
    consultar: semPreco ? true : undefined,
    imagemURL: produto.imagemURL,
    quantidade,
  };
}

export function carrinhoReducer(
  estado: ItemCarrinho[],
  acao: AcaoCarrinho
): ItemCarrinho[] {
  switch (acao.tipo) {
    case "hidratar":
      return acao.itens;

    case "adicionar": {
      const quantidade = normalizarQuantidade(acao.quantidade);
      if (quantidade === 0) return estado;

      const existente = estado.find((item) => item.id === acao.produto.id);
      if (!existente) {
        return [...estado, itemDeProduto(acao.produto, quantidade)];
      }
      return estado.map((item) =>
        item.id === acao.produto.id
          ? {
              ...item,
              // Teto de 99 por item: somar acima disso satura, não estoura.
              quantidade: Math.min(
                item.quantidade + quantidade,
                QUANTIDADE_MAXIMA
              ),
            }
          : item
      );
    }

    case "remover":
      return estado.filter((item) => item.id !== acao.id);

    case "alterarQuantidade": {
      const quantidade = normalizarQuantidade(acao.quantidade);
      if (quantidade === 0) {
        return estado.filter((item) => item.id !== acao.id);
      }
      return estado.map((item) =>
        item.id === acao.id ? { ...item, quantidade } : item
      );
    }

    case "limpar":
      return [];

    default:
      return estado;
  }
}

export function calcularTotalItens(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

/** Subtotal considera SÓ itens com preço numérico — "sob consulta" fica fora. */
export function calcularSubtotal(itens: ItemCarrinho[]): number {
  return itens.reduce(
    (soma, item) =>
      ehSobConsulta(item) ? soma : soma + (item.preco as number) * item.quantidade,
    0
  );
}

const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Atenção: o Intl usa NBSP (U+00A0) entre "R$" e o número. */
export function formatarBRL(valor: number): string {
  return formatadorBRL.format(Number.isFinite(valor) ? valor : 0);
}

/**
 * Converte o conteúdo cru do localStorage em itens válidos.
 * Qualquer lixo (JSON inválido, tipo errado, id não numérico, quantidade
 * absurda) é descartado silenciosamente — o site nunca quebra por storage
 * corrompido.
 */
export function desserializarCarrinho(bruto: string | null): ItemCarrinho[] {
  if (!bruto) return [];
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return [];
  }
  if (!Array.isArray(dados)) return [];

  const itens: ItemCarrinho[] = [];
  const vistos = new Set<number>();

  for (const cru of dados) {
    if (typeof cru !== "object" || cru === null) continue;
    const registro = cru as Record<string, unknown>;

    const id = registro.id;
    if (typeof id !== "number" || !Number.isFinite(id) || vistos.has(id)) continue;

    const nome = registro.nome;
    if (typeof nome !== "string" || nome.trim() === "") continue;

    const quantidade = normalizarQuantidade(registro.quantidade);
    if (quantidade === 0) continue;

    const preco = registro.preco;
    const temPreco =
      typeof preco === "number" && Number.isFinite(preco) && preco >= 0;
    const consultar = registro.consultar === true || !temPreco;

    vistos.add(id);
    itens.push({
      id,
      nome,
      preco: consultar ? undefined : (preco as number),
      precoFormatado:
        !consultar && typeof registro.precoFormatado === "string"
          ? registro.precoFormatado
          : undefined,
      consultar: consultar ? true : undefined,
      imagemURL:
        typeof registro.imagemURL === "string" ? registro.imagemURL : undefined,
      quantidade,
    });
  }

  return itens;
}

export function serializarCarrinho(itens: ItemCarrinho[]): string {
  return JSON.stringify(itens);
}

/* -------------------------------------------------------------------------- */
/* Contexto React                                                             */
/* -------------------------------------------------------------------------- */

export interface CarrinhoContexto {
  itens: ItemCarrinho[];
  adicionar: (produto: Produto, quantidade?: number) => void;
  remover: (id: number) => void;
  alterarQuantidade: (id: number, quantidade: number) => void;
  limpar: () => void;
  totalItens: number;
  subtotal: number;
  subtotalFormatado: string;
  temItemSobConsulta: boolean;
  /** Estado do drawer lateral. */
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
}

const Contexto = createContext<CarrinhoContexto | null>(null);

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial SEMPRE vazio: ler localStorage no render causaria
  // hydration mismatch (o servidor não tem storage). Hidratamos no effect.
  const [itens, dispatch] = useReducer(carrinhoReducer, []);
  // Ref (não state): o "já li o storage" não precisa causar render — e evita
  // setState síncrono dentro de effect.
  const hidratado = useRef(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let bruto: string | null = null;
    try {
      bruto = window.localStorage.getItem(CHAVE_STORAGE);
    } catch {
      // Safari privado / storage bloqueado: seguimos com carrinho vazio.
      bruto = null;
    }
    const salvos = desserializarCarrinho(bruto);
    hidratado.current = true;
    if (salvos.length > 0) dispatch({ tipo: "hidratar", itens: salvos });
  }, []);

  useEffect(() => {
    // Este effect roda depois do de hidratação (ordem de declaração), então
    // nunca sobrescreve o storage antes de tê-lo lido.
    if (!hidratado.current) return;
    try {
      window.localStorage.setItem(CHAVE_STORAGE, serializarCarrinho(itens));
    } catch {
      // Quota estourada / storage bloqueado: carrinho segue em memória.
    }
  }, [itens]);

  const adicionar = useCallback((produto: Produto, quantidade = 1) => {
    dispatch({ tipo: "adicionar", produto, quantidade });
  }, []);
  const remover = useCallback((id: number) => {
    dispatch({ tipo: "remover", id });
  }, []);
  const alterarQuantidade = useCallback((id: number, quantidade: number) => {
    dispatch({ tipo: "alterarQuantidade", id, quantidade });
  }, []);
  const limpar = useCallback(() => {
    dispatch({ tipo: "limpar" });
  }, []);
  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);

  const valor = useMemo<CarrinhoContexto>(() => {
    const subtotal = calcularSubtotal(itens);
    return {
      itens,
      adicionar,
      remover,
      alterarQuantidade,
      limpar,
      totalItens: calcularTotalItens(itens),
      subtotal,
      subtotalFormatado: formatarBRL(subtotal),
      temItemSobConsulta: itens.some(ehSobConsulta),
      aberto,
      abrir,
      fechar,
    };
  }, [itens, aberto, adicionar, remover, alterarQuantidade, limpar, abrir, fechar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrinho(): CarrinhoContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useCarrinho precisa estar dentro de <CarrinhoProvider>.");
  }
  return contexto;
}
