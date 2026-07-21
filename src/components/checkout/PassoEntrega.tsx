"use client";

import CampoTexto from "@/components/checkout/CampoTexto";
import OpcaoRadio from "@/components/checkout/OpcaoRadio";
import {
  mascararCEP,
  mascararUF,
  type CampoCheckout,
  type ErrosCheckout,
  type FormularioCheckout,
} from "@/components/checkout/validacao";

/**
 * Opções de envio FIXAS e declaradas como estimativa. Nenhum valor é calculado:
 * não há consulta de CEP nem API dos Correios neste projeto, e inventar um
 * frete numérico seria mentir para o cliente.
 */
export const OPCOES_FRETE = [
  {
    valor: "retirada",
    titulo: "Retirada / combinar com a loja",
    descricao:
      "Você combina local e horário direto com o nosso time no atendimento.",
    nota: "Sem custo de envio",
  },
  {
    valor: "nacional",
    titulo: "Envio nacional",
    descricao:
      "Embalagem protegida e rastreio ponta a ponta para todo o Brasil.",
    nota: "Valor confirmado no atendimento",
  },
] as const;

export type ValorFrete = (typeof OPCOES_FRETE)[number]["valor"];

export default function PassoEntrega({
  formulario,
  erros,
  aoMudar,
  frete,
  aoMudarFrete,
}: {
  formulario: FormularioCheckout;
  erros: ErrosCheckout;
  aoMudar: (campo: CampoCheckout, valor: string) => void;
  frete: ValorFrete;
  aoMudarFrete: (valor: ValorFrete) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,180px)_1fr]">
        <CampoTexto
          id="cep"
          rotulo="CEP"
          inputMode="numeric"
          valor={formulario.cep}
          aoMudar={(v) => aoMudar("cep", mascararCEP(v))}
          erro={erros.cep}
          autoComplete="postal-code"
          placeholder="01310-100"
        />
        <CampoTexto
          id="rua"
          rotulo="Rua / Avenida"
          valor={formulario.rua}
          aoMudar={(v) => aoMudar("rua", v)}
          erro={erros.rua}
          autoComplete="address-line1"
          placeholder="Av. Paulista"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,140px)_1fr]">
        <CampoTexto
          id="numero"
          rotulo="Número"
          valor={formulario.numero}
          aoMudar={(v) => aoMudar("numero", v)}
          erro={erros.numero}
          autoComplete="address-line2"
          placeholder="1000"
        />
        <CampoTexto
          id="complemento"
          rotulo="Complemento"
          opcional
          valor={formulario.complemento}
          aoMudar={(v) => aoMudar("complemento", v)}
          erro={erros.complemento}
          placeholder="Apto 52, bloco B"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_1fr_minmax(0,110px)]">
        <CampoTexto
          id="bairro"
          rotulo="Bairro"
          valor={formulario.bairro}
          aoMudar={(v) => aoMudar("bairro", v)}
          erro={erros.bairro}
          placeholder="Bela Vista"
        />
        <CampoTexto
          id="cidade"
          rotulo="Cidade"
          valor={formulario.cidade}
          aoMudar={(v) => aoMudar("cidade", v)}
          erro={erros.cidade}
          autoComplete="address-level2"
          placeholder="São Paulo"
        />
        <CampoTexto
          id="uf"
          rotulo="UF"
          valor={formulario.uf}
          aoMudar={(v) => aoMudar("uf", mascararUF(v))}
          erro={erros.uf}
          autoComplete="address-level1"
          placeholder="SP"
        />
      </div>

      <fieldset className="mt-2 min-w-0">
        <legend className="mb-2 font-sans text-xs text-muted">
          Forma de envio
        </legend>
        <p className="mb-3 max-w-prose font-sans text-sm leading-relaxed text-muted">
          As opções abaixo são estimativas: o valor do frete é combinado com você
          no atendimento, não calculado automaticamente aqui.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPCOES_FRETE.map((opcao) => (
            <OpcaoRadio
              key={opcao.valor}
              name="frete"
              value={opcao.valor}
              checked={frete === opcao.valor}
              aoSelecionar={(v) => aoMudarFrete(v as ValorFrete)}
              titulo={opcao.titulo}
              descricao={opcao.descricao}
              nota={opcao.nota}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
