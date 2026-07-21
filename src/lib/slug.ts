/**
 * Slug de produto para a URL canônica `/produto/[slug]-[id]` (DEC-006 §4).
 *
 * O id vive no SUFIXO do param — resolução O(1), imune a rename: se o `nome`
 * mudar no ERP o slug diverge, mas o id ainda resolve o produto (a rota da
 * Onda 2 faz redirect permanente ao canônico). Estas são funções PURAS, sem
 * dependência de rede/DOM, testadas em Vitest node.
 */

/** Limite alvo do slug — corta preferencialmente na fronteira de palavra. */
const MAX_SLUG = 80;

/** Diacríticos combinantes que o NFD separa da letra base (U+0300–U+036F). */
const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Normaliza um nome de produto em slug seguro para URL.
 *
 * - NFD + remoção de diacríticos ("Ébène" -> "ebene");
 * - minúsculas;
 * - QUALQUER sequência fora de `[a-z0-9]` (incluindo NBSP U+00A0, gotcha do
 *   projeto) vira um único hífen;
 * - hífens colapsados e aparados das pontas;
 * - limite ~80 chars sem cortar no meio de palavra quando há fronteira; sem
 *   fronteira (palavra única gigante), corte simples.
 *
 * Nome vazio / só símbolos / não-string -> string vazia.
 */
export function slugify(nome: string): string {
  if (typeof nome !== "string") return "";

  const base = nome
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // NBSP, espaço, pontuação, símbolo -> hífen
    .replace(/^-+|-+$/g, ""); // apara hífens das pontas

  return limitar(base);
}

/** Corta o slug em `MAX_SLUG`, recuando ao último hífen para não partir palavra. */
function limitar(slug: string): string {
  if (slug.length <= MAX_SLUG) return slug;

  const cortado = slug.slice(0, MAX_SLUG);
  const ultimoHifen = cortado.lastIndexOf("-");
  // Há fronteira de palavra dentro do limite -> corta nela; senão, corte simples.
  const resultado = ultimoHifen > 0 ? cortado.slice(0, ultimoHifen) : cortado;
  return resultado.replace(/-+$/g, "");
}

/**
 * Monta o param canônico do produto: `slugify(nome)-id`.
 *
 * Se o nome não gera slug algum (vazio/só símbolos), cai em `p-${id}` — nunca
 * começa por dígito ambíguo nem gera um param que seria só o id (esse caso é a
 * URL antiga, resolvida por `extrairIdDeSlug`).
 */
export function montarSlugProduto(nome: string, id: number): string {
  const slug = slugify(nome);
  return slug ? `${slug}-${id}` : `p-${id}`;
}

/**
 * Extrai o id do produto a partir do param da rota. Aceita DOIS formatos:
 *   (a) canônico `slug-<id>` — o id é o bloco de dígitos no FIM
 *       ("kit-body-butterlly-16678961877" -> 16678961877);
 *   (b) legado só-dígitos — a URL antiga `/produto/[id]` ("16678961877").
 *
 * Qualquer outro formato -> `null`. O id precisa ser inteiro seguro > 0
 * (descarta 0, negativos e números além de `Number.MAX_SAFE_INTEGER`).
 * Regex linear (sem quantificador aninhado) — sem backtracking catastrófico.
 */
export function extrairIdDeSlug(param: string): number | null {
  if (typeof param !== "string") return null;

  const match = /^(?:.*-)?(\d+)$/.exec(param.trim());
  if (!match) return null;

  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}
