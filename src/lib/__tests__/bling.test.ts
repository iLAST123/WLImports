import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProdutos } from "../bling";

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

interface RawItem {
  id: number;
  nome: string;
  preco?: number;
  situacao?: string;
  descricaoCurta?: string;
  imagemURL?: string;
}

function itens(n: number, startId = 0): RawItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: startId + i,
    nome: `Produto ${startId + i}`,
    preco: 100,
    situacao: "A",
  }));
}

function pageRes(data: RawItem[]): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data }),
  } as unknown as Response;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getProdutos", () => {
  it("sem credenciais → mock com 12 itens e precoFormatado presente", async () => {
    const r = await getProdutos({ auth: authSemCred });
    expect(r.fonte).toBe("mock");
    expect(r.produtos).toHaveLength(12);
    expect(r.produtos[0].precoFormatado).toBeTruthy();
  });

  it("paginação 100+100+30 = 230, para e chama sleep(350) entre páginas", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(pageRes(itens(100, 0)))
      .mockResolvedValueOnce(pageRes(itens(100, 100)))
      .mockResolvedValueOnce(pageRes(itens(30, 200)));
    const sleep = vi.fn(async () => {});

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep });
    expect(r.fonte).toBe("bling");
    expect(r.produtos).toHaveLength(230);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2); // entre páginas, não antes da 1ª
    expect(sleep).toHaveBeenCalledWith(350);
  });

  it("para em página vazia", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(pageRes(itens(100, 0)))
      .mockResolvedValueOnce(pageRes([]));

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    expect(r.produtos).toHaveLength(100);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("respeita o teto de 30 páginas", async () => {
    const fetchFn = vi.fn(async () => pageRes(itens(100, 0)));

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    expect(fetchFn).toHaveBeenCalledTimes(30);
    expect(r.produtos).toHaveLength(3000);
    expect(r.fonte).toBe("bling");
  });

  it("tratamento: preço 0 → consultar sem precoFormatado; 549.9 → 'R$ 549,90'; 'I' filtrado; descrição '' → undefined; imagem → /api/imagem", async () => {
    const raws: RawItem[] = [
      { id: 1, nome: "Zero", preco: 0, situacao: "A" },
      {
        id: 2,
        nome: "Valido",
        preco: 549.9,
        situacao: "A",
        descricaoCurta: "",
        imagemURL: "https://s3.amazonaws.com/x.jpg?Expires=123&Signature=abc",
      },
      { id: 3, nome: "Inativo", preco: 100, situacao: "I" },
    ];
    const fetchFn = vi.fn().mockResolvedValueOnce(pageRes(raws)); // 3 < 100 → para

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    expect(r.produtos).toHaveLength(2); // inativo filtrado

    const zero = r.produtos.find((p) => p.id === 1)!;
    expect(zero.consultar).toBe(true);
    expect(zero.precoFormatado).toBeUndefined();
    expect(zero.preco).toBeUndefined();

    const valido = r.produtos.find((p) => p.id === 2)!;
    // Intl pt-BR usa espaço NÃO-SEPARÁVEL (U+00A0) entre "R$" e o número.
    // NBSP entre "R$" e o numero (nao pode ser espaco ASCII);
    // normalizado deve ser exatamente "R$ 549,90".
    expect(valido.precoFormatado).not.toContain("R$ 549");
    expect(valido.precoFormatado?.replace(/\s/g, " ")).toBe("R$ 549,90");
    expect(valido.consultar).toBeUndefined();
    expect(valido.descricaoCurta).toBeUndefined();
    expect(valido.imagemURL).toBe("/api/imagem?id=2");
  });

  it("401 nos produtos → fonte mock sem lançar", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response);

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    expect(r.fonte).toBe("mock");
    expect(r.produtos).toHaveLength(12);
  });

  it("erro ao obter token → fonte mock sem lançar", async () => {
    const authQuebrado = {
      hasCredentials: async () => true,
      getAccessToken: async () => {
        throw new Error("BlingAuthError");
      },
    };
    const r = await getProdutos({
      auth: authQuebrado,
      fetchFn: vi.fn(),
      sleep: noop,
    });
    expect(r.fonte).toBe("mock");
    expect(r.produtos).toHaveLength(12);
  });

  // ---- Campos editoriais (notas/destaque) ----
  // Regra de produto: é PROIBIDO inventar nota olfativa ou tag editorial para
  // produto real do ERP. O contrato precisa valer nos DOIS sentidos, então os
  // dois sentidos são travados aqui.

  it("mock: campos editoriais chegam à UI", async () => {
    const r = await getProdutos({ auth: authSemCred });
    expect(r.fonte).toBe("mock");
    // Sem este repasse, o mock rico é achatado e o layout "cheio" da vitrine
    // nunca aparece — todo card renderiza degradado.
    expect(r.produtos.some((p) => p.notas)).toBe(true);
    expect(r.produtos.some((p) => p.destaque)).toBe(true);
    // E o mock é deliberadamente misto, para provar a degradação no dev.
    expect(r.produtos.some((p) => !p.notas && !p.destaque)).toBe(true);
  });

  it("bling: produto real NUNCA ganha notas/destaque", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(pageRes(itens(3)))
      .mockResolvedValueOnce(pageRes([]));

    const r = await getProdutos({ auth: authComCred, fetchFn, sleep: noop });
    expect(r.fonte).toBe("bling");
    expect(r.produtos.length).toBeGreaterThan(0);
    for (const p of r.produtos) {
      expect(p.notas).toBeUndefined();
      expect(p.destaque).toBeUndefined();
    }
  });
});
