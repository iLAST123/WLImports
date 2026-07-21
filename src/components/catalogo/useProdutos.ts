"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Produto, ProdutosResponse } from "@/lib/types";

export type StatusCatalogo = "loading" | "error" | "ready";

/** Busca pura, sem React: os dois chamadores (carga inicial e retry) aplicam
 *  o resultado no estado por conta própria. */
async function buscarProdutos(): Promise<Produto[]> {
  const res = await fetch("/api/produtos");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as ProdutosResponse;
  return data.produtos ?? [];
}

/**
 * Fonte ÚNICA do catálogo no cliente — usada tanto pela prévia da home
 * (`sections/Catalog.tsx`) quanto pela PLP (`/catalogo`). A lógica de fetch
 * não é duplicada em dois lugares de propósito.
 *
 * Uma chamada a `/api/produtos` por montagem, e só. Busca, filtro, ordenação e
 * contagem acontecem em memória sobre este payload — o número de chamadas ao
 * Bling por pageview NÃO aumenta (restrição dura do projeto).
 *
 * O effect NÃO chama nenhuma função que faça `setState` de forma síncrona:
 * `react-hooks/set-state-in-effect` é ERRO neste projeto e pega até chamada
 * indireta (um `useCallback` que contém setState, invocado no corpo do
 * effect). Por isso o `setState` só acontece dentro da IIFE, depois do await.
 *
 * `dadosIniciais` (F1): quando a PLP é server-rendered, o servidor já resolveu
 * `getProdutos()` e passa a lista pronta — o hook inicia em `ready` e PULA o
 * fetch de montagem (zero flash de "Carregando…", zero chamada redundante). O
 * retry manual do estado de erro continua disponível para interações. A home
 * segue chamando `useProdutos()` sem argumento (fetch client, inalterado).
 */
export function useProdutos(dadosIniciais?: Produto[]) {
  const temIniciais = dadosIniciais !== undefined;
  const [status, setStatus] = useState<StatusCatalogo>(
    temIniciais ? "ready" : "loading",
  );
  const [produtos, setProdutos] = useState<Produto[]>(dadosIniciais ?? []);

  // Guard de unmount compartilhado entre a carga inicial e o retry.
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    // Server já entregou os dados: nada a buscar na montagem.
    if (temIniciais) {
      return () => {
        vivo.current = false;
      };
    }
    (async () => {
      try {
        const lista = await buscarProdutos();
        if (!vivo.current) return;
        setProdutos(lista);
        setStatus("ready");
      } catch {
        if (vivo.current) setStatus("error");
      }
    })();
    return () => {
      vivo.current = false;
    };
  }, [temIniciais]);

  /** Retry manual do estado de erro — handler de evento, nunca effect. */
  const recarregar = useCallback(() => {
    setStatus("loading");
    (async () => {
      try {
        const lista = await buscarProdutos();
        if (!vivo.current) return;
        setProdutos(lista);
        setStatus("ready");
      } catch {
        if (vivo.current) setStatus("error");
      }
    })();
  }, []);

  return { status, produtos, recarregar };
}
