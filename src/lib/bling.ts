// Busca do catálogo no Bling API v3, com renovação automática de token.
//
// Server-only por convenção: só é importado por API Routes (nunca por Client
// Components), então o token jamais chega ao browser. Não adicionamos o pacote
// `server-only` para manter o bundle enxuto.
import type {
  Produto,
  ProdutoDetalhe,
  ProdutoDetalheResponse,
  ProdutosResponse,
} from "./types";
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
  /**
   * Campos EDITORIAIS — existem só no mock (`src/lib/mock-produtos.ts`).
   * A API do Bling não tem equivalente: a listagem devolve apenas
   * `id, idProdutoPai, nome, codigo, preco, precoCusto, estoque, tipo,
   * situacao, formato, descricaoCurta, imagemURL` (spec OpenAPI oficial —
   * ver `.claude/brain/referencias-aesop.md` §9). Para produto real eles
   * chegam sempre `undefined`, então o repasse em `tratar()` é seguro por
   * construção. É PROIBIDO derivá-los ou inventá-los para produto do ERP.
   */
  notas?: string;
  destaque?: string;
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
    // Repasse dos campos editoriais. Vindos do Bling são sempre `undefined`
    // (a API não os tem), então o card/PDP simplesmente não renderiza as
    // linhas correspondentes — é a degradação honesta em ação.
    notas: raw.notas,
    destaque: raw.destaque,
  };
}

function tratarLista(raws: RawProduto[]): Produto[] {
  return raws.filter(utilizavel).map(tratar);
}

function mockResponse(): ProdutosResponse {
  return { fonte: "mock", produtos: tratarLista(mockProdutos) };
}

export interface GetProdutosDeps {
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
// Detalhe do produto (descrição + galeria) — lazy, cacheado e enfileirado
// ---------------------------------------------------------------------------
//
// A LISTAGEM (`GET /produtos`) só devolve `imagemURL` de 70x70px — uma
// miniatura, que borra ampliada nos cards — e não traz descrição rica. O
// DETALHE (`GET /produtos/{id}`) devolve `data.midia.imagens.internas[].link`
// (imagem original, campo separado de `linkMiniatura` — confirmado na spec
// OpenAPI oficial, schema `ProdutosImagemInternaDTO`), as `externas[]` e as
// descrições (`descricaoCurta` / `descricaoComplementar`, esta em HTML).
//
// UMA única busca de detalhe por produto alimenta TUDO (proxy de imagem,
// galeria e descrição da página de produto) — nunca duas requisições ao Bling
// para o mesmo id.
//
// Estratégia (128 produtos, rate limit 3 req/s / 120k por dia):
// - LAZY: o detalhe só é buscado sob demanda (`/api/imagem?id=X` ou
//   `/api/produto/X`), nunca numa varredura no carregamento do catálogo;
// - cache em 2 camadas: Next Data Cache no fetch (`revalidate: 600`,
//   compartilhado entre lambdas na Vercel — mesmo padrão da listagem) + Map
//   em módulo com TTL, incluindo cache NEGATIVO de 60s para detalhe sem nada
//   utilizável ou falha na API;
// - fila serial com espaçamento de `THROTTLE_MS` entre fetches de detalhe
//   não cacheados → nunca estoura 3 req/s por instância — com teto
//   (`MAX_FILA_DETALHE`): fila cheia degrada na hora (miniatura / produto sem
//   descrição) e re-tenta num hit futuro;
// - qualquer falha → o proxy cai para a miniatura da listagem e a página de
//   produto ainda renderiza com os dados da listagem (nunca quebra).

/** Detalhe já extraído e normalizado do `GET /produtos/{id}`. */
export interface DetalheBling {
  /** Descrição rica em TEXTO PURO (HTML já removido). */
  descricao?: string;
  /** URLs ORIGINAIS (assinadas) das imagens, na ordem da galeria. */
  imagens: string[];
}

interface EntradaDetalhe {
  detalhe: DetalheBling | null; // null = indisponível (cache negativo)
  expiraEm: number;
}

/** Cache id → detalhe do produto (só no servidor, TTL curto). */
const detalhesProduto = new Map<number, EntradaDetalhe>();

/** Fila serial dos fetches de detalhe — garante o espaçamento do rate limit. */
let filaDetalhe: Promise<unknown> = Promise.resolve();

/** Quantos detalhes estão aguardando/rodando na fila (para o teto). */
let filaDetalheTamanho = 0;

/** Shape mínimo do detalhe (`GET /produtos/{id}`) — só o que usamos. */
interface BlingDetalheResponse {
  data?: {
    descricaoCurta?: string;
    descricaoComplementar?: string;
    midia?: {
      imagens?: {
        internas?: { link?: string; ordem?: number }[];
        externas?: { link?: string }[];
      };
    };
  };
}

/** Entidades HTML que o ERP realmente produz (sem tabela completa). */
const ENTIDADES: [RegExp, string][] = [
  [/&nbsp;/gi, " "],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&#0?39;/gi, "'"],
  [/&apos;/gi, "'"],
  // `&amp;` por último: senão "&amp;lt;" viraria "<" em vez de "&lt;".
  [/&amp;/gi, "&"],
];

/** Tags cujo fechamento (ou ocorrência, no caso do `br`) vira parágrafo. */
const TAGS_DE_QUEBRA =
  /<\s*\/?\s*(br|p|div|li|ul|ol|tr|table|h[1-6]|section|article|blockquote)\b[^>]*>/gi;

/**
 * Converte o HTML vindo do ERP em TEXTO PURO.
 *
 * SEGURANÇA: a descrição é conteúdo de terceiro (cadastrado no Bling) e nunca
 * pode chegar ao browser como HTML — este projeto NÃO usa
 * `dangerouslySetInnerHTML`. Aqui as tags são removidas no servidor, as
 * entidades comuns são decodificadas (depois da remoção, para que `&lt;script&gt;`
 * jamais volte a ser uma tag), os espaços são colapsados e as quebras de
 * parágrafo viram `\n\n`.
 *
 * Exportada para teste.
 */
export function htmlParaTextoPuro(html: string): string {
  const texto = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(TAGS_DE_QUEBRA, "\n\n")
    .replace(/<[^>]*>/g, "");

  const decodificado = ENTIDADES.reduce(
    (acc, [re, char]) => acc.replace(re, char),
    texto,
  );

  return decodificado
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ") // espaços/tabs/NBSP colapsados, sem tocar em \n
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Descrição preferida: a complementar (rica) e, na falta, a curta. */
function extrairDescricao(data: NonNullable<BlingDetalheResponse["data"]>) {
  for (const bruta of [data.descricaoComplementar, data.descricaoCurta]) {
    if (typeof bruta !== "string") continue;
    const texto = htmlParaTextoPuro(bruta);
    if (texto !== "") return texto;
  }
  return undefined;
}

/**
 * Extrai descrição + galeria do detalhe. Ordem das imagens: internas por
 * `ordem` crescente (a primeira é a principal) e, na sequência, as externas.
 * O `imagemURL` do próprio detalhe NÃO entra — não há garantia de que não seja
 * a mesma miniatura 70x70 da listagem. Tudo defensivo: a API pode omitir campos.
 */
function extrairDetalhe(json: BlingDetalheResponse): DetalheBling {
  const data = json.data;
  if (!data) return { imagens: [] };

  const links = (lista: { link?: string }[] | undefined) =>
    (lista ?? [])
      .filter((i) => typeof i.link === "string" && i.link.trim() !== "")
      .map((i) => (i.link as string).trim());

  const midia = data.midia?.imagens;
  const internas = links(
    [...(midia?.internas ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
  );
  const externas = links(midia?.externas);

  return {
    descricao: extrairDescricao(data),
    imagens: [...internas, ...externas],
  };
}

/** Busca o detalhe do produto na fila serial (respeitando o throttle). */
function buscarDetalhe(
  id: number,
  { auth = blingAuth, fetchFn = fetch, sleep = defaultSleep }: GetProdutosDeps,
): Promise<DetalheBling | null> {
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
      return extrairDetalhe((await res.json()) as BlingDetalheResponse);
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

/**
 * Detalhe do produto com cache (positivo e negativo) e teto de fila.
 * Nunca lança: indisponível → `null` (o chamador degrada).
 */
async function resolverDetalhe(
  id: number,
  deps: GetProdutosDeps,
): Promise<DetalheBling | null> {
  const agora = Date.now();
  const cacheado = detalhesProduto.get(id);
  if (cacheado && cacheado.expiraEm > agora) return cacheado.detalhe;

  // Fila cheia → degrada AGORA, sem cache negativo, para que um hit futuro
  // (fila drenada) resolva o detalhe de verdade.
  if (filaDetalheTamanho >= MAX_FILA_DETALHE) return null;

  let detalhe: DetalheBling | null = null;
  try {
    detalhe = await buscarDetalhe(id, deps);
  } catch (err) {
    console.error(
      `[bling] falha ao buscar detalhe do produto ${id} — degradando:`,
      err instanceof Error ? err.message : "erro desconhecido",
    );
  }

  const util =
    detalhe !== null && (detalhe.imagens.length > 0 || detalhe.descricao);
  detalhesProduto.set(id, {
    detalhe,
    expiraEm: agora + (util ? DETALHE_TTL_MS : DETALHE_FALHA_TTL_MS),
  });
  return detalhe;
}

export interface ImagemProduto {
  /** URL original (detalhe) — null quando indisponível. */
  grande: string | null;
  /** URL da miniatura 70x70 (listagem) — null quando o id não está no catálogo. */
  miniatura: string | null;
}

/**
 * Resolve as URLs assinadas ATUAIS de uma imagem de um produto, a partir da
 * busca cacheada + detalhe lazy. Usado pelo proxy `/api/imagem` — o client
 * nunca vê a URL da AWS. Nunca lança.
 *
 * `indice` seleciona a imagem da galeria (0 = principal). A miniatura da
 * listagem só serve de fallback para a principal: para `indice > 0` seria
 * simplesmente a foto errada.
 */
export async function getImagemProduto(
  id: number,
  deps: GetProdutosDeps = {},
  indice = 0,
): Promise<ImagemProduto> {
  const catalogo = await getProdutos(deps);
  const daListagem = imagensOriginais.get(id) ?? null;
  const miniatura = indice === 0 ? daListagem : null;

  // Id fora do catálogo (ou produto sem imagem) → 404 no proxy, sem gastar
  // chamada de detalhe. Fonte mock → os ids não existem na API real.
  if (daListagem === null || catalogo.fonte !== "bling") {
    return { grande: null, miniatura };
  }

  const detalhe = await resolverDetalhe(id, deps);
  return { grande: detalhe?.imagens[indice] ?? null, miniatura };
}

/**
 * Invalida o detalhe cacheado de um produto — usado pelo proxy quando o
 * upstream falha (ex.: URL assinada expirada), para re-resolver no próximo hit.
 */
export function invalidarImagemGrande(id: number): void {
  detalhesProduto.delete(id);
}

/**
 * Produto da página de detalhe: dados da listagem cacheada (nome, preço,
 * `precoFormatado`, `consultar`, categoria) enriquecidos com descrição e
 * galeria do detalhe do Bling.
 *
 * NUNCA lança e nunca deixa a página sem conteúdo:
 * - id fora do catálogo → `{ fonte, produto: null }` (a rota devolve 404);
 * - falha/indisponibilidade do detalhe → produto da listagem mesmo assim, sem
 *   descrição rica e com a imagem da listagem (se houver) na galeria;
 * - fonte mock → descrição longa do mock, sem jamais chamar a API.
 */
export async function getProdutoDetalhe(
  id: number,
  deps: GetProdutosDeps = {},
): Promise<ProdutoDetalheResponse> {
  let fonte: ProdutoDetalheResponse["fonte"] = "mock";
  try {
    const catalogo = await getProdutos(deps);
    fonte = catalogo.fonte;

    const base = catalogo.produtos.find((p) => p.id === id);
    if (!base) return { fonte, produto: null };

    // A imagem da listagem já vem como URL do proxy (`/api/imagem?id=X`).
    const galeriaDaListagem = base.imagemURL ? [base.imagemURL] : [];

    if (fonte !== "bling") {
      const doMock = mockProdutos.find((p) => p.id === id);
      const produto: ProdutoDetalhe = {
        ...base,
        descricao: doMock?.descricaoLonga ?? base.descricaoCurta,
        imagens: galeriaDaListagem,
      };
      return { fonte, produto };
    }

    const detalhe = await resolverDetalhe(id, deps);
    const imagens =
      detalhe && detalhe.imagens.length > 0
        ? detalhe.imagens.map((_, i) => `/api/imagem?id=${id}&i=${i}`)
        : galeriaDaListagem;

    const produto: ProdutoDetalhe = {
      ...base,
      descricao: detalhe?.descricao ?? base.descricaoCurta,
      imagens,
    };
    return { fonte, produto };
  } catch (err) {
    // Rede/serialização: a página NUNCA quebra por causa do Bling.
    console.error(
      `[bling] falha ao montar o detalhe do produto ${id}:`,
      err instanceof Error ? err.message : "erro desconhecido",
    );
    return { fonte, produto: null };
  }
}

/** Somente para testes: zera os caches em módulo. */
export function __limparCachesDeImagem(): void {
  detalhesProduto.clear();
  imagensOriginais.clear();
}
