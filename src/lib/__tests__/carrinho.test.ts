import { describe, it, expect } from "vitest";
import {
  QUANTIDADE_MAXIMA,
  calcularSubtotal,
  calcularTotalItens,
  carrinhoReducer,
  desserializarCarrinho,
  formatarBRL,
  normalizarQuantidade,
  serializarCarrinho,
  type ItemCarrinho,
} from "../carrinho";
import type { Produto } from "../types";

// Sem jsdom configurado no projeto: testamos o núcleo puro (reducer +
// serialização), que é exatamente onde mora a regra de negócio do carrinho.

const decant: Produto = {
  id: 1,
  nome: "Decant Oud Wood 10ml",
  preco: 189.9,
  precoFormatado: "R$ 189,90",
  imagemURL: "https://exemplo/1.jpg",
};

const tester: Produto = {
  id: 2,
  nome: "Tester Baccarat Rouge",
  consultar: true,
};

describe("carrinhoReducer", () => {
  it("adiciona um item novo", () => {
    const estado = carrinhoReducer([], {
      tipo: "adicionar",
      produto: decant,
      quantidade: 1,
    });
    expect(estado).toHaveLength(1);
    expect(estado[0]).toMatchObject({ id: 1, quantidade: 1, preco: 189.9 });
  });

  it("soma a quantidade quando o mesmo produto é adicionado de novo", () => {
    let estado = carrinhoReducer([], {
      tipo: "adicionar",
      produto: decant,
      quantidade: 2,
    });
    estado = carrinhoReducer(estado, {
      tipo: "adicionar",
      produto: decant,
      quantidade: 3,
    });
    expect(estado).toHaveLength(1);
    expect(estado[0].quantidade).toBe(5);
  });

  it("satura no teto de 99 por item", () => {
    let estado = carrinhoReducer([], {
      tipo: "adicionar",
      produto: decant,
      quantidade: 90,
    });
    estado = carrinhoReducer(estado, {
      tipo: "adicionar",
      produto: decant,
      quantidade: 50,
    });
    expect(estado[0].quantidade).toBe(QUANTIDADE_MAXIMA);

    const direto = carrinhoReducer(estado, {
      tipo: "alterarQuantidade",
      id: 1,
      quantidade: 1000,
    });
    expect(direto[0].quantidade).toBe(QUANTIDADE_MAXIMA);
  });

  it("normaliza quantidades inválidas", () => {
    expect(normalizarQuantidade(2.7)).toBe(2);
    expect(normalizarQuantidade(-3)).toBe(0);
    expect(normalizarQuantidade(Number.NaN)).toBe(0);
    expect(normalizarQuantidade("abc")).toBe(0);
  });

  it("remove item por id e por quantidade <= 0", () => {
    const base = carrinhoReducer([], {
      tipo: "adicionar",
      produto: decant,
      quantidade: 1,
    });
    expect(carrinhoReducer(base, { tipo: "remover", id: 1 })).toEqual([]);
    expect(
      carrinhoReducer(base, { tipo: "alterarQuantidade", id: 1, quantidade: 0 })
    ).toEqual([]);
    // id inexistente não altera o estado
    expect(carrinhoReducer(base, { tipo: "remover", id: 999 })).toHaveLength(1);
  });

  it("limpa o carrinho", () => {
    const base = carrinhoReducer([], {
      tipo: "adicionar",
      produto: decant,
      quantidade: 4,
    });
    expect(carrinhoReducer(base, { tipo: "limpar" })).toEqual([]);
  });

  it("marca produto sem preço como sob consulta, nunca preço 0", () => {
    const estado = carrinhoReducer([], {
      tipo: "adicionar",
      produto: tester,
      quantidade: 1,
    });
    expect(estado[0].consultar).toBe(true);
    expect(estado[0].preco).toBeUndefined();
    expect(estado[0].precoFormatado).toBeUndefined();
  });
});

describe("totais", () => {
  const itens: ItemCarrinho[] = [
    { id: 1, nome: "Decant", preco: 100, quantidade: 2 },
    { id: 2, nome: "Tester", consultar: true, quantidade: 3 },
    { id: 3, nome: "Sem preço", quantidade: 1 },
  ];

  it("soma todas as quantidades em totalItens", () => {
    expect(calcularTotalItens(itens)).toBe(6);
  });

  it("subtotal ignora itens sob consulta e sem preço", () => {
    expect(calcularSubtotal(itens)).toBe(200);
    expect(calcularSubtotal([])).toBe(0);
  });

  it("formata em BRL pt-BR (com NBSP após o R$)", () => {
    expect(formatarBRL(200)).toBe("R$ 200,00");
    expect(formatarBRL(1234.5)).toBe("R$ 1.234,50");
  });
});

describe("desserializarCarrinho", () => {
  it("recupera um carrinho válido (round-trip)", () => {
    const itens: ItemCarrinho[] = [
      { id: 1, nome: "Decant", preco: 100, precoFormatado: "R$ 100,00", quantidade: 2 },
    ];
    expect(desserializarCarrinho(serializarCarrinho(itens))).toEqual(itens);
  });

  it("devolve carrinho vazio para JSON corrompido ou ausente", () => {
    expect(desserializarCarrinho(null)).toEqual([]);
    expect(desserializarCarrinho("")).toEqual([]);
    expect(desserializarCarrinho("{isso não é json}")).toEqual([]);
    expect(desserializarCarrinho('{"itens":[]}')).toEqual([]);
    expect(desserializarCarrinho("null")).toEqual([]);
  });

  it("descarta entradas inválidas e mantém as boas", () => {
    const bruto = JSON.stringify([
      { id: "abc", nome: "id errado", quantidade: 1 },
      { id: 4, nome: "", quantidade: 1 },
      { id: 5, nome: "Sem quantidade" },
      { id: 6, nome: "Quantidade negativa", quantidade: -2 },
      { id: 7, nome: "Duplicado", preco: 10, quantidade: 1 },
      { id: 7, nome: "Duplicado", preco: 10, quantidade: 9 },
      { id: 8, nome: "Acima do teto", preco: 10, quantidade: 500 },
      null,
      "lixo",
    ]);
    const itens = desserializarCarrinho(bruto);
    expect(itens.map((i) => i.id)).toEqual([7, 8]);
    expect(itens[0].quantidade).toBe(1);
    expect(itens[1].quantidade).toBe(QUANTIDADE_MAXIMA);
  });

  it("trata item sem preço como sob consulta ao reidratar", () => {
    const itens = desserializarCarrinho(
      JSON.stringify([{ id: 9, nome: "Tester", quantidade: 1 }])
    );
    expect(itens[0].consultar).toBe(true);
    expect(itens[0].preco).toBeUndefined();
  });
});
