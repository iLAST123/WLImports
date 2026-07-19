// Busca do catálogo no Bling API v3, com renovação automática de token.
//
// Server-only por convenção: só é importado por API Routes (nunca por Client
// Components), então o token jamais chega ao browser. Não adicionamos o pacote
// `server-only` para manter o bundle enxuto.
import type { Produto, ProdutosResponse } from "./types";
import { mockProdutos } from "./mock-produtos";
import { blingAuth, type BlingAuth } from "./bling-auth";

const BLING_BASE = "https://api.bling.com.br/Api/v3/produtos";
const PAGE_LIMIT = 100;
const MAX_PAGES = 30; // teto de segurança contra loop/rate limit
const THROTTLE_MS = 350; // rate limit do Bling é ~3 req/s

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Mapa id → URL assinada ATUAL da imagem (só no servidor). A URL da AWS traz
 * `Expires` e caduca; por isso o client nunca a segura — recebe `/api/imagem`.
 * Repopulado a cada `getProdutos` (que é cacheado por `revalidate`).
 */
const imagensOriginais = new Map<number, string>();

/** Sleep injetável — os testes passam um fake para não esperar de verdade. */
export function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shape frouxo que cobre tanto o item bruto do Bling quanto o mock. */
interface RawProduto {
  id: number;
  nome: string;
  descricaoCurta?: string;
  preco?: number;
  situacao?: string;
  imagemURL?: string;
  categoria?: string;
}

interface BlingListResponse {
  data?: RawProduto[];
}

/** Ativo (ou sem `situacao`, caso do mock) e com nome válido. */
function utilizavel(raw: RawProduto): boolean {
  if (typeof raw.nome !== "string" || raw.nome.trim() === "") return false;
  if (raw.situacao !== undefined && raw.situacao !== "A") return false;
  return true;
}

/**
 * Tratamento compartilhado (mock E bling): preço, descrição e imagem.
 * - `preco <= 0`/ausente → sem preço: `consultar: true`, nunca "R$ 0,00";
 * - preço válido → `precoFormatado` em BRL;
 * - `descricaoCurta` vazia → undefined;
 * - `imagemURL` presente → guarda a original no servidor e devolve `/api/imagem`.
 */
function tratar(raw: RawProduto): Produto {
  const precoValido = typeof raw.preco === "number" && raw.preco > 0;

  const temImagem =
    typeof raw.imagemURL === "string" && raw.imagemURL.trim() !== "";
  let imagemURL: string | undefined;
  if (temImagem) {
    imagensOriginais.set(raw.id, (raw.imagemURL as string).trim());
    imagemURL = `/api/imagem?id=${raw.id}`;
  }

  const descricao =
    raw.descricaoCurta && raw.descricaoCurta.trim() !== ""
      ? raw.descricaoCurta
      : undefined;

  return {
    id: raw.id,
    nome: raw.nome.trim(),
    descricaoCurta: descricao,
    preco: precoValido ? raw.preco : undefined,
    precoFormatado: precoValido ? brl.format(raw.preco as number) : undefined,
    consultar: precoValido ? undefined : true,
    imagemURL,
    categoria: raw.categoria,
  };
}

function tratarLista(raws: RawProduto[]): Produto[] {
  return raws.filter(utilizavel).map(tratar);
}

function mockResponse(): ProdutosResponse {
  return { fonte: "mock", produtos: tratarLista(mockProdutos) };
}

interface GetProdutosDeps {
  auth?: Pick<BlingAuth, "hasCredentials" | "getAccessToken">;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Retorna o catálogo. Sem credenciais → mock (zero regressão). Com credenciais
 * → busca paginada no Bling com token renovado, cache 600s e throttle. Qualquer
 * erro (auth/HTTP/rede) cai para mock — nunca quebra, nunca vaza token.
 */
export async function getProdutos({
  auth = blingAuth,
  fetchFn = fetch,
  sleep = defaultSleep,
}: GetProdutosDeps = {}): Promise<ProdutosResponse> {
  if (!(await auth.hasCredentials())) return mockResponse();

  try {
    const token = await auth.getAccessToken();
    const acumulado: Produto[] = [];

    for (let pagina = 1; pagina <= MAX_PAGES; pagina++) {
      // Throttle entre páginas (não antes da primeira).
      if (pagina > 1) await sleep(THROTTLE_MS);

      const res = await fetchFn(
        `${BLING_BASE}?pagina=${pagina}&limite=${PAGE_LIMIT}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          next: { revalidate: 600 },
        },
      );

      if (!res.ok) {
        console.error(
          `[bling] resposta ${res.status} na página ${pagina} — fallback para mock`,
        );
        return mockResponse();
      }

      const json = (await res.json()) as BlingListResponse;
      const itens = json.data ?? [];
      if (itens.length === 0) break;

      acumulado.push(...tratarLista(itens));

      // Última página quando vieram menos itens que o limite.
      if (itens.length < PAGE_LIMIT) break;
    }

    if (acumulado.length === 0) return mockResponse();
    return { fonte: "bling", produtos: acumulado };
  } catch (err) {
    console.error(
      "[bling] falha ao buscar produtos — fallback para mock:",
      err instanceof Error ? err.message : "erro desconhecido",
    );
    return mockResponse();
  }
}

/**
 * Resolve a URL assinada ATUAL da imagem de um produto, a partir da mesma busca
 * cacheada. Usado pelo proxy `/api/imagem` — o client nunca vê a URL da AWS.
 */
export async function getImagemOriginal(id: number): Promise<string | null> {
  await getProdutos();
  return imagensOriginais.get(id) ?? null;
}
