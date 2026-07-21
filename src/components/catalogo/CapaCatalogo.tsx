/**
 * Capa editorial ESCURA full-bleed — a costura entre os dois mundos
 * (referencias-aesop.md §6).
 *
 * O padrão observado na PLP da Aesop é literalmente:
 *   header creme opaco → FAIXA ESCURA (~290px) com título branco à esquerda →
 *   corpo creme. A transição escuro→claro não é um corte: é uma capa escura no
 *   topo de cada página clara. O mundo da marca entra como cabeçalho editorial
 *   e dissolve no creme.
 *
 * COMO O ESCURO É OBTIDO AQUI, sem hex e sem token novo: esta faixa vive
 * DENTRO de `data-superficie="clara"`, onde `--foreground` é o quase-preto
 * morno e `--background` é o creme. Invertê-los (`bg-foreground text-background`)
 * dá 12,96:1 — é exatamente o par que a tabela de contraste de `globals.css`
 * documenta como "o botão escuro da Aesop na página clara". Consequência a
 * respeitar: dentro desta faixa, `text-gold`/`text-champagne` viram BRONZE
 * sobre escuro (~2:1) e são proibidos; o acento aqui é o próprio creme.
 *
 * Sem imagem editorial disponível, a profundidade vem de um gradiente sutil e
 * de uma dissolvência de creme na aresta inferior — o "menisco" onde a faixa
 * encontra o corpo claro. `.grain-lux` NÃO é usada: o comentário dela em
 * globals.css é explícito em não aplicá-la sob `data-superficie="clara"`.
 */
export default function CapaCatalogo() {
  return (
    <section className="relative w-full overflow-hidden bg-foreground text-background">
      {/* Profundidade: clareamento diagonal quase imperceptível. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-transparent"
      />
      {/* A costura: o creme do corpo já começa a subir na aresta de baixo. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background/15"
      />

      <div className="relative mx-auto flex min-h-[260px] w-full max-w-6xl flex-col justify-end px-5 py-12 sm:min-h-[300px] sm:px-8 sm:py-16">
        <p className="font-sans text-xs text-background/70">Catálogo</p>
        {/* Display contido: 30px, peso 400, sentence case, à esquerda (§2.4). */}
        <h1 className="mt-3 max-w-2xl font-serif text-[1.75rem] font-normal leading-[1.2] sm:text-[1.875rem]">
          Fragrâncias em curadoria
        </h1>
        <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-background/75">
          Uma seleção viva de perfumes importados e decants de nicho. Encontre a
          sua assinatura.
        </p>
      </div>
    </section>
  );
}
