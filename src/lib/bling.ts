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

// TTLs do cache em memória de imagem grande (detalhe do produto).
const DETALHE_TTL_MS = 600_000; // espelha o `revalidate` dos fetches
const DETALHE_FALHA_TTL_MS = 60_000; // cache negativo: não martelar a API

// Teto da fila de detalhes: acima disso a request serve a miniatura direto
// (sem cache negativo — re-tenta num hit futuro). Evita que um cold start com
// scroll rápido segure a lambda por dezenas de segundos esperando a fila.
const MAX_FILA_DETALHE = 8;

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

// ---------------------------------------------------------------------------
// Imagem em tamanho original (detalhe do produto)
// ---------------------------------------------------------------------------
//
// A LISTAGEM (`GET /produtos`) só devolve `imagemURL` de 70x70px — uma
// miniatura, que borra ampliada nos cards. O DETALHE (`GET /produtos/{id}`)
// devolve `data.midia.imagens.internas[].link` (imagem original) além do
// `linkMiniatura` — confirmado na spec OpenAPI oficial do Bling
// (schema `ProdutosImagemInternaDTO`, campos `link` e `linkMiniatura`
// separados e obrigatórios).
//
// Estratégia (128 produtos, rate limit 3 req/s / 120k por dia):
// - LAZY: o detalhe só é buscado quando o browser pede `/api/imagem?id=X`
//   (1 produto por request, nunca uma varredura no carregamento do catálogo);
// - cache em 2 camadas: Next Data Cache no fetch (`revalidate: 600`,
//   compartilhado entre lambdas na Vercel — mesmo padrão da listagem) + Map
//   em módulo com TTL, incluindo cache NEGATIVO de 60s para produto sem
//   imagem interna ou falha na API;
// - fila serial com espaçamento de `THROTTLE_MS` entre fetches de detalhe
//   não cacheados → nunca estoura 3 req/s por instância — com teto
//   (`MAX_FILA_DETALHE`): fila cheia degrada para a miniatura na hora;
// - qualquer falha → o proxy cai para a miniatura da listagem (nunca quebra).

interface EntradaImagemGrande {
  url: string | null; // null = detalhe sem imagem utilizável (cache negativo)
  expiraEm: number;
}

/** Cache id → URL da imagem grande (só no servidor, TTL curto). */
const imagensGrandes = new Map<number, EntradaImagemGrande>();

/** Fila serial dos fetches de detalhe — garante o espaçamento do rate limit. */
let filaDetalhe: Promise<unknown> = Promise.resolve();

/** Quantos detalhes estão aguardando/rodando na fila (para o teto). */
let filaDetalheTamanho = 0;

/** Shape mínimo do detalhe (`GET /produtos/{id}`) — só o que usamos. */
interface BlingDetalheResponse {
  data?: {
    midia?: {
      imagens?: {
        internas?: { link?: string; ordem?: number }[];
        externas?: { link?: string }[];
      };
    };
  };
}

/**
 * Extrai a melhor URL de imagem original do detalhe: interna de menor `ordem`
 * (imagem principal) e, na ausência de internas, a primeira externa. O
 * `imagemURL` do detalhe NÃO é usado como candidato — não há garantia de que
 * não seja a mesma miniatura 70x70 da listagem.
 */
function extrairImagemGrande(json: BlingDetalheResponse): string | null {
  const imagens = json.data?.midia?.imagens;

  const internas = (imagens?.internas ?? [])
    .filter((i) => typeof i.link === "string" && i.link.trim() !== "")
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  if (internas.length > 0) return (internas[0].link as string).trim();

  const externa = (imagens?.externas ?? []).find(
    (e) => typeof e.link === "string" && e.link.trim() !== "",
  );
  return externa ? (externa.link as string).trim() : null;
}

/** Busca o detalhe do produto na fila serial (respeitando o throttle). */
function buscarImagemGrande(
  id: number,
  { auth = blingAuth, fetchFn = fetch, sleep = defaultSleep }: GetProdutosDeps,
): Promise<string | null> {
  filaDetalheTamanho++;
  const exec = filaDetalhe.then(async () => {
    try {
      const token = await auth.getAccessToken();
      const res = await fetchFn(`${BLING_BASE}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        next: { revalidate: 600 },
      });
      if (!res.ok) {
        console.error(
          `[bling] detalhe do produto ${id} respondeu ${res.status}`,
        );
        return null;
      }
      return extrairImagemGrande((await res.json()) as BlingDetalheResponse);
    } finally {
      filaDetalheTamanho--;
    }
  });

  // A próxima entrada da fila só inicia após esta terminar + THROTTLE_MS,
  // mesmo em caso de erro (o erro é do chamador; a fila nunca fica rejeitada).
  filaDetalhe = exec.then(
    () => sleep(THROTTLE_MS),
    () => sleep(THROTTLE_MS),
  );
  return exec;
}

export interface ImagemProduto {
  /** URL original (detalhe) — null quando indisponível. */
  grande: string | null;
  /** URL da miniatura 70x70 (listagem) — null quando o id não está no catálogo. */
  miniatura: string | null;
}

/**
 * Resolve as URLs assinadas ATUAIS da imagem de um produto, a partir da busca
 * cacheada + detalhe lazy. Usado pelo proxy `/api/imagem` — o client nunca vê
 * a URL da AWS. Nunca lança.
 */
export async function getImagemProduto(
  id: number,
  deps: GetProdutosDeps = {},
): Promise<ImagemProduto> {
  const catalogo = await getProdutos(deps);
  const miniatura = imagensOriginais.get(id) ?? null;

  // Id fora do catálogo → 404 no proxy, sem gastar chamada de detalhe.
  // Fonte mock → os ids não existem na API real; só a miniatura (mock) serve.
  if (miniatura === null || catalogo.fonte !== "bling") {
    return { grande: null, miniatura };
  }

  const agora = Date.now();
  const cacheada = imagensGrandes.get(id);
  if (cacheada && cacheada.expiraEm > agora) {
    return { grande: cacheada.url, miniatura };
  }

  // Fila cheia → degrada para a miniatura AGORA, sem cache negativo, para
  // que um hit futuro (fila drenada) resolva a imagem grande.
  if (filaDetalheTamanho >= MAX_FILA_DETALHE) {
    return { grande: null, miniatura };
  }

  let grande: string | null = null;
  try {
    grande = await buscarImagemGrande(id, deps);
  } catch (err) {
    console.error(
      `[bling] falha ao buscar detalhe do produto ${id} — fallback miniatura:`,
      err instanceof Error ? err.message : "erro desconhecido",
    );
  }
  imagensGrandes.set(id, {
    url: grande,
    expiraEm: agora + (grande ? DETALHE_TTL_MS : DETALHE_FALHA_TTL_MS),
  });
  return { grande, miniatura };
}

/**
 * Invalida a imagem grande cacheada de um produto — usado pelo proxy quando o
 * upstream falha (ex.: URL assinada expirada), para re-resolver no próximo hit.
 */
export function invalidarImagemGrande(id: number): void {
  imagensGrandes.delete(id);
}

/** Somente para testes: zera os caches em módulo. */
export function __limparCachesDeImagem(): void {
  imagensGrandes.clear();
  imagensOriginais.clear();
}
