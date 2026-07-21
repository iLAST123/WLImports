import { describe, it, expect } from "vitest";
import { slugify, montarSlugProduto, extrairIdDeSlug } from "../slug";

describe("slugify", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(slugify("Ébène Noir 100ml")).toBe("ebene-noir-100ml");
    expect(slugify("Oud Impérial — Eau de Parfum")).toBe(
      "oud-imperial-eau-de-parfum",
    );
  });

  it("trata NBSP (U+00A0) como separador → hífen único", () => {
    expect(slugify("Musc Nomade")).toBe("musc-nomade");
    // NBSP + espaços em volta colapsam num só hífen.
    expect(slugify("Santal   Doré")).toBe("santal-dore");
  });

  it("colapsa símbolos/pontuação em um hífen e apara as pontas", () => {
    expect(slugify("  Fleur de Sel!!!  ")).toBe("fleur-de-sel");
    expect(slugify("A & B / C")).toBe("a-b-c");
    expect(slugify("---Iris---")).toBe("iris");
  });

  it("nome vazio ou só símbolos → string vazia", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("!!! --- ###")).toBe("");
    expect(slugify("™©®")).toBe("");
  });

  it("não-string → string vazia", () => {
    // @ts-expect-error validação defensiva de runtime
    expect(slugify(undefined)).toBe("");
    // @ts-expect-error validação defensiva de runtime
    expect(slugify(null)).toBe("");
  });

  it("limita a ~80 chars sem cortar no meio de palavra quando há fronteira", () => {
    const nome = "palavra ".repeat(20).trim(); // 20 × "palavra"
    const slug = slugify(nome);
    expect(slug.length).toBeLessThanOrEqual(80);
    // não termina em hífen nem em palavra partida
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.split("-").every((p) => p === "palavra")).toBe(true);
  });

  it("palavra única gigante sem fronteira → corte simples em 80", () => {
    const slug = slugify("a".repeat(200));
    expect(slug).toBe("a".repeat(80));
  });
});

describe("montarSlugProduto", () => {
  it("junta slug e id no sufixo", () => {
    expect(montarSlugProduto("Kit Body Butterlly", 16678961877)).toBe(
      "kit-body-butterlly-16678961877",
    );
  });

  it("slug vazio → fallback p-<id> (nunca começa por dígito)", () => {
    expect(montarSlugProduto("™©®", 42)).toBe("p-42");
    expect(montarSlugProduto("", 42)).toBe("p-42");
  });

  it("é reversível por extrairIdDeSlug em ambos os casos", () => {
    expect(extrairIdDeSlug(montarSlugProduto("Ébène Noir", 123))).toBe(123);
    expect(extrairIdDeSlug(montarSlugProduto("###", 999))).toBe(999);
  });
});

describe("extrairIdDeSlug", () => {
  it("(a) id no sufixo do slug canônico", () => {
    expect(extrairIdDeSlug("kit-body-butterlly-16678961877")).toBe(16678961877);
    expect(extrairIdDeSlug("ebene-noir-123")).toBe(123);
  });

  it("(b) param só-dígitos (URL antiga /produto/[id])", () => {
    expect(extrairIdDeSlug("16678961877")).toBe(16678961877);
    expect(extrairIdDeSlug(" 42 ")).toBe(42);
  });

  it("param sem id no fim → null", () => {
    expect(extrairIdDeSlug("produto-sem-id")).toBeNull();
    expect(extrairIdDeSlug("kit-16-extra")).toBeNull();
    expect(extrairIdDeSlug("abc123def")).toBeNull();
    expect(extrairIdDeSlug("")).toBeNull();
    expect(extrairIdDeSlug("-")).toBeNull();
  });

  it("id inválido (0, negativo, além do seguro) → null", () => {
    expect(extrairIdDeSlug("produto-0")).toBeNull();
    expect(extrairIdDeSlug("0")).toBeNull();
    // 9999999999999999999999 > Number.MAX_SAFE_INTEGER
    expect(extrairIdDeSlug("kit-9999999999999999999999")).toBeNull();
    expect(extrairIdDeSlug("9999999999999999999999")).toBeNull();
  });

  it("não-string → null", () => {
    // @ts-expect-error validação defensiva de runtime
    expect(extrairIdDeSlug(undefined)).toBeNull();
    // @ts-expect-error validação defensiva de runtime
    expect(extrairIdDeSlug(42)).toBeNull();
  });
});
