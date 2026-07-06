import type { Cliente, CustoBase, Movimento, Plano } from "../types";
import { clienteAtivoEm, clienteSnapshotAt, obterVencimentoDaCompetencia } from "./datas";
import { getCicloCliente, isoFromDate } from "./ciclo";

function ativoNoCiclo(
  cliente: Cliente,
  ciclo: { inicio: Date; fim: Date },
): boolean {
  const inicio = new Date(cliente.dataInicio);
  if (inicio > ciclo.fim) return false;
  if (cliente.dataChurn) {
    const churn = new Date(cliente.dataChurn);
    if (churn < ciclo.inicio) return false;
  }
  return true;
}

export function receitaMensalCliente(
  cliente: Cliente,
  planos: Plano[],
  _custos: CustoBase[],
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) return 0;

  const valorCanalWhatsExc = plano.valorCanalWhatsExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalInstaExc = plano.valorCanalInstaExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalMessengerExc = plano.valorCanalMessengerExc ?? plano.valorCanaisExc ?? 59.90;
  const valorUsuariosExc = plano.valorUsuariosExc ?? 39.90;
  const valorContatosExc = plano.valorContatosExc ?? 0.10;
  const valorIA = plano.valorIA ?? 99.00;
  const valorAsaas = plano.valorAsaas ?? 89.00;
  const valorZapi = plano.valorZapi ?? 149.00;
  const valorTranscricaoUser = plano.valorTranscricaoUser ?? 7.99;

  let total = plano.valorMensal + (cliente.valorAcompanhamento || 0);

  const canaisWhats = cliente.canaisWhats ?? 0;
  const canaisInsta = cliente.canaisInsta || 0;
  const canaisMessenger = cliente.canaisMessenger || 0;

  const excWhats = Math.max(0, canaisWhats - (plano.canaisWhatsInclusos || 0));
  const excInsta = Math.max(0, canaisInsta - (plano.canaisInstaInclusos || 0));
  const excMessenger = Math.max(0, canaisMessenger - (plano.canaisMessengerInclusos || 0));
  total += excWhats * valorCanalWhatsExc;
  total += excInsta * valorCanalInstaExc;
  total += excMessenger * valorCanalMessengerExc;

  const usersExc = Math.max(0, (cliente.usuariosAtivos || 0) - (plano.usuariosInclusos || 3));
  total += usersExc * valorUsuariosExc;

  const contatosExc = Math.max(0, (cliente.contatosAtivos || 0) - (plano.contatosInclusos || 500));
  total += contatosExc * valorContatosExc;

  if (cliente.agentesIA && !plano.incluiIA) total += valorIA;
  if (cliente.asaas && !plano.incluiAsaas) total += valorAsaas;

  const zapiInclusos = typeof plano.incluiZapi === "number" ? plano.incluiZapi : (plano.incluiZapi ? 1 : 0);
  const canaisZapi = cliente.canaisZapi ?? 0;
  const qtdZapiCliente = canaisZapi > 0 ? Math.max(0, canaisZapi - zapiInclusos) : 0;
  total += qtdZapiCliente * valorZapi;

  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    total += (cliente.usuariosAtivos || 0) * valorTranscricaoUser;
  }

  return total;
}

export interface ItemReceita {
  label: string;
  qtd: number;
  unit: number;
  total: number;
  incluso?: string;
}

export interface ExplicacaoReceita {
  itens: ItemReceita[];
  subtotalSistema: number;
  acompanhamento: number;
  total: number;
}

/**
 * Breakdown item-a-item da mensalidade do cliente. Espelha exatamente
 * `receitaMensalCliente` (multiplicação direta quantidade × preço do plano,
 * sem regras de escala — essas são só de custo). Usado para auditoria.
 */
export function explicarReceitaCliente(
  cliente: Cliente,
  planos: Plano[],
): ExplicacaoReceita {
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (!plano) {
    const acomp = cliente.valorAcompanhamento || 0;
    return { itens: [], subtotalSistema: 0, acompanhamento: acomp, total: acomp };
  }

  const valorCanalWhatsExc = plano.valorCanalWhatsExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalInstaExc = plano.valorCanalInstaExc ?? plano.valorCanaisExc ?? 59.90;
  const valorCanalMessengerExc = plano.valorCanalMessengerExc ?? plano.valorCanaisExc ?? 59.90;
  const valorUsuariosExc = plano.valorUsuariosExc ?? 39.90;
  const valorContatosExc = plano.valorContatosExc ?? 0.10;
  const valorIA = plano.valorIA ?? 99.00;
  const valorAsaas = plano.valorAsaas ?? 89.00;
  const valorZapi = plano.valorZapi ?? 149.00;
  const valorTranscricaoUser = plano.valorTranscricaoUser ?? 7.99;

  const itens: ItemReceita[] = [];
  itens.push({
    label: `Licença base · ${plano.nome}`,
    qtd: 1,
    unit: plano.valorMensal,
    total: plano.valorMensal,
  });

  const push = (
    label: string,
    qtd: number,
    unit: number,
    incluso?: string,
  ) => {
    if (qtd <= 0) return;
    itens.push({ label, qtd, unit, total: qtd * unit, incluso });
  };

  const canaisWhats = cliente.canaisWhats ?? 0;
  const canaisInsta = cliente.canaisInsta || 0;
  const canaisMessenger = cliente.canaisMessenger || 0;
  const whatsInc = plano.canaisWhatsInclusos || 0;
  const instaInc = plano.canaisInstaInclusos || 0;
  const mesgInc = plano.canaisMessengerInclusos || 0;

  push(
    "Canais WhatsApp excedentes",
    Math.max(0, canaisWhats - whatsInc),
    valorCanalWhatsExc,
    `${canaisWhats} contratados · ${whatsInc} inclusos`,
  );
  push(
    "Canais Instagram excedentes",
    Math.max(0, canaisInsta - instaInc),
    valorCanalInstaExc,
    `${canaisInsta} contratados · ${instaInc} inclusos`,
  );
  push(
    "Canais Messenger excedentes",
    Math.max(0, canaisMessenger - mesgInc),
    valorCanalMessengerExc,
    `${canaisMessenger} contratados · ${mesgInc} inclusos`,
  );

  const usersInc = plano.usuariosInclusos || 3;
  push(
    "Usuários excedentes",
    Math.max(0, (cliente.usuariosAtivos || 0) - usersInc),
    valorUsuariosExc,
    `${cliente.usuariosAtivos || 0} ativos · ${usersInc} inclusos`,
  );

  const contInc = plano.contatosInclusos || 500;
  push(
    "Contatos excedentes",
    Math.max(0, (cliente.contatosAtivos || 0) - contInc),
    valorContatosExc,
    `${cliente.contatosAtivos || 0} ativos · ${contInc} inclusos`,
  );

  if (cliente.agentesIA && !plano.incluiIA) {
    itens.push({ label: "Agentes de IA", qtd: 1, unit: valorIA, total: valorIA });
  }
  if (cliente.asaas && !plano.incluiAsaas) {
    itens.push({ label: "Integração Asaas", qtd: 1, unit: valorAsaas, total: valorAsaas });
  }

  const zapiInclusos = typeof plano.incluiZapi === "number" ? plano.incluiZapi : (plano.incluiZapi ? 1 : 0);
  const canaisZapi = cliente.canaisZapi ?? 0;
  const zapiQtd = canaisZapi > 0 ? Math.max(0, canaisZapi - zapiInclusos) : 0;
  push(
    "Canais Z-API excedentes",
    zapiQtd,
    valorZapi,
    `${canaisZapi} contratados · ${zapiInclusos} inclusos`,
  );

  if (cliente.transcricaoIA && !plano.incluiTranscricao) {
    const q = cliente.usuariosAtivos || 0;
    push("Transcrição IA (por usuário)", q, valorTranscricaoUser);
  }

  const subtotalSistema = itens.reduce((acc, it) => acc + it.total, 0);
  const acompanhamento = cliente.valorAcompanhamento || 0;
  return {
    itens,
    subtotalSistema,
    acompanhamento,
    total: subtotalSistema + acompanhamento,
  };
}

/**
 * Receita do cliente em uma competência usando snapshot no vencimento.
 * Mantida para compatibilidade — para fechamento mensal use `receitaCicloCliente`,
 * que snapshota no último dia do ciclo (refletindo upgrades/downgrades feitos
 * depois do vencimento).
 */
export function receitaMensalClienteEm(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
  movimentos: Movimento[],
  year: number,
  month: number,
): number {
  const vencimento = obterVencimentoDaCompetencia(cliente, year, month, planos);
  if (!vencimento) return 0;
  const snap = clienteSnapshotAt(cliente, movimentos, vencimento);
  return receitaMensalCliente(snap, planos, custos);
}

/**
 * Receita do cliente no ciclo (mês y/m): snapshot SEMPRE no último dia do ciclo,
 * de modo que upgrades/downgrades feitos durante o mês sejam incorporados
 * (a cobrança subsequente já reflete o novo estado). Esta é a função usada
 * pelo fechamento mensal e deve ser preferida na maioria dos relatórios.
 */
export function receitaCicloCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
  movimentos: Movimento[],
  year: number,
  month: number,
): number {
  const plano = planos.find((p) => p.id === cliente.planoId);
  const ciclo = getCicloCliente(cliente, plano, year, month);
  if (!ativoNoCiclo(cliente, ciclo)) return 0;

  // Limites efetivos: respeita data de início do cliente e churn
  const inicioCliente = new Date(cliente.dataInicio);
  const churn = cliente.dataChurn ? new Date(cliente.dataChurn) : null;
  const segInicio = inicioCliente > ciclo.inicio ? inicioCliente : ciclo.inicio;
  const segFim = churn && churn < ciclo.fim ? churn : ciclo.fim;
  if (segFim < segInicio) return 0;

  // Sem proporcionalidade: snapshot no fim do ciclo (cobrança cheia mesmo
  // com churn ou início no meio do ciclo — alinhado ao comportamento do Monday).
  if (!ciclo.proporcional) {
    const snap = clienteSnapshotAt(cliente, movimentos, isoFromDate(ciclo.fim));
    return receitaMensalCliente(snap, planos, custos);
  }

  // Com proporcionalidade: soma segmentos entre cada movimento do ciclo
  // (excluindo movimentos do tipo "servico" e "churn", que não alteram a base recorrente).
  const movsCiclo = movimentos
    .filter((m) => {
      if (m.clienteId !== cliente.id) return false;
      if (m.tipo === "servico" || m.tipo === "churn" || m.tipo === "setup") return false;
      const d = new Date(m.data);
      return d > segInicio && d <= segFim;
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  // Breakpoints: [segInicio, ...mov.data, segFim+1dia]
  const breakpoints: Date[] = [segInicio];
  for (const m of movsCiclo) breakpoints.push(new Date(m.data));
  const fimExclusivo = new Date(segFim.getTime() + 24 * 60 * 60 * 1000);
  breakpoints.push(fimExclusivo);

  let total = 0;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const s = breakpoints[i];
    const e = breakpoints[i + 1];
    const dias = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
    if (dias <= 0) continue;
    const snap = clienteSnapshotAt(cliente, movimentos, isoFromDate(s));
    const valor = receitaMensalCliente(snap, planos, custos);
    total += valor * (dias / ciclo.diasTotal);
  }
  return total;
}

export function clienteFaturaEm(
  cliente: Cliente,
  year: number,
  month: number,
  planos?: Plano[],
): boolean {
  return Boolean(obterVencimentoDaCompetencia(cliente, year, month, planos));
}

export function receitaMensalTotal(clientesAtivos: Cliente[], planos: Plano[], custos: CustoBase[]): number {
  return clientesAtivos.reduce((acc, c) => acc + receitaMensalCliente(c, planos, custos), 0);
}

export function receitaSistemaCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
): number {
  return receitaMensalCliente(cliente, planos, custos) - (cliente.valorAcompanhamento || 0);
}

export function receitaSistemaTotal(
  clientesAtivos: Cliente[],
  planos: Plano[],
  custos: CustoBase[],
): number {
  return clientesAtivos.reduce((acc, c) => acc + receitaSistemaCliente(c, planos, custos), 0);
}

export function faturamentoAcumuladoCliente(
  cliente: Cliente,
  planos: Plano[],
  custos: CustoBase[],
  movimentos: Movimento[],
): number {
  if (!cliente.dataInicio) return 0;
  const inicio = new Date(cliente.dataInicio);
  const hoje = new Date();
  const fim = cliente.dataChurn ? new Date(cliente.dataChurn) : hoje;
  let total = cliente.valorSetupPago || 0;
  for (const mv of movimentos) {
    if (mv.clienteId === cliente.id && mv.tipo === "servico" && mv.valorServico) {
      total += mv.valorServico;
    }
  }
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth() + 1, 1);
  while (cursor < limite) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    if (clienteFaturaEm(cliente, y, m, planos)) {
      total += receitaCicloCliente(cliente, planos, custos, movimentos, y, m);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return total;
}