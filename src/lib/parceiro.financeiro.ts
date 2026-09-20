/**
 * Projeção do Financeiro da área do parceiro.
 *
 * Isolado aqui para ser testável: recebe as linhas cruas e devolve SÓ o que o
 * parceiro pode ver. Lista branca estrita — custo, margem, lucro, WTS e
 * desconto de escala nunca atravessam esta função.
 */

export type LinhaFechamentoParceiro = {
  id: string;
  clienteId: string;
  clienteNome: string;
  planoNome: string | null;
  cicloInicio: string | null;
  cicloFim: string | null;
  vencimento: string | null;
  /** Status do lançamento no Financeiro (mesmo da tela interna). */
  status: string | null;
  valorBruto: number;
  valorDesconto: number;
  valorLiquido: number;
  composicao: { label: string; total: number }[];
};

export type FechamentoParceiro = {
  id: string;
  competencia: string;
  titulo: string;
  enviadoEm: string;
  /** Ciclo consolidado: menor início e maior fim entre as linhas do parceiro. */
  cicloInicio: string | null;
  cicloFim: string | null;
  /** Vencimento mais próximo entre as linhas; veja vencimentosDivergentes. */
  vencimento: string | null;
  /** Verdadeiro quando as linhas têm datas de vencimento diferentes. */
  vencimentosDivergentes: boolean;
  /** Todas as datas distintas, em ordem — usado na dica quando divergem. */
  vencimentos: string[];
  /** Nota fiscal anexada ao lançamento consolidado do fechamento. */
  notaId: string | null;
  linhas: LinhaFechamentoParceiro[];
  totalBruto: number;
  totalDesconto: number;
  totalLiquido: number;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function composicaoDe(snapshot: unknown) {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  const linhas: { label: string; total: number }[] = [];
  const sistema = num(s["sistema"]);
  const acompanhamento = num(s["acompanhamento"]);
  const mauQtd = num(s["mauExcedenteQtd"]);
  const mauValor = num(s["mauExcedenteValor"]);
  if (sistema) linhas.push({ label: "Sistema", total: sistema });
  if (acompanhamento) linhas.push({ label: "Acompanhamento", total: acompanhamento });
  if (mauValor) linhas.push({ label: `MAU excedente (${mauQtd})`, total: mauValor });
  return linhas;
}

export function montarFechamentosParceiro(params: {
  nomePorCliente: Map<string, string>;
  /** Só devem chegar aqui cabeçalhos já filtrados por enviado_parceiro_em / deletado_em. */
  cabecalhos: { id: string; competencia: string; titulo: string; enviado_parceiro_em: string | null; deletado_em?: string | null }[];
  itens: Record<string, unknown>[];
  /** lancamento_financeiro_id → status do lançamento (pago/pendente...). */
  statusPorLancamento?: Map<string, string>;
  /** lancamento_financeiro_id → id da nota fiscal anexada. */
  notaPorLancamento?: Map<string, string>;
}): FechamentoParceiro[] {
  const { nomePorCliente, cabecalhos, itens } = params;
  const statusPorLancamento = params.statusPorLancamento ?? new Map<string, string>();
  const notaPorLancamento = params.notaPorLancamento ?? new Map<string, string>();

  return cabecalhos
    .filter((f) => Boolean(f.enviado_parceiro_em) && !f.deletado_em)
    .map((f) => {
      const meusItens = itens.filter(
        (i) => i["fechamento_id"] === f.id && nomePorCliente.has(String(i["cliente_id"])),
      );

      const linhas: LinhaFechamentoParceiro[] = meusItens
        .map((i) => {
          const snap = (i["payload_snapshot"] ?? {}) as Record<string, unknown>;
          const clienteId = String(i["cliente_id"]);
          const lancamentoId = i["lancamento_financeiro_id"]
            ? String(i["lancamento_financeiro_id"])
            : null;
          return {
            id: String(i["id"]),
            clienteId,
            clienteNome: nomePorCliente.get(clienteId) ?? "—",
            planoNome: (snap["planoNome"] as string | null) ?? null,
            cicloInicio: (i["ciclo_inicio"] as string | null) ?? null,
            cicloFim: (i["ciclo_fim"] as string | null) ?? null,
            vencimento: (i["vencimento"] as string | null) ?? null,
            status: lancamentoId ? statusPorLancamento.get(lancamentoId) ?? null : null,
            valorBruto: Number(i["valor_bruto"] ?? 0),
            valorDesconto: Number(i["valor_desconto"] ?? 0),
            valorLiquido: Number(i["valor_liquido"] ?? 0),
            composicao: composicaoDe(snap),
          };
        })
        .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));

      // Ciclo consolidado do fechamento, considerando só as linhas deste parceiro.
      const inicios = linhas.map((l) => l.cicloInicio).filter((v): v is string => Boolean(v)).sort();
      const fins = linhas.map((l) => l.cicloFim).filter((v): v is string => Boolean(v)).sort();
      // Vencimento: se todas as linhas têm a mesma data, é ela. Se divergem,
      // mostramos a mais próxima e sinalizamos quantas outras existem.
      const vencimentos = [
        ...new Set(linhas.map((l) => l.vencimento).filter((v): v is string => Boolean(v))),
      ].sort();

      // A nota fiscal fica no lançamento consolidado do fechamento.
      const notaId =
        meusItens
          .map((i) =>
            i["lancamento_financeiro_id"]
              ? notaPorLancamento.get(String(i["lancamento_financeiro_id"])) ?? null
              : null,
          )
          .find((v): v is string => Boolean(v)) ?? null;

      return {
        id: f.id,
        competencia: f.competencia,
        titulo: f.titulo,
        enviadoEm: f.enviado_parceiro_em as string,
        cicloInicio: inicios[0] ?? null,
        cicloFim: fins[fins.length - 1] ?? null,
        vencimento: vencimentos[0] ?? null,
        vencimentosDivergentes: vencimentos.length > 1,
        vencimentos,
        notaId,
        linhas,
        // Totais somados SÓ sobre as linhas deste parceiro.
        totalBruto: linhas.reduce((s, l) => s + l.valorBruto, 0),
        totalDesconto: linhas.reduce((s, l) => s + l.valorDesconto, 0),
        totalLiquido: linhas.reduce((s, l) => s + l.valorLiquido, 0),
      };
    })
    .filter((f) => f.linhas.length > 0)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}

/**
 * Relatórios da aba Financeiro do parceiro.
 *
 * Tudo é derivado do que o parceiro JÁ pode ver: itens de fechamento da própria
 * carteira e o status do lançamento. Sistema × acompanhamento só sai com
 * permissão de composição. Custo, margem, lucro, WTS e desconto de escala
 * nunca entram aqui.
 */
export type ItemRelatorioParceiro = {
  clienteId: string;
  /** Competência no formato AAAA-MM. */
  competencia: string;
  valorLiquido: number;
  sistema: number;
  acompanhamento: number;
  pago: boolean;
};

export type RelatorioParceiro = {
  ano: number;
  pagoPorMes: { chave: string; total: number }[];
  totalPago: number;
  clientesConsiderados: number;
  ticketMedio: number;
  aumentos: number;
  reducoes: number;
  /** Só com permissão de composição; caso contrário, null. */
  composicao: { sistema: number; acompanhamento: number } | null;
};

export function montarRelatorioParceiro(params: {
  ano: number;
  veValores: boolean;
  itens: ItemRelatorioParceiro[];
}): RelatorioParceiro {
  const { ano, veValores } = params;
  const prefixo = String(ano);
  const doAno = params.itens.filter((i) => i.competencia.startsWith(prefixo));

  const pagoPorMes = Array.from({ length: 12 }, (_, i) => ({
    chave: `${prefixo}-${String(i + 1).padStart(2, "0")}`,
    total: 0,
  }));
  const mapaMes = new Map(pagoPorMes.map((m) => [m.chave, m]));

  const clientesPagos = new Set<string>();
  let totalPago = 0;
  let sistema = 0;
  let acompanhamento = 0;

  for (const item of doAno) {
    sistema += item.sistema;
    acompanhamento += item.acompanhamento;
    if (!item.pago) continue;
    totalPago += item.valorLiquido;
    clientesPagos.add(item.clienteId);
    const mes = mapaMes.get(item.competencia);
    if (mes) mes.total += item.valorLiquido;
  }

  // Variação de valor por cliente, competência a competência: o sinal real do
  // delta decide se é aumento ou redução — nunca o nome do tipo de movimento.
  const porCliente = new Map<string, { competencia: string; valor: number }[]>();
  for (const item of doAno) {
    const lista = porCliente.get(item.clienteId) ?? [];
    lista.push({ competencia: item.competencia, valor: item.valorLiquido });
    porCliente.set(item.clienteId, lista);
  }
  let aumentos = 0;
  let reducoes = 0;
  for (const lista of porCliente.values()) {
    lista.sort((a, b) => a.competencia.localeCompare(b.competencia));
    for (let i = 1; i < lista.length; i++) {
      const delta = lista[i].valor - lista[i - 1].valor;
      if (delta > 0) aumentos += delta;
      else if (delta < 0) reducoes += Math.abs(delta);
    }
  }

  const clientesConsiderados = clientesPagos.size;
  return {
    ano,
    pagoPorMes,
    totalPago,
    clientesConsiderados,
    ticketMedio: clientesConsiderados > 0 ? totalPago / clientesConsiderados : 0,
    aumentos,
    reducoes,
    composicao: veValores ? { sistema, acompanhamento } : null,
  };
}
