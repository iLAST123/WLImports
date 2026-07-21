"use client";

import type { HTMLInputTypeAttribute } from "react";

/**
 * Input de checkout: label SEMPRE visível (placeholder não é rótulo), altura
 * mínima de 44px para toque, anel de foco dourado bem visível e ligação
 * explícita do erro via aria-describedby + aria-invalid.
 */
export default function CampoTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
  tipo = "text",
  autoComplete,
  inputMode,
  placeholder,
  dica,
  opcional = false,
  className,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  tipo?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  placeholder?: string;
  dica?: string;
  opcional?: boolean;
  className?: string;
}) {
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;
  const descritores = [erro ? idErro : null, dica ? idDica : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`flex min-w-0 flex-col ${className ?? ""}`}>
      <label
        htmlFor={id}
        className="mb-2 font-sans text-xs uppercase tracking-[0.18em] text-muted"
      >
        {rotulo}
        {opcional && <span className="normal-case tracking-normal"> (opcional)</span>}
      </label>

      <input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores || undefined}
        className={`h-12 w-full rounded-sm border bg-surface px-4 font-sans text-base text-foreground outline-none transition-colors duration-300 ease-lux placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          erro
            ? "border-rose-400/70"
            : "border-border hover:border-gold/40 focus-visible:border-gold"
        }`}
      />

      {dica && (
        <p id={idDica} className="mt-2 font-sans text-xs text-muted/80">
          {dica}
        </p>
      )}

      {erro && (
        <p
          id={idErro}
          className="mt-2 font-sans text-xs text-rose-300"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
