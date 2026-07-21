"use client";

/**
 * Cartão de escolha baseado em <input type="radio"> nativo: navegação por
 * setas, seleção por espaço e leitura correta em leitor de tela vêm de graça.
 * O radio fica visualmente escondido (sr-only) mas focável — o anel de foco é
 * desenhado no <label> via peer-focus-visible.
 */
export default function OpcaoRadio({
  name,
  value,
  checked,
  aoSelecionar,
  titulo,
  descricao,
  nota,
}: {
  name: string;
  value: string;
  checked: boolean;
  aoSelecionar: (valor: string) => void;
  titulo: string;
  descricao: string;
  nota?: string;
}) {
  const id = `${name}-${value}`;

  return (
    <div className="min-w-0">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={() => aoSelecionar(value)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={`flex min-h-[44px] cursor-pointer items-start gap-4 rounded-sm border bg-surface p-5 transition-colors duration-300 ease-lux peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ${
          checked
            ? "border-gold/70"
            : "border-border hover:border-gold/40"
        }`}
      >
        <span
          aria-hidden="true"
          className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ease-lux ${
            checked ? "border-gold" : "border-muted/60"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full transition-opacity duration-300 ease-lux ${
              checked ? "bg-gold opacity-100" : "opacity-0"
            }`}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base text-foreground">
            {titulo}
          </span>
          <span className="mt-1 block font-sans text-sm leading-relaxed text-muted">
            {descricao}
          </span>
          {nota && (
            <span className="mt-2 block font-sans text-xs uppercase tracking-[0.16em] text-champagne">
              {nota}
            </span>
          )}
        </span>
      </label>
    </div>
  );
}
