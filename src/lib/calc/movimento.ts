import type { Cliente, Movimento, Plano } from "../types";

export type MovimentoLike = Omit<Movimento, "id"> & { id?: string };

/**
 * Fonte de verdade única da regra "movimento → cliente resultante".
 * Usada tanto pela store (addMovimento, gravação real) quanto pela prévia
 * financeira na tela de Clientes. Não persiste nada.
 */
export function calcularPatchMovimento(
  cliente: Cliente,
  m: MovimentoLike,
  planos?: Plano[],
): Partial<Cliente> {
  const patch: Partial<Cliente> = {};
  if (m.tipo === "churn") patch.dataChurn = m.data;
  // Valor de acompanhamento informado explicitamente no movimento tem precedência
  // sobre a herança automática do plano (ajuste direto ou escolha na troca de plano).
  const acompExplicito =
    m.valorAcompanhamento !== undefined && m.valorAcompanhamento !== null
      ? Math.max(0, m.valorAcompanhamento)
      : null;
  if (m.planoId !== undefined && m.planoId !== null) {
    patch.planoId = m.planoId;
    // Troca de plano: cliente sem acompanhamento próprio herda o valor padrão
    // do plano novo (mesma regra do cadastro). Quem já tem valor nunca é tocado.
    if (planos && m.planoId !== cliente.planoId && !(cliente.valorAcompanhamento > 0)) {
      const planoNovo = planos.find((p) => p.id === m.planoId);
      patch.valorAcompanhamento = planoNovo?.valorAcompanhamento ?? 0;
    }
  }
  if (acompExplicito !== null) patch.valorAcompanhamento = acompExplicito;

  // Upgrade/Downgrade: campos numéricos são DELTAS (ex.: -1, +2),
  // somados ao valor atual do cliente. Booleanos representam o estado final.
  // Setup: valores numéricos são absolutos (substituem o valor atual).
  const isDelta = m.tipo === "upgrade" || m.tipo === "downgrade";
  const applyNum = (cur: number | undefined, val: number | undefined) => {
    if (val === undefined || val === null) return undefined;
    if (isDelta) return Math.max(0, (cur ?? 0) + val);
    return val;
  };

  const newCanais = applyNum(cliente.canais, m.canais);
  if (newCanais !== undefined) patch.canais = newCanais;
  const newWhats = applyNum(cliente.canaisWhats, m.canaisWhats);
  if (newWhats !== undefined) patch.canaisWhats = newWhats;
  const newInsta = applyNum(cliente.canaisInsta, m.canaisInsta);
  if (newInsta !== undefined) patch.canaisInsta = newInsta;
  const newMsg = applyNum(cliente.canaisMessenger, m.canaisMessenger);
  if (newMsg !== undefined) patch.canaisMessenger = newMsg;
  const newZapi = applyNum(cliente.canaisZapi, m.canaisZapi);
  if (newZapi !== undefined) {
    patch.canaisZapi = newZapi;
    patch.zapi = newZapi > 0;
  }
  const newUsers = applyNum(cliente.usuariosAtivos, m.usuariosAtivos);
  if (newUsers !== undefined) patch.usuariosAtivos = newUsers;
  const newCont = applyNum(cliente.contatosAtivos, m.contatosAtivos);
  if (newCont !== undefined) patch.contatosAtivos = newCont;
  if (m.apps !== undefined && m.apps !== null) {
    patch.apps = isDelta ? Math.max(0, (cliente.apps ?? 0) + m.apps) : m.apps;
  }
  if (m.mau !== undefined && m.mau !== null) {
    patch.mau = isDelta ? Math.max(0, (cliente.mau ?? 0) + m.mau) : m.mau;
  }
  if (m.agentesIA !== undefined) patch.agentesIA = m.agentesIA;
  if (m.asaas !== undefined) patch.asaas = m.asaas;
  if (m.zapi !== undefined) patch.zapi = m.zapi;
  if (m.transcricaoIA !== undefined) patch.transcricaoIA = m.transcricaoIA;
  if (m.extras !== undefined) patch.extras = m.extras;

  return patch;
}

/** Cliente resultante após aplicar o movimento (em memória). */
export function aplicarMovimentoNoCliente(
  cliente: Cliente,
  m: MovimentoLike,
  planos?: Plano[],
): Cliente {
  return { ...cliente, ...calcularPatchMovimento(cliente, m, planos) };
}
