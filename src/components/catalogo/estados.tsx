"use client";

/**
 * Estados não-felizes do catálogo (loading / erro / vazio / sem resultado),
 * compartilhados pela prévia da home e pela PLP. Só tokens semânticos: os
 * mesmos blocos servem à superfície escura e à clara.
 */

/** Botão secundário vazado. `border-muted` e não `border-border`: aqui a borda
 *  é a ÚNICA pista visual do controle (item 5 do contrato de globals.css). */
const BOTAO =
  "mt-6 border border-muted px-6 py-3 font-sans text-sm text-foreground transition-colors duration-300 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function GradeEsqueleto({
  itens = 8,
  className = "",
}: {
  itens?: number;
  className?: string;
}) {
  return (
    <>
      {/* Quem usa leitor de tela ouve o aviso, não uma lista de caixas vazias. */}
      <p role="status" className="sr-only">
        Carregando catálogo…
      </p>
      <div
        aria-hidden="true"
        className={`grid grid-cols-2 gap-x-5 gap-y-10 lg:gap-x-[30px] lg:gap-y-[50px] ${className}`}
      >
        {Array.from({ length: itens }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] w-full bg-surface motion-safe:animate-pulse" />
            <div className="mt-4 h-3.5 w-3/4 bg-surface motion-safe:animate-pulse" />
            <div className="mt-2 h-3 w-1/3 bg-surface motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </>
  );
}

export function EstadoErro({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="font-sans text-base text-foreground">
        Não foi possível carregar o catálogo.
      </p>
      <p className="mx-auto mt-2 max-w-sm font-sans text-sm text-muted">
        Algo interrompeu a conexão. Tente novamente em instantes.
      </p>
      <button type="button" onClick={onRetry} className={BOTAO}>
        Tentar de novo
      </button>
    </div>
  );
}

export function EstadoVazio() {
  return (
    <div className="py-20 text-center">
      <p className="font-sans text-base text-foreground">
        Catálogo em atualização.
      </p>
      <p className="mt-2 font-sans text-sm text-muted">
        Novas fragrâncias chegam em breve.
      </p>
    </div>
  );
}

export function EstadoSemResultado({ onLimpar }: { onLimpar: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="font-sans text-base text-foreground">
        Nenhuma fragrância encontrada.
      </p>
      <p className="mt-2 font-sans text-sm text-muted">
        Ajuste a busca ou limpe os filtros para ver tudo.
      </p>
      <button type="button" onClick={onLimpar} className={BOTAO}>
        Limpar filtros
      </button>
    </div>
  );
}
