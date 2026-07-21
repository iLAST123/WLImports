"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ResumoPedido, { type ItemResumo } from "@/components/checkout/ResumoPedido";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Tela final. Honestidade primeiro: o pedido foi REGISTRADO nesta simulação,
 * nada foi cobrado. Nenhum contato inventado — o projeto ainda não tem
 * telefone/e-mail públicos, então o texto é neutro em vez de falso.
 */
export default function Confirmacao({
  numero,
  itens,
  subtotalFormatado,
  temItemSobConsulta,
  entrega,
  pagamento,
}: {
  numero: string;
  itens: ItemResumo[];
  subtotalFormatado: string;
  temItemSobConsulta: boolean;
  entrega: string;
  pagamento: string;
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Move o foco para o título assim que a confirmação aparece: quem navega por
  // teclado/leitor de tela não fica preso no fim do formulário que sumiu.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-10"
    >
      <div>
        <p className="font-sans text-xs uppercase tracking-[0.32em] text-gold">
          Pedido registrado
        </p>

        <h1
          ref={tituloRef}
          tabIndex={-1}
          className="mt-4 font-serif text-3xl font-semibold leading-tight text-foreground outline-none sm:text-4xl"
        >
          Recebemos seu pedido.
          <br />
          <span className="italic text-champagne">Agora falamos com você.</span>
        </h1>

        <div role="status" aria-live="polite">
          <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-muted">
            Seu pedido foi registrado nesta simulação. Nenhum pagamento foi
            processado e nenhuma cobrança foi feita. Nosso time entra em contato
            para confirmar valores, frete e a forma de pagamento antes de
            qualquer acerto.
          </p>
        </div>

        <p className="mt-8 font-sans text-xs uppercase tracking-[0.18em] text-muted">
          Número do pedido
        </p>
        <p className="mt-2 font-serif text-2xl text-gold">{numero}</p>
        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-muted">
          Guarde este número — ele identifica seu pedido na conversa com o nosso
          time. Ele existe apenas nesta tela: nada foi salvo nem enviado.
        </p>
      </div>

      <ResumoPedido
        titulo="O que você pediu"
        itens={itens}
        subtotalFormatado={subtotalFormatado}
        temItemSobConsulta={temItemSobConsulta}
      />

      <dl className="grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
            Forma de envio
          </dt>
          <dd className="mt-2 font-sans text-sm text-foreground">{entrega}</dd>
        </div>
        <div>
          <dt className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
            Forma de pagamento preferida
          </dt>
          <dd className="mt-2 font-sans text-sm text-foreground">{pagamento}</dd>
        </div>
      </dl>

      <Link
        href="/#catalogo"
        className="inline-flex h-12 w-full items-center justify-center rounded-sm border border-gold/50 px-8 font-sans text-sm uppercase tracking-[0.18em] text-champagne outline-none transition-colors duration-300 ease-lux hover:border-gold hover:text-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:self-start"
      >
        Voltar à curadoria
      </Link>
    </motion.div>
  );
}
