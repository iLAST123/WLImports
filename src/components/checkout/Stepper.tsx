"use client";

export const PASSOS = ["Identificação", "Entrega", "Pagamento"] as const;

/**
 * Indicador de progresso. É informativo (não é navegação por clique — voltar
 * acontece pelo botão "Voltar" de cada etapa, que preserva o estado do form).
 * O passo atual é marcado com aria-current="step"; os concluídos e os
 * pendentes ganham texto invisível para leitor de tela.
 *
 * Superfície clara: a régua concluída/ativa vira `bg-foreground` (a tinta do
 * texto, como a Aesop faz) e a pendente `bg-muted` — não `bg-border`, que no
 * creme é quase invisível e deixaria o passo pendente sem régua nenhuma.
 * O estado nunca é comunicado só por cor: o rótulo ativo fica em peso médio e
 * há texto para leitor de tela em todos os três.
 */
export default function Stepper({ atual }: { atual: number }) {
  return (
    <nav aria-label="Progresso do checkout">
      <ol className="flex w-full items-center gap-3 sm:gap-4">
        {PASSOS.map((rotulo, i) => {
          const concluido = i < atual;
          const ativo = i === atual;
          return (
            <li key={rotulo} className="flex min-w-0 flex-1 flex-col gap-2">
              <span
                aria-hidden="true"
                className={`h-px w-full transition-colors duration-500 ease-lux ${
                  concluido || ativo ? "bg-foreground" : "bg-muted/50"
                }`}
              />
              <span
                className={`truncate font-sans text-xs transition-colors duration-500 ease-lux ${
                  ativo
                    ? "font-medium text-foreground"
                    : concluido
                      ? "text-foreground"
                      : "text-muted"
                }`}
                {...(ativo ? { "aria-current": "step" as const } : {})}
              >
                <span aria-hidden="true">{i + 1}. </span>
                {rotulo}
                <span className="sr-only">
                  {concluido
                    ? " (concluído)"
                    : ativo
                      ? " (etapa atual)"
                      : " (pendente)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
