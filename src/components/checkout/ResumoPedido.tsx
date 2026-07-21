"use client";

/**
 * Forma mínima de um item do carrinho consumida pelo checkout — declarada
 * localmente para o resumo servir tanto ao carrinho vivo quanto ao snapshot
 * congelado do pedido registrado.
 */
export interface ItemResumo {
  id: number;
  nome: string;
  preco?: number;
  precoFormatado?: string;
  consultar?: boolean;
  imagemURL?: string;
  quantidade: number;
}

function ehSobConsulta(item: ItemResumo): boolean {
  return item.consultar === true || typeof item.preco !== "number";
}

function LinhaItem({ item }: { item: ItemResumo }) {
  const inicial = item.nome.trim().charAt(0).toUpperCase() || "W";
  const sobConsulta = ehSobConsulta(item);

  return (
    <li className="flex items-start gap-4 py-4">
      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-sm border border-border bg-background">
        {item.imagemURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imagemURL}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="text-gold-gradient flex h-full w-full items-center justify-center font-serif text-2xl font-semibold opacity-80"
          >
            {inicial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm leading-snug text-foreground">
          {item.nome}
        </p>
        <p className="mt-1 font-sans text-xs text-muted">
          Quantidade: {item.quantidade}
        </p>
      </div>

      <p
        className={`shrink-0 font-sans text-sm ${
          sobConsulta ? "text-champagne" : "text-gold"
        }`}
      >
        {sobConsulta ? "Sob consulta" : item.precoFormatado}
      </p>
    </li>
  );
}

/**
 * Resumo do pedido — read-only. Quantidade e remoção acontecem na sacola;
 * aqui o foco é conferir. "Sob consulta" nunca vira R$ 0,00, e a UI diz em
 * texto que esses itens ficam de fora do subtotal.
 */
export default function ResumoPedido({
  itens,
  subtotalFormatado,
  temItemSobConsulta,
  titulo = "Resumo do pedido",
}: {
  itens: ItemResumo[];
  subtotalFormatado: string;
  temItemSobConsulta: boolean;
  titulo?: string;
}) {
  const totalItens = itens.reduce((soma, i) => soma + i.quantidade, 0);

  return (
    <div className="rounded-sm border border-border bg-surface p-6 shadow-lux sm:p-8">
      <h2 className="font-serif text-xl text-foreground">{titulo}</h2>
      <p className="mt-1 font-sans text-xs uppercase tracking-[0.18em] text-muted">
        {totalItens} {totalItens === 1 ? "item" : "itens"}
      </p>

      <ul className="mt-6 divide-y divide-border border-y border-border">
        {itens.map((item) => (
          <LinhaItem key={item.id} item={item} />
        ))}
      </ul>

      <dl className="mt-6 space-y-3 font-sans text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-foreground">{subtotalFormatado}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Frete</dt>
          <dd className="text-champagne">A combinar</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-serif text-base text-foreground">Total</dt>
          <dd className="text-right font-serif text-base text-gold">
            A confirmar
          </dd>
        </div>
      </dl>

      {temItemSobConsulta && (
        <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
          Itens marcados como <span className="text-champagne">Sob consulta</span>{" "}
          não entram no subtotal — o valor é informado pelo nosso time no
          atendimento.
        </p>
      )}

      <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
        O total final, incluindo frete, é confirmado com você antes de qualquer
        cobrança.
      </p>
    </div>
  );
}
