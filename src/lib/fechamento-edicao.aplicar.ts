import { z } from "zod";
import {
  diferencas,
  montarSnapshot,
  recalcularItem,
  totaisFechamento,
  valoresLancamentos,
  type Edicao,
  type ItemEditavel,
} from "./fechamento-edicao";

const linha = z.object({
  label: z.string().trim().min(1).max(200),
  qtd: z.number().finite(),
  unit: z.number().finite(),
  total: z.number().finite().optional().default(0),
  incluso: z.string().max(200).optional(),
});

const dataOuNull = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const itemSchema = z.object({
  id: z.string().uuid(),
  clienteId: z.string().min(1).max(64),
  planoId: z.string().max(64).nullable(),
  planoNome: z.string().max(200).nullable(),
  clienteNome: z.string().max(200).nullable(),
  cicloInicio: dataOuNull,
  cicloFim: dataOuNull,
  vencimento: dataOuNull,
  valorDesconto: z.number().finite().min(0),
  composicao: z.object({
    linhas: z.array(linha).max(200),
    acompanhamentoOriginal: z.number().finite().min(0),
    acompanhamentoIsento: z.boolean(),
    mauExcedenteValor: z.number().finite().min(0),
  }),
  lancamentoFinanceiroId: z.string().max(64).nullable(),
  removido: z.boolean().optional(),
  novo: z.boolean().optional(),
  lancamento: z
    .object({
      status: z.enum(["pago", "pendente", "cancelado"]),
      nfEmitida: z.boolean(),
      nfNumero: z.string().max(60).nullable(),
    })
    .nullable(),
});

export const salvarEdicaoSchema = z.object({
  fechamentoId: z.string().uuid(),
  motivo: z.string().max(1000).nullable().optional(),
  confirmouParceiro: z.boolean().default(false),
  confirmouNF: z.boolean().default(false),
  cabecalho: z.object({
    titulo: z.string().trim().min(1).max(200),
    descricao: z.string().max(2000).nullable(),
    observacao: z.string().max(4000).nullable(),
    competencia: z.string().regex(/^\d{4}-\d{2}$/),
  }),
  itens: z.array(itemSchema).max(1000),
});
export type SalvarEdicaoInput = z.input<typeof salvarEdicaoSchema>;

export class ConfirmacaoNecessaria extends Error {}

/**
 * Núcleo da gravação, separado para teste: recebe um cliente com as
 * operações do banco já autorizado como admin.
 */
export async function aplicarEdicao(adm: any, userId: string, data: z.output<typeof salvarEdicaoSchema>) {
  const fid = data.fechamentoId;
  const { data: fech, error: ef } = await adm.from("elora_fechamentos").select("*").eq("id", fid).maybeSingle();
  if (ef) throw new Error(`fechamento: ${ef.message}`);
  if (!fech || fech.deletado_em) throw new Error("Fechamento não encontrado.");

  const { data: itensDb, error: ei } = await adm.from("elora_fechamento_itens").select("*").eq("fechamento_id", fid).is("removido_em", null);
  if (ei) throw new Error(`itens: ${ei.message}`);
  const atuais = new Map<string, any>(((itensDb ?? []) as any[]).map((i) => [i.id, i]));

  // Isolamento: itens existentes precisam ser deste fechamento, com o mesmo cliente.
  for (const it of data.itens) {
    if (it.novo) {
      if (atuais.has(it.id)) throw new Error("Item novo com identificação repetida.");
      if ([...atuais.values()].some((a) => a.cliente_id === it.clienteId) && !data.itens.some((x) => !x.novo && x.removido && x.clienteId === it.clienteId))
        throw new Error("Este cliente já está no fechamento.");
      continue;
    }
    const a = atuais.get(it.id);
    if (!a) throw new Error("Item não pertence a este fechamento.");
    if (a.cliente_id !== it.clienteId) throw new Error("Cliente do item não pode ser trocado.");
    if ((a.lancamento_financeiro_id ?? null) !== (it.lancamentoFinanceiroId ?? null)) throw new Error("Lançamento do item não pode ser trocado.");
  }
  for (const id of atuais.keys()) if (!data.itens.some((x) => x.id === id)) throw new Error("Item ausente na edição; recarregue a página.");

  const lancIds = [...new Set([...atuais.values()].map((a) => a.lancamento_financeiro_id).filter(Boolean))] as string[];
  const lancs = new Map<string, any>();
  if (lancIds.length) {
    const { data: ls, error } = await adm.from("elora_financeiro").select("*").in("id", lancIds);
    if (error) throw new Error(`lancamentos: ${error.message}`);
    for (const l of (ls ?? []) as any[]) lancs.set(l.id, l);
  }

  // Recalcula itens.
  const calculados = data.itens.map((it) => {
    const c = recalcularItem(it.composicao, it.valorDesconto);
    return { it, c };
  });

  // Lançamentos novos para clientes incluídos.
  const novosLanc: any[] = [];
  for (const { it, c } of calculados) {
    if (it.novo && !it.removido && !it.lancamentoFinanceiroId) {
      const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      it.lancamentoFinanceiroId = id;
      novosLanc.push({
        id, user_id: userId, descricao: it.clienteNome || it.clienteId, tipo: "fechamento", categoria: "Receita",
        valor: c.valorLiquido, vencimento: it.vencimento, competencia: `${data.cabecalho.competencia}-${it.clienteId}-${Date.now()}`,
        status: it.lancamento?.status ?? "pendente", nf_emitida: it.lancamento?.nfEmitida ?? false, nf_numero: it.lancamento?.nfNumero ?? null,
      });
    }
  }

  const vals = valoresLancamentos(calculados.filter(({ it }) => !(it.novo && it.removido)).map(({ it, c }) => ({ lancamentoFinanceiroId: it.lancamentoFinanceiroId, valorLiquido: c.valorLiquido, removido: it.removido })));
  const edicoes: Edicao[] = [];
  const lancPatches: { id: string; patch: Record<string, unknown> }[] = [];
  const nfAfetadas: string[] = [];
  for (const [id, v] of vals) {
    const l = lancs.get(id);
    if (!l) continue;
    const dono = calculados.find(({ it }) => it.lancamentoFinanceiroId === id && !it.removido)?.it;
    const venc = dono?.vencimento ?? l.vencimento;
    const patch: Record<string, unknown> = { valor: v.valor, vencimento: venc };
    if (v.semItens) patch.status = "cancelado";
    else if (dono?.lancamento) {
      patch.status = dono.lancamento.status;
      patch.nf_emitida = dono.lancamento.nfEmitida;
      patch.nf_numero = dono.lancamento.nfNumero;
    }
    const antes = { valor: Number(l.valor), vencimento: l.vencimento, status: l.status, nf_emitida: l.nf_emitida, nf_numero: l.nf_numero };
    const d = diferencas(dono?.id ?? null, `lancamento.${id}.`, antes, patch);
    if (d.length) {
      if (l.nf_emitida && (Number(l.valor) !== v.valor || v.semItens)) nfAfetadas.push(l.nf_numero || id);
      edicoes.push(...d);
      lancPatches.push({ id, patch });
    }
  }

  // Cabeçalho.
  const cabAntes = { titulo: fech.titulo, descricao: fech.descricao, observacao: fech.observacao, competencia: fech.competencia };
  edicoes.push(...diferencas(null, "", cabAntes, data.cabecalho));

  // Itens.
  const itensUpd: { id: string; patch: Record<string, unknown> }[] = [];
  const itensIns: any[] = [];
  const agora = new Date().toISOString();
  for (const { it, c } of calculados) {
    if (it.novo) {
      if (it.removido) continue;
      const row = {
        id: it.id, fechamento_id: fid, cliente_id: it.clienteId, plano_id: it.planoId, ciclo_inicio: it.cicloInicio,
        ciclo_fim: it.cicloFim, vencimento: it.vencimento, valor_bruto: c.valorBruto, valor_desconto: c.valorDesconto,
        valor_liquido: c.valorLiquido, lancamento_financeiro_id: it.lancamentoFinanceiroId,
        payload_snapshot: montarSnapshot({}, it as ItemEditavel, c),
      };
      itensIns.push(row);
      edicoes.push({ item_id: it.id, campo: "item.incluido", valor_antigo: null, valor_novo: { cliente_id: it.clienteId, valor_liquido: c.valorLiquido } });
      continue;
    }
    const a = atuais.get(it.id);
    if (it.removido) {
      itensUpd.push({ id: it.id, patch: { removido_em: agora, removido_por: userId } });
      edicoes.push({ item_id: it.id, campo: "item.removido", valor_antigo: { cliente_id: a.cliente_id, valor_bruto: Number(a.valor_bruto), valor_desconto: Number(a.valor_desconto), valor_liquido: Number(a.valor_liquido), payload_snapshot: a.payload_snapshot }, valor_novo: null });
      continue;
    }
    const snap = montarSnapshot(a.payload_snapshot, it as ItemEditavel, c);
    const novo = {
      plano_id: it.planoId, ciclo_inicio: it.cicloInicio, ciclo_fim: it.cicloFim, vencimento: it.vencimento,
      valor_bruto: c.valorBruto, valor_desconto: c.valorDesconto, valor_liquido: c.valorLiquido,
    };
    const antes = {
      plano_id: a.plano_id, ciclo_inicio: a.ciclo_inicio, ciclo_fim: a.ciclo_fim, vencimento: a.vencimento,
      valor_bruto: Number(a.valor_bruto), valor_desconto: Number(a.valor_desconto), valor_liquido: Number(a.valor_liquido),
    };
    const dItem = diferencas(it.id, "", antes, novo);
    const sa = (a.payload_snapshot ?? {}) as Record<string, unknown>;
    const comp = (s: Record<string, unknown>) => ({
      planoNome: s["planoNome"] ?? null,
      composicao: (s["composicao"] as any)?.itens ?? null,
      acompanhamento: Number(s["acompanhamento"] ?? 0),
      acompanhamentoIsento: Boolean(s["acompanhamentoIsento"]),
      mauExcedenteValor: Number(s["mauExcedenteValor"] ?? 0),
    });
    const ca = comp(sa), cn = comp(snap);
    // Composição só conta como mudança quando algo de fato mudou (inclusive a 1ª conversão para linhas).
    const dComp = diferencas(it.id, "composicao.", { ...ca, composicao: ca.composicao ?? cn.composicao }, cn);
    if (dItem.length || dComp.length) {
      itensUpd.push({ id: it.id, patch: { ...novo, payload_snapshot: snap } });
      edicoes.push(...dItem, ...dComp);
    }
  }

  const tot = totaisFechamento(calculados.filter(({ it }) => !(it.novo && it.removido)).map(({ it, c }) => ({ ...c, removido: it.removido })));
  edicoes.push(...diferencas(null, "", { total_bruto: Number(fech.total_bruto), total_desconto: Number(fech.total_desconto), total_liquido: Number(fech.total_liquido) }, { total_bruto: tot.totalBruto, total_desconto: tot.totalDesconto, total_liquido: tot.totalLiquido }));

  if (edicoes.length === 0) return { alteracoes: 0, ...tot };

  if (fech.enviado_parceiro_em && !data.confirmouParceiro)
    throw new ConfirmacaoNecessaria("confirmacao-parceiro: este fechamento já foi liberado ao parceiro; confirme para salvar.");
  if (nfAfetadas.length && !data.confirmouNF)
    throw new ConfirmacaoNecessaria(`confirmacao-nf: há NF emitida (${nfAfetadas.join(", ")}) cujo valor deixará de bater; confirme para salvar.`);

  const ok = (stage: string, r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(`${stage}: ${r.error.message}`);
  };
  if (novosLanc.length) ok("lancamentos-novos", await adm.from("elora_financeiro").insert(novosLanc));
  for (const p of lancPatches) ok("lancamento", await adm.from("elora_financeiro").update(p.patch).eq("id", p.id));
  if (itensIns.length) ok("itens-novos", await adm.from("elora_fechamento_itens").insert(itensIns));
  for (const p of itensUpd) ok("item", await adm.from("elora_fechamento_itens").update(p.patch).eq("id", p.id).eq("fechamento_id", fid));
  ok("fechamento", await adm.from("elora_fechamentos").update({
    ...data.cabecalho, total_bruto: tot.totalBruto, total_desconto: tot.totalDesconto, total_liquido: tot.totalLiquido,
    editado_em: agora, editado_por: userId,
  }).eq("id", fid));
  ok("historico", await adm.from("elora_fechamento_edicoes").insert(edicoes.map((e) => ({
    fechamento_id: fid, item_id: e.item_id, campo: e.campo, valor_antigo: e.valor_antigo ?? null, valor_novo: e.valor_novo ?? null,
    motivo: data.motivo?.trim() || null, editado_por: userId, editado_em: agora,
  }))));
  return { alteracoes: edicoes.length, ...tot };
}

