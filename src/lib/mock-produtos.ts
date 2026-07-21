import type { Produto } from "./types";

/**
 * Produto do catálogo de demonstração. Além do contrato público `Produto`,
 * carrega os campos que a PÁGINA DE DETALHE precisa — `descricaoCurta` sempre
 * preenchida e uma `descricaoLonga` — para que produto, carrinho e checkout
 * funcionem 100% sem credencial do Bling.
 */
export interface ProdutoMock extends Produto {
  descricaoCurta: string;
  descricaoLonga: string;
}

/**
 * Catálogo de demonstração — perfumes e decants FICTÍCIOS.
 * Nenhuma marca real. Usado quando `BLING_ACCESS_TOKEN` está ausente ou a
 * API do Bling falha (fallback resiliente).
 *
 * Este mock é DELIBERADAMENTE desigual: `notas`/`destaque` existem só em
 * alguns itens (os ids 5, 8 e 11 não têm nenhum dos dois) e nenhum item tem
 * imagem. É assim de propósito — a vitrine precisa provar, em dev, que a
 * AUSÊNCIA também fica bonita, porque é o estado normal do produto real do
 * Bling. `notas` e `destaque` são exclusivos do mock; ver `types.ts`.
 *
 * O volume NÃO é campo aqui: ele já está dentro de `nome` e sai por
 * `separarVolume()` (`produto-formato.ts`). Não duplicar.
 */
export const mockProdutos: ProdutoMock[] = [
  {
    id: 1,
    nome: "Oud Impérial — Eau de Parfum 100ml",
    descricaoCurta: "Oud resinoso e âmbar sobre um leito de rosa turca.",
    descricaoLonga:
      "Uma composição oriental construída em torno do oud, com a resina abrindo densa e escura antes de assentar sobre rosa turca e âmbar.\n\nAs primeiras horas trazem açafrão e um toque cítrico que mantém o conjunto respirável; no fundo, madeiras e baunilha prolongam o rastro.\n\nProjeção alta e fixação de 8 a 12 horas na pele. Indicado para noite e para dias frios.",
    preco: 1299,
    categoria: "Unissex",
    notas: "Oud, rosa turca, âmbar",
    destaque: "Mais procurado",
    imagemURL: undefined,
  },
  {
    id: 2,
    nome: "Vétiver Noir — Decant 10ml",
    descricaoCurta: "Vetiver esfumaçado e couro seco em traço mineral.",
    descricaoLonga:
      "Vetiver do Haiti tratado em chave seca e mineral, com fumaça discreta e um couro que aparece já nos primeiros minutos.\n\nO decant de 10ml é envasado sob demanda a partir do frasco original, ideal para conhecer a fragrância antes de investir no tamanho cheio.\n\nProjeção moderada e fixação de 6 a 8 horas. Uso diário, do escritório ao fim de tarde.",
    preco: 119,
    categoria: "Decants",
    notas: "Vetiver, couro, mineral",
    imagemURL: undefined,
  },
  {
    id: 3,
    nome: "Fleur de Sel — Eau de Parfum 75ml",
    descricaoCurta: "Sal marinho e flor de laranjeira sob sol suave.",
    descricaoLonga:
      "Um floral solar e salgado: flor de laranjeira e néroli sobre uma base salina que lembra pele depois do mar.\n\nA saída traz bergamota e uma pitada de pimenta rosa; o fundo, almíscar branco e um sândalo leve que arredonda o conjunto.\n\nProjeção média e fixação de 5 a 7 horas. Perfeito para primavera, verão e uso diurno.",
    preco: 899,
    categoria: "Feminino",
    notas: "Flor de laranjeira, néroli, sal",
    destaque: "Chegou agora",
    imagemURL: undefined,
  },
  {
    id: 4,
    nome: "Cuir Absolu — Eau de Parfum 100ml",
    descricaoCurta: "Couro fumê, açafrão e madeiras densas de inverno.",
    descricaoLonga:
      "Couro em acabamento fumê, com açafrão e noz-moscada dando o calor especiado logo na abertura.\n\nO coração revela madeiras densas — cedro e gaiac — enquanto o fundo assenta em labdanum e um âmbar escuro, quase balsâmico.\n\nProjeção alta e fixação superior a 10 horas. Fragrância de inverno e de ocasiões noturnas.",
    preco: 1499,
    categoria: "Masculino",
    notas: "Couro, açafrão, cedro",
    imagemURL: undefined,
  },
  {
    id: 5,
    nome: "Néroli Blanc — Decant 10ml",
    descricaoCurta: "Néroli translúcido com petitgrain e almíscar limpo.",
    descricaoLonga:
      "Néroli em leitura translúcida, quase transparente, apoiado em petitgrain e num almíscar branco de acabamento limpo.\n\nUm perfume de pele: discreto, elegante e sem doçura, que funciona como assinatura de todos os dias.\n\nDecant de 10ml envasado a partir do frasco original. Projeção baixa e fixação de 4 a 6 horas.",
    preco: 89,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 6,
    nome: "Ambre Solaire — Eau de Parfum 90ml",
    descricaoCurta: "Âmbar dourado, baunilha bourbon e benjoim quente.",
    descricaoLonga:
      "Âmbar dourado em dose generosa, com baunilha bourbon e benjoim construindo um fundo quente e envolvente.\n\nA abertura cítrica de mandarina evita o excesso de doçura e dá luz às primeiras horas; o fundo é resinoso e persistente.\n\nProjeção alta e fixação de 8 a 10 horas. Ideal para noites frias e para quem gosta de rastro marcante.",
    preco: 1049,
    categoria: "Unissex",
    notas: "Âmbar, baunilha, benjoim",
    destaque: "Mais procurado",
    imagemURL: undefined,
  },
  {
    id: 7,
    nome: "Rose Sauvage — Eau de Parfum 75ml",
    descricaoCurta: "Rosa selvagem, pimenta rosa e um véu de patchouli.",
    descricaoLonga:
      "Rosa em versão selvagem e nada açucarada: pimenta rosa na abertura, pétalas frescas no coração e patchouli no fundo.\n\nO contraste entre a especiaria e a terra do patchouli dá à fragrância um caráter contemporâneo, longe do floral clássico.\n\nProjeção média-alta e fixação de 6 a 9 horas. Uso versátil, dia ou noite.",
    preco: 799,
    categoria: "Feminino",
    notas: "Rosa, pimenta rosa, patchouli",
    imagemURL: undefined,
  },
  {
    id: 8,
    nome: "Bois de Minuit — Decant 10ml",
    descricaoCurta: "Cedro escuro e incenso sob uma lua de bergamota.",
    descricaoLonga:
      "Cedro escuro e incenso formam o eixo desta composição amadeirada, aberta por uma bergamota fria que soa quase noturna.\n\nCom o tempo, vetiver e almíscar cinza aprofundam o conjunto sem torná-lo pesado.\n\nDecant de 10ml envasado sob demanda. Projeção moderada e fixação de 6 a 8 horas.",
    preco: 129,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 9,
    nome: "Tabac Royal — Eau de Parfum 100ml",
    descricaoCurta: "Fumo doce, mel e especiarias em madeira envernizada.",
    descricaoLonga:
      "Folha de fumo doce, mel e especiarias sobre uma madeira envernizada — o efeito lembra tabacaria antiga e couro de poltrona.\n\nA doçura do mel é cortada por canela e cravo, mantendo a composição séria em vez de gourmand.\n\nProjeção alta e fixação de 9 a 12 horas. Outono e inverno, preferencialmente à noite.",
    preco: 1199,
    categoria: "Masculino",
    notas: "Fumo, mel, especiarias",
    destaque: "Formulação clássica",
    imagemURL: undefined,
  },
  {
    id: 10,
    nome: "Iris Poudré — Eau de Parfum 75ml",
    descricaoCurta: "Íris aveludada, violeta em pó e um sopro de suede.",
    descricaoLonga:
      "Íris aveludada em acabamento empoado, com violeta e um suede macio que dá a sensação de tecido sobre a pele.\n\nÉ um perfume silencioso e sofisticado, construído em camadas discretas em vez de contrastes.\n\nProjeção baixa a média e fixação de 6 a 8 horas. Elegante para o dia e para ambientes fechados.",
    preco: 1349,
    categoria: "Feminino",
    notas: "Íris, violeta, suede",
    imagemURL: undefined,
  },
  {
    id: 11,
    nome: "Santal Doré — Decant 10ml",
    descricaoCurta: "Sândalo cremoso, cardamomo e âmbar translúcido.",
    descricaoLonga:
      "Sândalo cremoso conduzido por cardamomo e um âmbar translúcido que mantém o conjunto leve mesmo no fundo.\n\nA madeira aqui é leitosa e macia, sem fumaça — uma leitura confortável e fácil de usar todos os dias.\n\nDecant de 10ml envasado a partir do frasco original. Projeção média e fixação de 6 a 8 horas.",
    preco: 139,
    categoria: "Decants",
    imagemURL: undefined,
  },
  {
    id: 12,
    nome: "Musc Nomade — Eau de Parfum 90ml",
    descricaoCurta: "Almíscar quente, papiro seco e figueira ao entardecer.",
    descricaoLonga:
      "Almíscar quente com papiro seco e folhas de figueira, numa composição que evoca fim de tarde em clima mediterrâneo.\n\nA figueira traz um verde leitoso na abertura; o almíscar assume depois, colado à pele, com um fundo levemente amadeirado.\n\nProjeção baixa e fixação de 5 a 7 horas. Uso diário, em qualquer estação.",
    preco: 649,
    categoria: "Unissex",
    notas: "Almíscar, papiro, figueira",
    destaque: "Chegou agora",
    imagemURL: undefined,
  },
];
