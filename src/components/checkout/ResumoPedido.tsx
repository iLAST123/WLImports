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

function ehSobConsulta(
  item: Pick<ItemResumo, "preco" | "consultar">
): boolean {
  return item.consultar === true || typeof item.preco !== "number";
}

/**
 * Rótulo do subtotal — camada de apresentação, sem tocar em `lib/carrinho`.
 *
 * `subtotalFormatado` vem de `formatarBRL(subtotal)`, e uma sacola composta
 * SÓ de itens sob consulta soma 0 → a string seria "R$ 0,00", que este projeto
 * proíbe em qualquer tela (DEC-004 §4: 0 significa "sem preço no ERP", nunca
 * "grátis"). Neste caso o subtotal vira "A combinar".
 */
export function rotularSubtotal(
  itens: readonly Pick<ItemResumo, "preco" | "consultar">[],
  subtotalFormatado: string
): string {
  if (itens.length === 0) return subtotalFormatado;
  return itens.every(ehSobConsulta) ? "A combinar" : subtotalFormatado;
}

function LinhaItem({ item }: { item: ItemResumo }) {
  const inicial = item.nome.trim().charAt(0).toUpperCase() || "W";
  const sobConsulta = ehSobConsulta(item);

  return (
    <li className="flex items-start gap-4 py-4">
      {/* Plate tingida atrás da foto, como na PLP da Aesop — a imagem não
          flutua no creme, senta num retângulo um passo mais escuro. */}
      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-none bg-surface">
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
            className="text-gold-gradient flex h-full w-full items-center justify-center font-serif text-2xl opacity-80"
          >
            {inicial}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-medium leading-snug text-foreground">
          {item.nome}
        </p>
        <p className="mt-1 font-sans text-xs text-muted">
          Quantidade: {item.quantidade}
        </p>
      </div>

      {/* Regra de domínio: item sem preço no ERP nunca vira "R$ 0,00". */}
      <p
        className={`shrink-0 font-sans text-sm ${
          sobConsulta ? "text-muted" : "text-foreground"
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
 *
 * Superfície clara: o painel é `bg-surface` (creme tingido) sem borda e sem
 * sombra — no creme a sombra dourada da marca vira sujeira, e a Aesop separa
 * blocos por tinta, não por moldura.
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
  const subtotal = rotularSubtotal(itens, subtotalFormatado);

  return (
    <div className="bg-surface p-6 sm:p-7">
      <h2 className="font-serif text-2xl font-normal leading-tight text-foreground">
        {titulo}
      </h2>
      <p className="mt-1 font-sans text-xs text-muted">
        {totalItens} {totalItens === 1 ? "item" : "itens"}
      </p>

      <ul className="mt-5 divide-y divide-muted/30 border-y border-muted/30">
        {itens.map((item) => (
          <LinhaItem key={item.id} item={item} />
        ))}
      </ul>

      <dl className="mt-5 space-y-2.5 font-sans text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-foreground">{subtotal}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">Frete</dt>
          <dd className="text-foreground">A combinar</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-muted/30 pt-3">
          <dt className="font-medium text-foreground">Total</dt>
          <dd className="text-right font-medium text-foreground">
            A confirmar
          </dd>
        </div>
      </dl>

      {temItemSobConsulta && (
        <p className="mt-4 font-sans text-xs leading-relaxed text-muted">
          Itens marcados como{" "}
          <span className="text-foreground">Sob consulta</span> não entram no
          subtotal — o valor é informado pelo nosso time no atendimento.
        </p>
      )}

      <p className="mt-3 font-sans text-xs leading-relaxed text-muted">
        O total final, incluindo frete, é confirmado com você antes de qualquer
        cobrança.
      </p>
    </div>
  );
}
