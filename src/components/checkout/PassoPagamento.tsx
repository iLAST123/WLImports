"use client";

import OpcaoRadio from "@/components/checkout/OpcaoRadio";

/**
 * Métodos de pagamento como ESCOLHA VISUAL. Este checkout é uma simulação:
 * não existe gateway, não existe cobrança e nenhum dado sai do navegador.
 * Por isso nenhum campo de cartão é renderizado — não coletamos, não guardamos
 * e não transmitimos dado de cartão em lugar nenhum.
 */
export const OPCOES_PAGAMENTO = [
  {
    valor: "pix",
    titulo: "Pix",
    descricao:
      "A chave e o valor final são enviados pelo nosso time na confirmação.",
  },
  {
    valor: "cartao",
    titulo: "Cartão de crédito",
    descricao:
      "Combinamos o parcelamento no atendimento. Nenhum dado de cartão é pedido nesta tela.",
  },
  {
    valor: "boleto",
    titulo: "Boleto bancário",
    descricao: "O boleto é emitido depois da confirmação do pedido.",
  },
] as const;

export type ValorPagamento = (typeof OPCOES_PAGAMENTO)[number]["valor"];

export default function PassoPagamento({
  pagamento,
  aoMudarPagamento,
}: {
  pagamento: ValorPagamento;
  aoMudarPagamento: (valor: ValorPagamento) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-sm border border-gold/30 bg-surface p-5">
        <p className="font-sans text-xs uppercase tracking-[0.18em] text-gold">
          Checkout demonstrativo
        </p>
        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-foreground/90">
          Nenhum pagamento é processado aqui e nenhum dado é enviado para fora do
          seu navegador. Sua escolha abaixo serve só para sabermos como você
          prefere pagar — a cobrança é combinada com você no atendimento.
        </p>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-4 font-sans text-xs uppercase tracking-[0.18em] text-muted">
          Como você prefere pagar
        </legend>
        <div className="grid gap-3">
          {OPCOES_PAGAMENTO.map((opcao) => (
            <OpcaoRadio
              key={opcao.valor}
              name="pagamento"
              value={opcao.valor}
              checked={pagamento === opcao.valor}
              aoSelecionar={(v) => aoMudarPagamento(v as ValorPagamento)}
              titulo={opcao.titulo}
              descricao={opcao.descricao}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
