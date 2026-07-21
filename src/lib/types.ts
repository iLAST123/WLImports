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

  /**
   * Id do produto PAI quando este item é uma variação (tamanho/decant) no
   * Bling v3. Presente só em filhos de um produto formato "V"; ausente
   * (undefined) em produtos simples. Campo OPCIONAL — a F4 usa para agrupar
   * variações sob o pai com seletor de tamanho. Nunca 0 (a convenção "sem pai"
   * do ERP é normalizada para undefined no ponto de transformação).
   */
  idProdutoPai?: number;

  // ─── Superfície editorial (§4/§9 de referencias-aesop.md) ────────────────
  // Os três campos abaixo são OPCIONAIS e, no caminho real (Bling), quase
  // sempre ausentes. Regra inegociável de degradação: **bloco sem dado não é
  // renderizado** — sem título órfão, sem placeholder, sem "não disponível".
  // O card degrada de `imagem · nome · notas · volume · preço · CTA` para
  // `imagem · nome · preço · CTA` sem deixar buraco.

  /**
   * Tamanho declarado no próprio nome ("… 100ml"), extraído por
   * `separarVolume()` de `produto-formato.ts`. Único campo rico que o dado
   * real permite, porque não é invenção: é separação do que já existe.
   * AUSENTE quando o nome não declara volume (ou quando a extração não teve
   * confiança suficiente — ela é conservadora de propósito).
   */
  volume?: string;

  /**
   * Descritor olfativo curto, 2–4 palavras ("Oud, rosa turca, âmbar") —
   * o equivalente ao "Yuzu, Vetiver Heart, Basil" da Aesop.
   * SÓ O MOCK PREENCHE. O Bling não expõe notas olfativas em nenhum endpoint
   * (`descricaoCurta` vem vazia em 100% da amostra), então produto real NUNCA
   * terá este campo. É PROIBIDO derivar/inventar notas para produto real.
   */
  notas?: string;

  /**
   * Tag editorial curta ("Mais procurado", "Chegou agora") — o
   * "Beloved formulation" da Aesop.
   * SÓ O MOCK PREENCHE. Não existe no ERP; produto real NUNCA terá.
   */
  destaque?: string;
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
