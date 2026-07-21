/**
 * Extração honesta de VOLUME a partir do nome do produto.
 *
 * Motivação (ver `.claude/brain/referencias-aesop.md` §4 e §9): o único campo
 * "rico" recuperável do catálogo real do Bling é o tamanho, e ele vive DENTRO
 * do nome ("Oud Impérial — Eau de Parfum 100ml"). A vitrine quer exibir o
 * tamanho como campo próprio, como a Aesop faz — sem inventar dado nenhum.
 * Aqui apenas SEPARAMOS o que já existe na string.
 *
 * Princípio: **conservador por padrão**. Um falso negativo (volume não
 * detectado, nome preservado) é aceitável; um nome mutilado na vitrine, não.
 * Na dúvida, devolvemos o nome INTACTO e `volume: undefined`.
 */

/**
 * Volume no FIM do nome.
 *
 * - `(?<=\s)` — exige espaço antes do bloco. Impede casar dentro de palavra
 *   ("Frasco100ml") e impede que um nome que é SÓ o volume ("100ml") vire um
 *   nome vazio.
 * - `[([]?\s*` — engole um parêntese/colchete de abertura, para que
 *   "Oud (100ml)" não deixe um "(" órfão.
 * - `(\d{1,4}(?:[.,]\d{1,2})?)` — até 4 dígitos, decimal com vírgula OU ponto.
 * - `\s*(ml|l)\b` — unidade colada ou separada, qualquer caixa. O `\b` evita
 *   "100mls"/"100 ml x". A unidade é OBRIGATÓRIA: é ela que separa volume de
 *   número qualquer ("Chanel No 5", "Kit 3 peças" não casam).
 * - `[\s.,;:)\]]*$` — só sobras de pontuação/fechamento até o fim da string.
 *   Ancorado em `$`: volume no MEIO do nome é ignorado de propósito.
 */
const RE_VOLUME_FINAL = /(?<=\s)[([]?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(ml|l)\b[\s.,;:)\]]*$/i;

/**
 * Separadores/pontuação que podem ficar órfãos no fim do nome depois de
 * remover o volume ("X — Eau de Parfum 100ml" → "X — Eau de Parfum —" → "X — Eau de Parfum").
 */
const RE_SOBRA_FINAL = /[\s\-–—|,.;:/\\·•([]+$/;

/**
 * Conectores que indicam KIT/combo ("50ml + 10ml", "Frasco e 10ml"). Se o que
 * sobra termina assim, o "volume" final não descreve o produto inteiro —
 * preferimos não mexer.
 */
const RE_CONECTOR_FINAL = /(?:[+&/]|\b(?:e|com|mais|ou)\b)\s*$/i;

/**
 * Separa o volume declarado no nome do produto.
 *
 * @param nome Nome cru, como vem do Bling ou do mock.
 * @returns `nome` sem o volume (limpo de sobras) e `volume` normalizado
 *          (`"100 ml"`, `"1,5 L"`). Quando não há reconhecimento confiável,
 *          `nome` volta **exatamente** como entrou e `volume` é `undefined`.
 *
 * @example
 * separarVolume("Oud Impérial — Eau de Parfum 100ml")
 * // → { nome: "Oud Impérial — Eau de Parfum", volume: "100 ml" }
 * separarVolume("Chanel No 5")
 * // → { nome: "Chanel No 5", volume: undefined }
 */
export function separarVolume(nome: string): { nome: string; volume?: string } {
  if (typeof nome !== "string" || nome.length === 0) return { nome };

  const match = RE_VOLUME_FINAL.exec(nome);
  if (!match) return { nome };

  const [bruto, numero, unidade] = match;

  const valor = Number(numero.replace(",", "."));
  // 0 ml / NaN não é volume de produto — não vale mutilar o nome por isso.
  if (!Number.isFinite(valor) || valor <= 0) return { nome };

  const restante = nome.slice(0, nome.length - bruto.length);
  const limpo = restante.replace(RE_SOBRA_FINAL, "").replace(/\s{2,}/g, " ");

  // Sobrou nada (ou só pontuação) → o nome era só o volume. Devolve intacto.
  if (limpo.trim().length === 0) return { nome };
  // Kit/combo: o volume final não representa o produto. Devolve intacto.
  if (RE_CONECTOR_FINAL.test(limpo)) return { nome };

  return { nome: limpo, volume: normalizarVolume(numero, unidade) };
}

/** `("100", "ML") → "100 ml"` · `("1.5", "l") → "1,5 L"` */
function normalizarVolume(numero: string, unidade: string): string {
  let n = numero.replace(".", ",");
  // "100,0" / "100,00" → "100" (decimal irrelevante).
  n = n.replace(/,0+$/, "");
  const u = unidade.toLowerCase() === "l" ? "L" : "ml";
  return `${n} ${u}`;
}
