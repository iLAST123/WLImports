export type Categoria = "Masculino" | "Feminino" | "Unissex" | "Decants";

export interface Produto {
  id: number;
  nome: string;
  descricaoCurta?: string;
  preco?: number;
  imagemURL?: string;
  categoria?: string;
}

export interface ProdutosResponse {
  fonte: "bling" | "mock";
  produtos: Produto[];
}
