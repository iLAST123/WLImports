"use client";

import type { HTMLInputTypeAttribute } from "react";

/**
 * Input de checkout na SUPERFÍCIE CLARA.
 *
 * Três decisões que não são estéticas, são de legibilidade:
 *
 * 1. `border-muted`, nunca `border-border`. O contrato em globals.css (item 5)
 *    é explícito: `border-border` é hairline DECORATIVO (~1,33:1 no creme) e
 *    aqui a borda é a ÚNICA pista visual de que existe um campo — sem ela o
 *    formulário inteiro some no creme. `border-muted` dá 5,77:1 sobre o fundo,
 *    bem acima do mínimo 3:1 de componente de UI (WCAG 1.4.11).
 * 2. O campo é `bg-background` (creme claro) dentro de uma página que também é
 *    creme: quem separa é a moldura, no espírito do campo de busca emoldurado
 *    da Aesop — não um retângulo cinza.
 * 3. Erro NÃO depende só de cor (WCAG 1.4.1): além do vermelho, entra um ícone
 *    e a palavra do erro em texto, ligados por aria-describedby + aria-invalid.
 *
 * Tipografia: rótulo 12px sentence case, campo 14px, `letter-spacing: normal`.
 * O uppercase + tracking largo saiu — a medição da Aesop (referencias-aesop §2)
 * mostra caixa alta aparecendo 2× na home inteira.
 *
 * Erro usa o token semântico `danger`, que tem valor por superfície
 * (coral no escuro 7,82:1 / tijolo no claro 7,58:1 — ver a prova de contraste
 * em globals.css). E a cor NUNCA é a única pista: vem sempre com ícone + texto.
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
      <label htmlFor={id} className="mb-1.5 font-sans text-xs text-muted">
        {rotulo}
        {opcional && <span> (opcional)</span>}
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
        className={`h-12 w-full rounded-none border bg-background px-3.5 font-sans text-sm text-foreground outline-none transition-colors duration-300 ease-lux placeholder:text-muted/70 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          erro
            ? "border-danger focus-visible:border-danger"
            : "border-muted hover:border-foreground focus-visible:border-foreground"
        }`}
      />

      {dica && (
        <p id={idDica} className="mt-1.5 font-sans text-xs text-muted">
          {dica}
        </p>
      )}

      {erro && (
        <p
          id={idErro}
          className="mt-1.5 flex items-start gap-1.5 font-sans text-xs text-danger"
        >
          {/* O ícone garante que o erro não seja comunicado só pela cor. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            className="mt-px h-3.5 w-3.5 shrink-0"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.75v3.75" />
            <path d="M8 11.1h.01" />
          </svg>
          <span>{erro}</span>
        </p>
      )}
    </div>
  );
}
