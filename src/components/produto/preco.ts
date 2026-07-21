import type { Produto } from "@/lib/types";

/**
 * Regra de domínio dura (DEC-001/aprendizados 2026-07-19): `preco: 0` /
 * `consultar: true` significa **sem preço cadastrado no ERP** — a UI diz
 * "Sob consulta" e **nunca** "R$ 0,00".
 *
 * Vive aqui (e não em `src/lib`) porque é decisão de APRESENTAÇÃO: o servidor
 * (ficha) e o client (rótulo do CTA) precisam da mesma resposta, e nenhum dos
 * dois pode divergir sobre o que mostrar.
 */
export function precoDoProduto(produto: Produto): {
  semPreco: boolean;
  texto: string;
} {
  const semPreco = produto.consultar === true || !produto.precoFormatado;
  return {
    semPreco,
    texto: semPreco ? "Sob consulta" : (produto.precoFormatado as string),
  };
}
