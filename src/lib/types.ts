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

/** Produto da página de detalhe: listagem + descrição rica + galeria. */
export interface ProdutoDetalhe extends Produto {
  /** Descrição rica em TEXTO PURO (HTML já removido no servidor). */
  descricao?: string;
  /**
   * URLs do proxy, já prontas para `<img src>`: ["/api/imagem?id=1&i=0", ...].
   * Sempre >= 1 item quando há imagem; [] quando não há nenhuma.
   */
  imagens: string[];
}

export interface ProdutoDetalheResponse {
  fonte: "bling" | "mock";
  /** `null` = id inexistente no catálogo. */
  produto: ProdutoDetalhe | null;
}
