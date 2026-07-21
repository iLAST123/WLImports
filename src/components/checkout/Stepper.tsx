"use client";

export const PASSOS = ["Identificação", "Entrega", "Pagamento"] as const;

/**
 * Indicador de progresso. É informativo (não é navegação por clique — voltar
 * acontece pelo botão "Voltar" de cada etapa, que preserva o estado do form).
 * O passo atual é marcado com aria-current="step"; os concluídos e os
 * pendentes ganham texto invisível para leitor de tela.
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
                  concluido || ativo ? "bg-gold" : "bg-border"
                }`}
              />
              <span
                className={`truncate font-sans text-[0.7rem] uppercase tracking-[0.18em] transition-colors duration-500 ease-lux ${
                  ativo
                    ? "text-champagne"
                    : concluido
                      ? "text-gold"
                      : "text-muted/60"
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
