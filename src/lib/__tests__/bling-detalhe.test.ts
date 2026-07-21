import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getProdutoDetalhe,
  getImagemProduto,
  htmlParaTextoPuro,
  __limparCachesDeImagem,
} from "../bling";
import { mockProdutos } from "../mock-produtos";

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

/** Catálogo de 1 página com o produto 1 (com imagem e descrição curta). */
const listagem = {
  data: [
    {
      id: 1,
      nome: "Perfume Teste",
      preco: 100,
      situacao: "A",
      descricaoCurta: "Resumo da listagem.",
      imagemURL: MINIATURA,
    },
  ],
};

/** Detalhe com 2 internas fora de ordem + 1 externa e HTML na complementar. */
const detalheCompleto = {
  data: {
    id: 1,
    descricaoCurta: "Resumo da listagem.",
    descricaoComplementar:
      "<p>Notas de <b>oud</b> &amp; rosa.</p><p>Fixação longa&nbsp;— 8h.</p>",
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

function jsonRes(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** fetch fake: roteia listagem (`pagina=`) vs detalhe (`/produtos/{id}`). */
function fetchRouter(detalhe: { body?: unknown; status?: number }) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("pagina=")) return jsonRes(listagem);
    return jsonRes(detalhe.body ?? {}, detalhe.status ?? 200);
  });
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

describe("htmlParaTextoPuro", () => {
  it("remove tags, decodifica entidades e mantém parágrafos como \\n\\n", () => {
    const texto = htmlParaTextoPuro(
      "<p>Oud &amp; rosa</p><p>Fixação&nbsp;longa</p>",
    );
    expect(texto).toBe("Oud & rosa\n\nFixação longa");
    expect(texto).not.toContain("<");
  });

  it("<br> vira quebra e espaços repetidos são colapsados", () => {
    expect(htmlParaTextoPuro("linha 1<br/>linha    2")).toBe(
      "linha 1\n\nlinha 2",
    );
  });

  it("neutraliza script/style e não reconstrói tag ao decodificar entidade", () => {
    const texto = htmlParaTextoPuro(
      "<script>alert(1)</script>ok &lt;script&gt;x&lt;/script&gt;",
    );
    expect(texto).toBe("ok <script>x</script>"); // texto inerte, nunca HTML
    expect(texto).not.toContain("alert");
  });

  it("decodifica &amp; por último (não duplica decodificação)", () => {
    expect(htmlParaTextoPuro("a &amp;lt; b")).toBe("a &lt; b");
  });

  it("HTML vazio/só tags → string vazia", () => {
    expect(htmlParaTextoPuro("<p>  </p>")).toBe("");
  });
});

describe("getProdutoDetalhe — caminho bling", () => {
  it("extrai descrição em texto puro e galeria ordenada (internas por ordem, depois externas)", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });

    const r = await getProdutoDetalhe(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.fonte).toBe("bling");
    expect(r.produto?.nome).toBe("Perfume Teste");
    expect(r.produto?.precoFormatado?.replace(/\s/g, " ")).toBe("R$ 100,00");
    expect(r.produto?.descricao).toBe(
      "Notas de oud & rosa.\n\nFixação longa — 8h.",
    );
    expect(r.produto?.descricao).not.toContain("<");
    expect(r.produto?.imagens).toEqual([
      "/api/imagem?id=1&i=0",
      "/api/imagem?id=1&i=1",
      "/api/imagem?id=1&i=2",
    ]);
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(1);
  });

  it("uma única busca de detalhe alimenta descrição E proxy de imagem", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    await getProdutoDetalhe(1, deps);
    const img = await getImagemProduto(1, deps);

    expect(img.grande).toBe("https://s3/grande-ordem1.jpg");
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(1); // sem 2ª requisição
  });

  it("id fora do catálogo → produto null, sem gastar chamada de detalhe", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });

    const r = await getProdutoDetalhe(999, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r).toEqual({ fonte: "bling", produto: null });
    expect(chamadasDeDetalhe(fetchFn)).toHaveLength(0);
  });

  it("detalhe 429 → degrada: produto ainda volta com dados da listagem", async () => {
    const fetchFn = fetchRouter({ status: 429 });

    const r = await getProdutoDetalhe(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.fonte).toBe("bling");
    expect(r.produto?.nome).toBe("Perfume Teste");
    expect(r.produto?.descricao).toBe("Resumo da listagem."); // sem descrição rica
    expect(r.produto?.imagens).toEqual(["/api/imagem?id=1"]); // imagem da listagem
  });

  it("fetch de detalhe que lança → produto ainda volta, sem propagar o erro", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("pagina=")) return jsonRes(listagem);
      throw new Error("rede caiu");
    });

    const r = await getProdutoDetalhe(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.produto?.imagens).toEqual(["/api/imagem?id=1"]);
    expect(r.produto?.descricao).toBe("Resumo da listagem.");
  });

  it("detalhe sem mídia nem descrição → galeria da listagem, descrição curta", async () => {
    const fetchFn = fetchRouter({ body: { data: { id: 1 } } });

    const r = await getProdutoDetalhe(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.produto?.imagens).toEqual(["/api/imagem?id=1"]);
    expect(r.produto?.descricao).toBe("Resumo da listagem.");
  });
});

describe("getProdutoDetalhe — caminho mock", () => {
  it("devolve a descrição longa do mock sem jamais chamar a API", async () => {
    const fetchFn = vi.fn();

    const r = await getProdutoDetalhe(1, { auth: authSemCred, fetchFn });

    expect(r.fonte).toBe("mock");
    expect(r.produto?.nome).toBe(mockProdutos[0].nome);
    expect(r.produto?.descricao).toBe(mockProdutos[0].descricaoLonga);
    expect(r.produto?.imagens).toEqual([]); // mock sem imagem → UI usa placeholder
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("todo produto do mock tem descrição curta e longa", () => {
    for (const p of mockProdutos) {
      expect(p.descricaoCurta.trim().length).toBeGreaterThan(0);
      expect(p.descricaoLonga.trim().length).toBeGreaterThan(40);
    }
  });

  it("id inexistente no mock → produto null", async () => {
    const r = await getProdutoDetalhe(999, { auth: authSemCred });
    expect(r).toEqual({ fonte: "mock", produto: null });
  });
});

describe("getImagemProduto — índice de galeria", () => {
  it("sem índice → imagem principal (zero regressão)", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });

    const r = await getImagemProduto(1, {
      auth: authComCred,
      fetchFn,
      sleep: noop,
    });

    expect(r.grande).toBe("https://s3/grande-ordem1.jpg");
    expect(r.miniatura).toBe(MINIATURA);
  });

  it("índice > 0 → n-ésima imagem, sem fallback para a miniatura da principal", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });
    const deps = { auth: authComCred, fetchFn, sleep: noop };

    expect((await getImagemProduto(1, deps, 1)).grande).toBe(
      "https://s3/grande-ordem2.jpg",
    );
    const externa = await getImagemProduto(1, deps, 2);
    expect(externa.grande).toBe("https://externa.com/foto.jpg");
    expect(externa.miniatura).toBeNull();
  });

  it("índice fora do range → tudo null (404 no proxy)", async () => {
    const fetchFn = fetchRouter({ body: detalheCompleto });

    const r = await getImagemProduto(
      1,
      { auth: authComCred, fetchFn, sleep: noop },
      9,
    );
    expect(r).toEqual({ grande: null, miniatura: null });
  });
});
