import type { Cliente, CustoBase, Plano } from "../types";
import { custoMensalCliente } from "./custo";
import {
  calcularDescontoEscala,
  custoEscalonadoPorQuantidade,
  custoEscalonadoPorVolume,
} from "./custos-wts";

/**
 * Custo de canais excedentes (faixas de volume da tabela WTS).
 * A franquia do plano já deve ter sido descontada por quem chama.
 */
export function calcularCustoExtraCanaisHelena(
  excedentes: number,
  itemKey: "canal_whats_exc" | "canal_insta_exc" | "canal_messenger_exc" = "canal_whats_exc",
): number {
  return custoEscalonadoPorQuantidade(itemKey, excedentes);
}

/** Custo de usuários excedentes (19,90 até o 17º · 14,90 do 18º ao 97º · 12,90 do 98º). */
export function calcularCustoExtraUsuariosHelena(excedentes: number): number {
  return custoEscalonadoPorQuantidade("usuario_exc", excedentes);
}

/**
 * Custo de contatos ativos excedentes. `franquia` é a quantidade de contatos
 * inclusos no plano do cliente — as faixas de preço são absolutas, então a
 * posição inicial importa.
 */
export function calcularCustoExtraContatosHelena(
  excedentes: number,
  franquia: number,
): number {
  return custoEscalonadoPorVolume("contato_exc", franquia, excedentes);
}

/** Soma do custo individual de cada cliente ativo (mesma regra do resumo do cliente). */
export function calcularCustoBrutoHelena(
  clientesAtivos: Cliente[],
  planos: Plano[],
  custos: CustoBase[] = [],
): number {
  return clientesAtivos.reduce(
    (acc, c) => acc + custoMensalCliente(c, planos, custos),
    0,
  );
}

/** Desconto de escala da WTS sobre o custo bruto agregado da operação. */
export function calcularDescontoEscalaHelena(custoBruto: number): number {
  return calcularDescontoEscala(custoBruto);
}

/** Custo operacional líquido: soma dos custos por cliente − desconto de escala. */
export function calcularCustoLiquidoHelena(
  clientesAtivos: Cliente[],
  planos: Plano[],
  custos: CustoBase[] = [],
): number {
  const bruto = calcularCustoBrutoHelena(clientesAtivos, planos, custos);
  return bruto - calcularDescontoEscalaHelena(bruto);
}
