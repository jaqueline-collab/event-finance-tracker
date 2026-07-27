import type { Cliente, CustoBase, Plano } from "../types";
import {
  custoEscalonadoPorQuantidade,
  custoEscalonadoPorVolume,
  precoUnitario,
} from "./custos-wts";

export interface ItemCusto {
  label: string;
  qtd: number;
  total: number;
  detalhe?: string;
}

export interface ExplicacaoCusto {
  itens: ItemCusto[];
  total: number;
}

/**
 * Regra ÚNICA de custo do cliente (Dashboard, fechamento, resumo e rankings).
 *
 *   custo = licença base
 *         + Σ max(0, uso_real − franquia_do_plano) × custo_unitário WTS
 *
 * Uso real vem de `elora_clientes`, a franquia vem de `elora_planos` e o custo
 * unitário (com as faixas de volume) vem de `elora_custos_wts`.
 * O desconto de escala da WTS é agregado da operação e é aplicado em
 * `calcularCustoLiquidoHelena`, não por cliente.
 */
export function explicarCustoCliente(
  cliente: Cliente,
  planos: Plano[],
): ExplicacaoCusto {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return { itens: [], total: 0 };

  const itens: ItemCusto[] = [];
  const push = (label: string, qtd: number, total: number, detalhe?: string) => {
    if (total === 0 && qtd === 0) return;
    itens.push({ label, qtd, total, detalhe });
  };

  const licenca = precoUnitario("licenca_base");
  itens.push({ label: "Licença base", qtd: 1, total: licenca });

  const canais: { key: "canal_whats_exc" | "canal_insta_exc" | "canal_messenger_exc"; label: string; uso: number; inc: number }[] = [
    { key: "canal_whats_exc", label: "Canais WhatsApp excedentes", uso: cliente.canaisWhats ?? 0, inc: plano.canaisWhatsInclusos || 0 },
    { key: "canal_insta_exc", label: "Canais Instagram excedentes", uso: cliente.canaisInsta || 0, inc: plano.canaisInstaInclusos || 0 },
    { key: "canal_messenger_exc", label: "Canais Messenger excedentes", uso: cliente.canaisMessenger || 0, inc: plano.canaisMessengerInclusos || 0 },
  ];
  for (const c of canais) {
    const exc = Math.max(0, c.uso - c.inc);
    push(c.label, exc, custoEscalonadoPorQuantidade(c.key, exc), `${c.uso} em uso · ${c.inc} inclusos`);
  }

  const usersInc = plano.usuariosInclusos || 0;
  const usersExc = Math.max(0, (cliente.usuariosAtivos || 0) - usersInc);
  push(
    "Usuários excedentes",
    usersExc,
    custoEscalonadoPorQuantidade("usuario_exc", usersExc),
    `${cliente.usuariosAtivos || 0} ativos · ${usersInc} inclusos`,
  );

  const contInc = plano.contatosInclusos || 0;
  const contExc = Math.max(0, (cliente.contatosAtivos || 0) - contInc);
  push(
    "Contatos excedentes",
    contExc,
    custoEscalonadoPorVolume("contato_exc", contInc, contExc),
    `${cliente.contatosAtivos || 0} ativos · ${contInc} inclusos`,
  );

  if (cliente.agentesIA && !plano.incluiIA) {
    push("Agentes de IA", 1, precoUnitario("ia"));
  }
  if (cliente.asaas && !plano.incluiAsaas) {
    push("Integração Asaas", 1, precoUnitario("asaas"));
  }

  const zapiInc = typeof plano.incluiZapi === "number" ? plano.incluiZapi : plano.incluiZapi ? 1 : 0;
  const zapiExc = Math.max(0, (cliente.canaisZapi ?? 0) - zapiInc);
  push(
    "Canais Z-API excedentes",
    zapiExc,
    zapiExc * precoUnitario("zapi"),
    `${cliente.canaisZapi ?? 0} em uso · ${zapiInc} inclusos`,
  );

  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    const q = cliente.usuariosAtivos || 0;
    push("Transcrição IA (por usuário)", q, q * precoUnitario("transcricao_user"));
  }

  return { itens, total: itens.reduce((acc, i) => acc + i.total, 0) };
}

export function custoMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  _custos: CustoBase[] = [],
): number {
  return explicarCustoCliente(cliente, planos).total;
}
