/**
 * Validação do checkout — client-side, sem lib (zod/react-hook-form fora de
 * escopo). Funções puras: recebem o formulário, devolvem um mapa de erros por
 * campo. Nada aqui persiste ou transmite dado pessoal.
 */

export interface FormularioCheckout {
  nome: string;
  email: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type CampoCheckout = keyof FormularioCheckout;

export type ErrosCheckout = Partial<Record<CampoCheckout, string>>;

export const FORMULARIO_VAZIO: FormularioCheckout = {
  nome: "",
  email: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/** Ordem visual dos campos — define qual campo inválido recebe o foco. */
export const CAMPOS_IDENTIFICACAO: CampoCheckout[] = [
  "nome",
  "email",
  "telefone",
];

export const CAMPOS_ENTREGA: CampoCheckout[] = [
  "cep",
  "rua",
  "numero",
  "bairro",
  "cidade",
  "uf",
];

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D+/g, "");
}

/**
 * Máscaras: formatam o que já foi digitado/colado, nunca bloqueiam a entrada.
 * O usuário pode colar "01310-100" ou "01310100" — os dois viram "01310-100".
 */
export function mascararCEP(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascararUF(valor: string): string {
  return valor.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}

/**
 * Valida UM campo. Retorna a mensagem de erro ou `undefined` se estiver ok.
 * `complemento` é opcional por definição — nunca gera erro.
 */
export function validarCampo(
  campo: CampoCheckout,
  valor: string
): string | undefined {
  const texto = valor.trim();

  switch (campo) {
    case "nome":
      if (!texto) return "Informe seu nome completo.";
      if (texto.split(/\s+/).length < 2)
        return "Informe nome e sobrenome.";
      return undefined;

    case "email":
      if (!texto) return "Informe um e-mail para contato.";
      // Checagem de formato plausível — não tenta ser RFC 5322.
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(texto))
        return "E-mail em formato inválido (ex.: nome@dominio.com).";
      return undefined;

    case "telefone": {
      if (!texto) return "Informe um telefone com DDD.";
      const d = apenasDigitos(texto);
      if (d.length < 10 || d.length > 11)
        return "Telefone deve ter DDD + número (10 ou 11 dígitos).";
      if (d.slice(0, 2) === "00") return "DDD inválido.";
      return undefined;
    }

    case "cep": {
      if (!texto) return "Informe o CEP de entrega.";
      if (apenasDigitos(texto).length !== 8)
        return "CEP deve ter 8 dígitos (ex.: 01310-100).";
      return undefined;
    }

    case "rua":
      return texto ? undefined : "Informe a rua ou avenida.";

    case "numero":
      return texto ? undefined : "Informe o número (ou “s/n”).";

    case "bairro":
      return texto ? undefined : "Informe o bairro.";

    case "cidade":
      return texto ? undefined : "Informe a cidade.";

    case "uf":
      if (!texto) return "Informe a UF.";
      if (!/^[A-Za-z]{2}$/.test(texto)) return "UF deve ter 2 letras (ex.: SP).";
      return undefined;

    case "complemento":
      return undefined;
  }
}

/** Valida um conjunto de campos e devolve só os que falharam. */
export function validarCampos(
  campos: CampoCheckout[],
  formulario: FormularioCheckout
): ErrosCheckout {
  const erros: ErrosCheckout = {};
  for (const campo of campos) {
    const erro = validarCampo(campo, formulario[campo]);
    if (erro) erros[campo] = erro;
  }
  return erros;
}

/** `WL-` + timestamp em base36 maiúsculo. Gerado 100% no client. */
export function gerarNumeroPedido(agora: number = Date.now()): string {
  return `WL-${agora.toString(36).toUpperCase()}`;
}
