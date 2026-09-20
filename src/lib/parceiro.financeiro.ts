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
  /** Nota fiscal anexada cobrindo este lançamento, quando houver. */
  notaId: string | null;
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
      const linhas: LinhaFechamentoParceiro[] = itens
        .filter(
          (i) => i["fechamento_id"] === f.id && nomePorCliente.has(String(i["cliente_id"])),
        )
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
            notaId: lancamentoId ? notaPorLancamento.get(lancamentoId) ?? null : null,
            valorBruto: Number(i["valor_bruto"] ?? 0),
            valorDesconto: Number(i["valor_desconto"] ?? 0),
            valorLiquido: Number(i["valor_liquido"] ?? 0),
            composicao: composicaoDe(snap),
          };
        })
        .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, "pt-BR"));

      return {
        id: f.id,
        competencia: f.competencia,
        titulo: f.titulo,
        enviadoEm: f.enviado_parceiro_em as string,
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
