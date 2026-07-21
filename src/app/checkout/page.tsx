"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCarrinho } from "@/lib/carrinho";
import SuperficieLoja from "@/components/loja/SuperficieLoja";
import Stepper, { PASSOS } from "@/components/checkout/Stepper";
import PassoIdentificacao from "@/components/checkout/PassoIdentificacao";
import PassoEntrega, {
  OPCOES_FRETE,
  type ValorFrete,
} from "@/components/checkout/PassoEntrega";
import PassoPagamento, {
  OPCOES_PAGAMENTO,
  type ValorPagamento,
} from "@/components/checkout/PassoPagamento";
import ResumoPedido, {
  rotularSubtotal,
  type ItemResumo,
} from "@/components/checkout/ResumoPedido";
import Confirmacao from "@/components/checkout/Confirmacao";
import {
  CAMPOS_ENTREGA,
  CAMPOS_IDENTIFICACAO,
  FORMULARIO_VAZIO,
  gerarNumeroPedido,
  validarCampos,
  type CampoCheckout,
  type ErrosCheckout,
  type FormularioCheckout,
} from "@/components/checkout/validacao";

const EASE = [0.22, 1, 0.36, 1] as const;

const DESCRICAO_PASSO = [
  "Para falarmos com você sobre este pedido.",
  "Onde a fragrância deve chegar.",
  "Como você prefere acertar com a gente.",
];

/* Store constante para o flag de hidratação: nunca notifica mudança, o valor
   só difere entre servidor (false) e cliente (true). */
const assinarNada = () => () => {};
const snapshotCliente = () => true;
const snapshotServidor = () => false;

/** Snapshot congelado no momento do registro — o carrinho é limpo em seguida. */
interface PedidoRegistrado {
  numero: string;
  itens: ItemResumo[];
  subtotalFormatado: string;
  temItemSobConsulta: boolean;
  entrega: string;
  pagamento: string;
}

export default function CheckoutPage() {
  const {
    itens,
    subtotalFormatado,
    temItemSobConsulta,
    limpar,
  } = useCarrinho();

  // O carrinho vive no localStorage e só existe depois da hidratação. Enquanto
  // `pronto` é false renderizamos um esqueleto neutro — o mesmo markup no
  // servidor e no primeiro render do cliente (sem hydration mismatch) e sem
  // flash de "carrinho vazio" para quem tem itens.
  // useSyncExternalStore em vez de useState+useEffect: é o jeito que o React 19
  // recomenda para "já hidratou?" (snapshot do servidor false, do cliente true)
  // e não dispara setState dentro de efeito.
  const pronto = useSyncExternalStore(
    assinarNada,
    snapshotCliente,
    snapshotServidor
  );

  const [passo, setPasso] = useState(0);
  const [formulario, setFormulario] =
    useState<FormularioCheckout>(FORMULARIO_VAZIO);
  const [erros, setErros] = useState<ErrosCheckout>({});
  const [frete, setFrete] = useState<ValorFrete>("retirada");
  const [pagamento, setPagamento] = useState<ValorPagamento>("pix");
  const [pedido, setPedido] = useState<PedidoRegistrado | null>(null);

  const tituloPassoRef = useRef<HTMLHeadingElement>(null);
  const primeiroRender = useRef(true);

  // Ao trocar de etapa, o foco vai para o título dela (nunca no primeiro
  // render, para não roubar o foco de quem acabou de abrir a página).
  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    tituloPassoRef.current?.focus();
  }, [passo]);

  function aoMudarCampo(campo: CampoCheckout, valor: string) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
    // Erro some assim que o campo é editado — corrigir não deve continuar
    // parecendo errado enquanto se digita.
    setErros((atual) => {
      if (!atual[campo]) return atual;
      const proximo = { ...atual };
      delete proximo[campo];
      return proximo;
    });
  }

  function focarPrimeiroInvalido(
    campos: CampoCheckout[],
    encontrados: ErrosCheckout
  ) {
    const alvo = campos.find((campo) => encontrados[campo]);
    if (!alvo) return;
    const elemento = document.getElementById(alvo);
    if (elemento instanceof HTMLElement) elemento.focus();
  }

  function registrarPedido() {
    const snapshot: PedidoRegistrado = {
      numero: gerarNumeroPedido(),
      itens: itens.map((item) => ({ ...item })),
      subtotalFormatado,
      temItemSobConsulta,
      entrega:
        OPCOES_FRETE.find((o) => o.valor === frete)?.titulo ?? "A combinar",
      pagamento:
        OPCOES_PAGAMENTO.find((o) => o.valor === pagamento)?.titulo ??
        "A combinar",
    };

    // TODO(gateway): ponto exato de integração. Hoje o pedido é resolvido 100%
    // no client — nenhum fetch, nenhum dado do cliente sai daqui. Ao plugar um
    // gateway/CRM de verdade, é AQUI que o pedido deve ser enviado (com
    // tratamento de erro e estado de "processando"), antes de limpar a sacola.
    setPedido(snapshot);
    limpar();
  }

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (passo === 2) {
      registrarPedido();
      return;
    }

    const campos = passo === 0 ? CAMPOS_IDENTIFICACAO : CAMPOS_ENTREGA;
    const encontrados = validarCampos(campos, formulario);
    setErros(encontrados);

    if (Object.keys(encontrados).length > 0) {
      focarPrimeiroInvalido(campos, encontrados);
      return;
    }

    setPasso((atual) => atual + 1);
  }

  const cabecalho = (
    // pt-16/sm:pt-20 reserva a altura do SiteHeader, que é `fixed` e não ocupa
    // espaço no fluxo — sem isso esta faixa fica POR BAIXO do header global
    // (wordmark e "Finalizar pedido" se sobrepondo). Regressão já cara uma vez.
    <div className="border-b border-muted/30 pt-16 sm:pt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <p className="font-sans text-xs text-muted">Finalizar pedido</p>
        {/* Selo de simulação: `border-muted` + `text-foreground`, nunca um
            contorno decorativo — precisa ser lido, não decorar. */}
        <p className="rounded-full border border-muted px-3 py-1 font-sans text-xs text-foreground">
          Checkout demonstrativo
        </p>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Estado 1 — carregando (antes da hidratação do carrinho)           */
  /* ---------------------------------------------------------------- */
  if (!pronto) {
    return (
      <SuperficieLoja>
        {cabecalho}
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <p className="sr-only" role="status">
            Carregando sua sacola.
          </p>
          <div aria-hidden="true" className="flex flex-col gap-4">
            <div className="h-8 w-56 bg-surface" />
            <div className="h-4 w-72 bg-surface" />
            <div className="mt-6 h-64 w-full bg-surface" />
          </div>
        </div>
      </SuperficieLoja>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Estado 2 — pedido registrado (checado ANTES do vazio: limpar()    */
  /* esvazia a sacola de propósito)                                    */
  /* ---------------------------------------------------------------- */
  if (pedido) {
    return (
      <SuperficieLoja>
        {cabecalho}
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <Confirmacao
            numero={pedido.numero}
            itens={pedido.itens}
            subtotalFormatado={pedido.subtotalFormatado}
            temItemSobConsulta={pedido.temItemSobConsulta}
            entrega={pedido.entrega}
            pagamento={pedido.pagamento}
          />
        </div>
      </SuperficieLoja>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Estado 3 — sacola vazia                                           */
  /* ---------------------------------------------------------------- */
  if (itens.length === 0) {
    return (
      <SuperficieLoja>
        {cabecalho}
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="font-sans text-xs text-gold">Sacola vazia</p>
          <h1 className="mt-3 font-serif text-3xl font-normal leading-tight text-foreground">
            Ainda não há nada para finalizar.
          </h1>
          <p className="mt-4 max-w-prose font-sans text-sm leading-relaxed text-muted">
            Escolha uma fragrância da curadoria e ela aparece aqui — com preço
            ou como “sob consulta”, sempre sem surpresa.
          </p>
          <Link
            href="/#catalogo"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-none border border-muted px-8 font-sans text-sm text-foreground outline-none transition-colors duration-300 ease-lux hover:bg-surface focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Explorar a curadoria
          </Link>
        </div>
      </SuperficieLoja>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Estado 4 — checkout                                               */
  /* ---------------------------------------------------------------- */
  const resumo = (
    <ResumoPedido
      itens={itens}
      subtotalFormatado={subtotalFormatado}
      temItemSobConsulta={temItemSobConsulta}
    />
  );

  return (
    <SuperficieLoja>
      {cabecalho}

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        {/* Coluna do formulário */}
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-normal leading-tight text-foreground">
            Finalizar pedido
          </h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-foreground">
            Este checkout é uma demonstração: nenhum pagamento é processado e
            nenhum dado seu é enviado ou salvo. Ao final, registramos o pedido e
            combinamos valores e pagamento no atendimento.
          </p>

          <div className="mt-8">
            <Stepper atual={passo} />
          </div>

          {/* Resumo no mobile: colapsável nativo, acima do formulário */}
          <details className="mt-6 border border-muted lg:hidden">
            <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 px-5 py-3 font-sans text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset">
              Ver resumo do pedido
              <span className="font-sans text-sm text-muted">
                {rotularSubtotal(itens, subtotalFormatado)}
              </span>
            </summary>
            <div>{resumo}</div>
          </details>

          <form onSubmit={aoEnviar} noValidate className="mt-8">
            <h2
              ref={tituloPassoRef}
              tabIndex={-1}
              className="font-serif text-2xl font-normal text-foreground outline-none"
            >
              {PASSOS[passo]}
            </h2>
            <p className="mt-1.5 font-sans text-sm text-muted">
              {DESCRICAO_PASSO[passo]}
            </p>

            <div className="mt-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={passo}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {passo === 0 && (
                    <PassoIdentificacao
                      formulario={formulario}
                      erros={erros}
                      aoMudar={aoMudarCampo}
                    />
                  )}
                  {passo === 1 && (
                    <PassoEntrega
                      formulario={formulario}
                      erros={erros}
                      aoMudar={aoMudarCampo}
                      frete={frete}
                      aoMudarFrete={setFrete}
                    />
                  )}
                  {passo === 2 && (
                    <PassoPagamento
                      pagamento={pagamento}
                      aoMudarPagamento={setPagamento}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Botão vazado usa `border-muted` (não `border-border`): a moldura
                é a única pista visual do controle. O primário é o "botão
                escuro" da Aesop — bg-foreground/text-background, 12,96:1. */}
            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {passo > 0 ? (
                <button
                  type="button"
                  onClick={() => setPasso((atual) => atual - 1)}
                  className="inline-flex h-12 items-center justify-center rounded-none border border-muted px-6 font-sans text-sm text-foreground outline-none transition-colors duration-300 ease-lux hover:bg-surface focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Voltar
                </button>
              ) : (
                <Link
                  href="/#catalogo"
                  className="inline-flex h-12 items-center justify-center rounded-none border border-muted px-6 font-sans text-sm text-foreground outline-none transition-colors duration-300 ease-lux hover:bg-surface focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Continuar comprando
                </Link>
              )}

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-none bg-foreground px-8 font-sans text-sm text-background outline-none transition-colors duration-300 ease-lux hover:bg-gold focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {passo === 2 ? "Registrar pedido" : "Continuar"}
              </button>
            </div>

            {passo === 2 && (
              <p className="mt-4 max-w-prose font-sans text-xs leading-relaxed text-muted">
                Ao registrar, nada é cobrado: geramos um número de pedido para
                nossa conversa e confirmamos valores, frete e pagamento com você.
              </p>
            )}
          </form>
        </div>

        {/* Resumo sticky no desktop */}
        <aside
          aria-label="Resumo do pedido"
          className="hidden min-w-0 lg:block"
        >
          {/* top-24/sm:top-28 = altura do SiteHeader fixo + folga: sem isso o
              resumo sticky encosta por baixo do header ao rolar. */}
          <div className="sticky top-24 sm:top-28">{resumo}</div>
        </aside>
      </div>
    </SuperficieLoja>
  );
}
