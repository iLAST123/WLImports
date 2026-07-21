"use client";

import CampoTexto from "@/components/checkout/CampoTexto";
import {
  mascararTelefone,
  type CampoCheckout,
  type ErrosCheckout,
  type FormularioCheckout,
} from "@/components/checkout/validacao";

export default function PassoIdentificacao({
  formulario,
  erros,
  aoMudar,
}: {
  formulario: FormularioCheckout;
  erros: ErrosCheckout;
  aoMudar: (campo: CampoCheckout, valor: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose font-sans text-sm leading-relaxed text-muted">
        Usamos esses dados apenas para falar com você sobre este pedido. Nada é
        salvo nem enviado nesta demonstração — as informações ficam só nesta aba
        e desaparecem ao fechar a página.
      </p>

      <CampoTexto
        id="nome"
        rotulo="Nome completo"
        valor={formulario.nome}
        aoMudar={(v) => aoMudar("nome", v)}
        erro={erros.nome}
        autoComplete="name"
        placeholder="Ana Ribeiro"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <CampoTexto
          id="email"
          rotulo="E-mail"
          tipo="email"
          inputMode="email"
          valor={formulario.email}
          aoMudar={(v) => aoMudar("email", v)}
          erro={erros.email}
          autoComplete="email"
          placeholder="ana@exemplo.com"
        />

        <CampoTexto
          id="telefone"
          rotulo="Telefone / WhatsApp"
          tipo="tel"
          inputMode="tel"
          valor={formulario.telefone}
          aoMudar={(v) => aoMudar("telefone", mascararTelefone(v))}
          erro={erros.telefone}
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          dica="Com DDD. É por aqui que confirmamos valores e frete."
        />
      </div>
    </div>
  );
}
