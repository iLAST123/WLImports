import { describe, it, expect } from "vitest";
import { SITE_URL, caminhoProduto, urlProduto } from "../urls";
import { montarSlugProduto } from "../slug";

describe("urls", () => {
  it("SITE_URL nunca termina em barra", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(SITE_URL).toMatch(/^https?:\/\//);
  });

  it("caminhoProduto usa o slug canônico e é relativo", () => {
    const caminho = caminhoProduto("Oud Impérial — Eau de Parfum 100ml", 42);
    expect(caminho).toBe(`/produto/${montarSlugProduto("Oud Impérial — Eau de Parfum 100ml", 42)}`);
    expect(caminho).toBe("/produto/oud-imperial-eau-de-parfum-100ml-42");
    expect(caminho.startsWith("/")).toBe(true);
  });

  it("urlProduto é o caminho canônico absoluto sobre SITE_URL", () => {
    expect(urlProduto("Vétiver Noir — Decant 10ml", 7)).toBe(
      `${SITE_URL}/produto/vetiver-noir-decant-10ml-7`,
    );
  });

  it("nome vazio/só símbolos cai no fallback p-<id> (nunca começa por dígito)", () => {
    expect(caminhoProduto("!!!", 99)).toBe("/produto/p-99");
    expect(urlProduto("", 5)).toBe(`${SITE_URL}/produto/p-5`);
  });
});
