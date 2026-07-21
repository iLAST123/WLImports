/**
 * Casca das páginas de COMPRA (catálogo, produto, checkout).
 *
 * O site é híbrido por decisão de produto: a abertura (home/hero) continua
 * escura e cinematográfica; as páginas onde se compra são CLARAS e calmas, no
 * espírito Aesop. Este componente é o único lugar que declara essa virada.
 *
 * `data-superficie="clara"` remapeia os tokens semânticos no escopo (ver o
 * contrato no topo de `src/app/globals.css`): `bg-background` vira creme,
 * `text-foreground` vira quase-preto, `text-gold` vira bronze — sem que nenhum
 * componente filho precise saber em que superfície está. Por isso card, botão
 * e input escritos só com token semântico funcionam nas duas.
 *
 * `bg-background` aqui é obrigatório: o <body> segue escuro (é a base da
 * marca), então é esta casca que pinta o creme por baixo do conteúdo.
 *
 * O padding do topo compensa o SiteHeader, que é `fixed` (h-16 / sm:h-20).
 */
export default function SuperficieLoja({
  children,
  className = "",
}: {
  children: React.ReactNode;
  /** Espaçamento/composição extra do <main> da página. */
  className?: string;
}) {
  return (
    <main
      data-superficie="clara"
      className={`flex flex-1 flex-col bg-background text-foreground ${className}`}
    >
      {children}
    </main>
  );
}
