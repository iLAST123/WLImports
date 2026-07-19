export type Categoria = "Masculino" | "Feminino" | "Unissex" | "Decants";

export interface Produto {
  id: number;
  nome: string;
  descricaoCurta?: string;
  preco?: number;
  /** Preço já formatado em BRL (pt-BR). Ausente quando `consultar` é true. */
  precoFormatado?: string;
  /** Produto sem preço cadastrado (tester/kit) → exibir "Sob consulta". */
  consultar?: boolean;
  imagemURL?: string;
  categoria?: string;
}

export interface ProdutosResponse {
  fonte: "bling" | "mock";
  produtos: Produto[];
}
