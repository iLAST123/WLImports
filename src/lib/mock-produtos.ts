import type { Produto } from "./types";

/**
 * Catálogo de demonstração — perfumes e decants FICTÍCIOS.
 * Nenhuma marca real. Usado quando `BLING_ACCESS_TOKEN` está ausente ou a
 * API do Bling falha (fallback resiliente).
 */
export const mockProdutos: Produto[] = [
  {
    id: 1,
    nome: "Oud Impérial — Eau de Parfum 100ml",
    descricaoCurta: "Oud resinoso e âmbar sobre um leito de rosa turca.",
    preco: 1299,
    categoria: "Unissex",
    imagemURL: undefined,
  },
  {
    id: 2,
    nome: "Vétiver Noir — Decant 10ml",
    descricaoCurta: "Vetiver esfumaçado e couro seco em traço mineral.",
    preco: 119,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 3,
    nome: "Fleur de Sel — Eau de Parfum 75ml",
    descricaoCurta: "Sal marinho e flor de laranjeira sob sol suave.",
    preco: 899,
    categoria: "Feminino",
    imagemURL: undefined,
  },
  {
    id: 4,
    nome: "Cuir Absolu — Eau de Parfum 100ml",
    descricaoCurta: "Couro fumê, açafrão e madeiras densas de inverno.",
    preco: 1499,
    categoria: "Masculino",
    imagemURL: undefined,
  },
  {
    id: 5,
    nome: "Néroli Blanc — Decant 10ml",
    descricaoCurta: "Néroli translúcido com petitgrain e almíscar limpo.",
    preco: 89,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 6,
    nome: "Ambre Solaire — Eau de Parfum 90ml",
    descricaoCurta: "Âmbar dourado, baunilha bourbon e benjoim quente.",
    preco: 1049,
    categoria: "Unissex",
    imagemURL: undefined,
  },
  {
    id: 7,
    nome: "Rose Sauvage — Eau de Parfum 75ml",
    descricaoCurta: "Rosa selvagem, pimenta rosa e um véu de patchouli.",
    preco: 799,
    categoria: "Feminino",
    imagemURL: undefined,
  },
  {
    id: 8,
    nome: "Bois de Minuit — Decant 10ml",
    descricaoCurta: "Cedro escuro e incenso sob uma lua de bergamota.",
    preco: 129,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 9,
    nome: "Tabac Royal — Eau de Parfum 100ml",
    descricaoCurta: "Fumo doce, mel e especiarias em madeira envernizada.",
    preco: 1199,
    categoria: "Masculino",
    imagemURL: undefined,
  },
  {
    id: 10,
    nome: "Iris Poudré — Eau de Parfum 75ml",
    descricaoCurta: "Íris aveludada, violeta em pó e um sopro de suede.",
    preco: 1349,
    categoria: "Feminino",
    imagemURL: undefined,
  },
  {
    id: 11,
    nome: "Santal Doré — Decant 10ml",
    descricaoCurta: "Sândalo cremoso, cardamomo e âmbar translúcido.",
    preco: 139,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 12,
    nome: "Musc Nomade — Eau de Parfum 90ml",
    descricaoCurta: "Almíscar quente, papiro seco e figueira ao entardecer.",
    preco: 649,
    categoria: "Unissex",
    imagemURL: undefined,
  },
];
