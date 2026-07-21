import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getImagemProduto,
  invalidarImagemGrande,
  __limparCachesDeImagem,
  type ImagemProduto,
} from "../bling";

// Auth fakes (não tocam rede/store).
const authComCred = {
  hasCredentials: async () => true,
  getAccessToken: async () => "token-teste",
};
const authSemCred = {
  hasCredentials: async () => false,
  getAccessToken: async () => "",
};

const noop = async () => {};

const MINIATURA =
  "https://s3.amazonaws.com/mini-70x70.jpg?Expires=1&Signature=a";

/** Catálogo de 1 página com produtos 1 (com imagem) e 2 (sem imagem). */
const listagem = {
  data: [
    {
      id: 1,
      nome: "Com imagem",
      preco: 100,
      situacao: "A",
      imagemURL: MINIATURA,
    },
    { id: 2, nome: "Sem imagem", preco: 100, situacao: "A" },
  ],
};

const detalheComInternas = {
  data: {
    midia: {
      imagens: {
        internas: [
          { link: "https://s3/grande-ordem2.jpg", linkMiniatura: "x", ordem: 2 },
          { link: "https://s3/grande-ordem1.jpg", linkMiniatura: "x", ordem: 1 },
        ],
        externas: [{ link: "https://externa.com/foto.jpg" }],
      },
    },
  },
};

const detalheSoExternas = {
  data: {
    midia: {
      imagens: {
        internas: [],
        externas: [{ link: "https://externa.com/foto.jpg" }],
      },
    },
  },
};

const detalheSemMidia = { data: { id: 1, nome: "Com imagem" } };

function jsonRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** fetch fake: roteia listagem (querystring `pagina=`) vs detalhe (`/produtos/{id}`). */
function fetchRouter(detalhe: { body?: unknown; status?: number }) {
  const inits = new Map<string, RequestInit | undefined>();
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    inits.set(url, init);
    if (url.includes("pagina=")) return jsonRes(listagem);
    return jsonRes(detalhe.body ?? {}, detalhe.status ?? 200);
  });
  return Object.assign(fn, { inits });
}

function chamadasDeDetalhe(fetchFn: ReturnType<typeof fetchRouter>): string[] {
  return fetchFn.mock.calls
    .map((c) => String(c[0]))
    .filter((u) => !u.includes("pagina="));
}

beforeEach(() => {
  __limparCachesDeImagem();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getImagemProduto", () => {
  it("detalhe com internas → grande = link da menor ordem, com Bearer no header", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });

    const r = await getImagemProduto(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.grande).toBe("https://s3/grande-ordem1.jpg");
    expect(r.miniatura).toBe(MINIATURA);

    const detalhes = chamadasDeDetalhe(fetchFn);
    expect(detalhes).toHaveLength(1);
    expect(detalhes[0]).toContain("/produtos/1");

    const headers = (fetchFn.inits.get(detalhes[0])?.headers ?? {}) as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer token-teste");
  });

  it("cache: segunda chamada do mesmo id não refaz o fetch de detalhe", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    const r1 = await getImagemProduto(1, deps);
    const r2 = await getImagemProduto(1, deps);

    expect(r1.grande).toBe(r2.grande);
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(1);
  });

  it("sem internas → usa a primeira externa", async () => {
    const fetchFn = fetchRouter({ body: detalheSoExternas });

    const r = await getImagemProduto(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });
    expect(r.grande).toBe("https://externa.com/foto.jpg");
  });

  it("detalhe sem mídia → grande null com cache negativo, miniatura preservada", async () => {
    const fetchFn = fetchRouter({ body: detalheSemMidia });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    const r1 = await getImagemProduto(1, deps);
    const r2 = await getImagemProduto(1, deps); // dentro do TTL negativo

    expect(r1.grande).toBeNull();
    expect(r1.miniatura).toBe(MINIATURA);
    expect(r2.grande).toBeNull();
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(1); // não martelou a API
  });

  it("detalhe 429 → grande null sem lançar, miniatura preservada", async () => {
    const fetchFn = fetchRouter({ status: 429 });

    const r = await getImagemProduto(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });
    expect(r.grande).toBeNull();
    expect(r.miniatura).toBe(MINIATURA);
  });

  it("fetch de detalhe que lança → grande null sem propagar o erro", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("pagina=")) return jsonRes(listagem);
      throw new Error("rede caiu");
    });

    const r = await getImagemProduto(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });
    expect(r.grande).toBeNull();
    expect(r.miniatura).toBe(MINIATURA);
  });

  it("sem credenciais (fonte mock) → nunca chama o detalhe", async () => {
    const fetchFn = vi.fn();

    const r = await getImagemProduto(1, {
      auth: authSemCred,
      fetchFn,
      sleep: noop,
    });
    expect(r.grande).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("id fora do catálogo → tudo null, sem gastar chamada de detalhe", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });

    const r = await getImagemProduto(999, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });
    expect(r).toEqual({ grande: null, miniatura: null });
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(0);
  });

  it("produto do catálogo sem imagem na listagem → tudo null, sem detalhe", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });

    const r = await getImagemProduto(2, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });
    expect(r).toEqual({ grande: null, miniatura: null });
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(0);
  });

  it("invalidarImagemGrande → próximo hit re-resolve o detalhe", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    await getImagemProduto(1, deps);
    invalidarImagemGrande(1);
    await getImagemProduto(1, deps);

    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(2);
  });

  it("fila serial: chama sleep(350) após cada fetch de detalhe (rate limit)", async () => {
    const fetchFn = fetchRouter({ body: detalheComInternas });
    const sleep = vi.fn(async () => {});
    const deps = { auth: authComCred, fetchFn, sleep };

    await getImagemProduto(1, deps);
    invalidarImagemGrande(1);
    await getImagemProduto(1, deps);

    expect(sleep).toHaveBeenCalledWith(350);
  });

  it("teto da fila: com 8 detalhes pendentes, novas requests degradam para a miniatura", async () => {
    const listagemGrande = {
      data: Array.from({ length: 12 }, (_, i) => ({
        id: 100 + i,
        nome: `Produto ${i}`,
        preco: 100,
        situacao: "A",
        imagemURL: `${MINIATURA}&i=${i}`,
      })),
    };
    let liberarDetalhe!: (r: Response) => void;
    const detalhePendente = new Promise<Response>((res) => {
      liberarDetalhe = res;
    });
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("pagina=")) return jsonRes(listagemGrande);
      return detalhePendente; // detalhe preso até liberarmos no fim
    });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    const chamadas = Array.from({ length: 10 }, (_, i) =>
      getImagemProduto(100 + i, deps),
    );
    const resolvidas: ImagemProduto[] = [];
    chamadas.forEach((p) => void p.then((r) => resolvidas.push(r)));
    await new Promise((r) => setTimeout(r, 20));

    // 8 entraram na fila (presas no detalhe); 2 degradaram na hora.
    expect(resolvidas).toHaveLength(2);
    for (const r of resolvidas) {
      expect(r.grande).toBeNull();
      expect(r.miniatura).toContain("mini-70x70");
    }

    // Drena a fila: as 8 presas resolvem com a imagem grande.
    liberarDetalhe(jsonRes(detalheComInternas));
    const todas = await Promise.all(chamadas);
    expect(
      todas.filter((r) => r.grande === "https://s3/grande-ordem1.jpg"),
    ).toHaveLength(8);
  });
});
