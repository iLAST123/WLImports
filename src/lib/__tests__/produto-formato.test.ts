import { describe, it, expect } from "vitest";
import { separarVolume } from "../produto-formato";

describe("separarVolume — reconhecimento", () => {
  it("ml colado no fim", () => {
    expect(separarVolume("Oud Impérial — Eau de Parfum 100ml")).toEqual({
      nome: "Oud Impérial — Eau de Parfum",
      volume: "100 ml",
    });
  });

  it("ml separado por espaço", () => {
    expect(separarVolume("Fleur de Sel Eau de Parfum 75 ml")).toEqual({
      nome: "Fleur de Sel Eau de Parfum",
      volume: "75 ml",
    });
  });

  it("ml em caixa alta e mista", () => {
    expect(separarVolume("Vétiver Noir Decant 10ML").volume).toBe("10 ml");
    expect(separarVolume("Vétiver Noir Decant 10mL").volume).toBe("10 ml");
  });

  it("decimal com vírgula e com ponto normalizam para vírgula", () => {
    expect(separarVolume("Água de Colônia 1,5L")).toEqual({
      nome: "Água de Colônia",
      volume: "1,5 L",
    });
    expect(separarVolume("Água de Colônia 1.5L").volume).toBe("1,5 L");
  });

  it("litro em minúscula vira L maiúsculo; decimal zerado some", () => {
    expect(separarVolume("Loção Corporal 2 l").volume).toBe("2 L");
    expect(separarVolume("Loção Corporal 100,0 ml").volume).toBe("100 ml");
  });

  it("volume entre parênteses não deixa parêntese órfão", () => {
    expect(separarVolume("Santal Doré (10ml)")).toEqual({
      nome: "Santal Doré",
      volume: "10 ml",
    });
  });

  it("limpa travessão/hífen/espaço órfão deixado pela remoção", () => {
    expect(separarVolume("Musc Nomade — 90ml").nome).toBe("Musc Nomade");
    expect(separarVolume("Musc Nomade - 90 ml").nome).toBe("Musc Nomade");
    expect(separarVolume("Musc Nomade, 90ml.").nome).toBe("Musc Nomade");
  });

  it("preserva pontuação interna do nome", () => {
    expect(separarVolume("Bois de Minuit — Decant 10ml").nome).toBe(
      "Bois de Minuit — Decant",
    );
  });
});

describe("separarVolume — conservadorismo (nome intacto)", () => {
  it("nome sem volume volta idêntico", () => {
    const nome = "Iris Poudré Eau de Parfum";
    expect(separarVolume(nome)).toEqual({ nome });
    expect(separarVolume(nome).volume).toBeUndefined();
  });

  it("número que NÃO é volume não vira volume", () => {
    expect(separarVolume("Chanel No 5")).toEqual({ nome: "Chanel No 5" });
    expect(separarVolume("Kit 3 peças")).toEqual({ nome: "Kit 3 peças" });
    expect(separarVolume("Edição 2024")).toEqual({ nome: "Edição 2024" });
  });

  it("volume no MEIO do nome é ignorado (não mutila)", () => {
    const nome = "Refil 100ml para Difusor";
    expect(separarVolume(nome)).toEqual({ nome });
  });

  it("string vazia", () => {
    expect(separarVolume("")).toEqual({ nome: "" });
  });

  it("nome que é só o volume não vira nome vazio", () => {
    expect(separarVolume("100ml")).toEqual({ nome: "100ml" });
    expect(separarVolume("— 100ml").nome).toBe("— 100ml");
  });

  it("kit/combo com dois volumes fica intacto", () => {
    const nome = "Kit Viagem 50ml + 10ml";
    expect(separarVolume(nome)).toEqual({ nome });
    expect(separarVolume("Kit com 100ml")).toEqual({ nome: "Kit com 100ml" });
  });

  it("unidade colada em palavra maior não conta", () => {
    expect(separarVolume("Perfume 100 mls")).toEqual({ nome: "Perfume 100 mls" });
    expect(separarVolume("Difusor 2x50ml")).toEqual({ nome: "Difusor 2x50ml" });
  });

  it("volume zero não é volume", () => {
    expect(separarVolume("Amostra 0ml")).toEqual({ nome: "Amostra 0ml" });
  });

  it("número grudado na palavra anterior não casa", () => {
    expect(separarVolume("Frasco100ml")).toEqual({ nome: "Frasco100ml" });
  });
});
