// NOTA: este módulo é server-only por convenção — só é importado pela API Route
// `src/app/api/produtos/route.ts` (nunca por Client Components), portanto o
// `BLING_ACCESS_TOKEN` nunca chega ao browser. Optamos por não adicionar o
// pacote `server-only` (dependência extra) para manter o bundle enxuto.
import type { Produto, ProdutosResponse } from "./types";
import { mockProdutos } from "./mock-produtos";

const BLING_BASE = "https://api.bling.com.br/Api/v3/produtos";
const PAGE_LIMIT = 100;
const MAX_PAGES = 5; // teto de segurança contra loop/rate limit

/** Formato bruto de um item da listagem da Bling API v3. */
interface BlingProduto {
  id: number;
  nome: string;
  codigo?: string;
  preco?: number;
  tipo?: string;
  situacao?: string;
  formato?: string;
  descricaoCurta?: string;
  imagemURL?: string;
}

interface BlingListResponse {
  data?: BlingProduto[];
}

function mockResponse(): ProdutosResponse {
  return { fonte: "mock", produtos: mockProdutos };
}

/** Normaliza um item bruto do Bling para o tipo de domínio `Produto`. */
function normalizar(item: BlingProduto): Produto {
  return {
    id: item.id,
    nome: item.nome.trim(),
    descricaoCurta: item.descricaoCurta || undefined,
    // Bling devolve `preco: 0` para produto sem preço cadastrado — tratamos
    // como "sem preço" (o card exibe "Sob consulta"), nunca "R$ 0,00".
    preco:
      typeof item.preco === "number" && item.preco > 0 ? item.preco : undefined,
    imagemURL: item.imagemURL || undefined,
    // A listagem do Bling não traz categoria — mantém indefinido.
    categoria: undefined,
  };
}

/** Item utilizável: ativo e com nome válido (guard contra contrato frouxo). */
function utilizavel(item: BlingProduto): boolean {
  return (
    item.situacao === "A" &&
    typeof item.nome === "string" &&
    item.nome.trim() !== ""
  );
}

/**
 * Retorna o catálogo. Sem token → mock. Com token → busca paginada no Bling
 * com cache (revalidate 300s). Qualquer erro cai para mock, nunca quebra.
 */
export async function getProdutos(): Promise<ProdutosResponse> {
  const token = process.env.BLING_ACCESS_TOKEN?.trim();
  if (!token) return mockResponse();

  try {
    const acumulado: Produto[] = [];

    for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
      const res = await fetch(
        `${BLING_BASE}?pagina=${pagina}&limite=${PAGE_LIMIT}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          next: { revalidate: 300 },
        }
      );

      if (!res.ok) {
        console.error(
          `[bling] resposta ${res.status} na página ${pagina} — fallback para mock`
        );
        return mockResponse();
      }

      const json = (await res.json()) as BlingListResponse;
      const itens = json.data ?? [];

      acumulado.push(...itens.filter(utilizavel).map(normalizar));

      // última página quando vieram menos itens que o limite
      if (itens.length < PAGE_LIMIT) break;
    }

    // Nenhum produto ativo → recorre ao mock para não exibir catálogo vazio.
    if (acumulado.length === 0) return mockResponse();

    return { fonte: "bling", produtos: acumulado };
  } catch (err) {
    console.error("[bling] falha ao buscar produtos — fallback para mock", err);
    return mockResponse();
  }
}
