import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { registrarMovimentoInputSchema } from "./movimentos.schemas";

/**
 * Grava um movimento (setup, upgrade, downgrade, churn, addon) e aplica o
 * patch correspondente no cliente — tudo no servidor, com a sessão validada
 * pelo middleware. O navegador não precisa mais chamar getSession().
 */
export const registrarMovimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registrarMovimentoInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    let movimentoSalvo = true;
    let movimentoErro: string | null = null;

    if (data.movimento) {
      const payload = {
        ...data.movimento,
        user_id: context.userId,
      } as TablesInsert<"elora_movimentos">;

      const result = await context.supabase
        .from("elora_movimentos")
        .upsert(payload, { onConflict: "id", ignoreDuplicates: true })
        .select("id")
        .abortSignal(AbortSignal.timeout(12000));

      if (result.error) {
        movimentoSalvo = false;
        movimentoErro = result.error.message;
        return { movimentoSalvo, movimentoErro, clienteAtualizado: false, clienteErro: null };
      }
    }

    let clienteAtualizado = true;
    let clienteErro: string | null = null;

    if (data.clientePatch && Object.keys(data.clientePatch).length > 0) {
      const patch = data.clientePatch as TablesUpdate<"elora_clientes">;
      const result = await context.supabase
        .from("elora_clientes")
        .update(patch)
        .eq("id", data.clienteId)
        .select("id")
        .abortSignal(AbortSignal.timeout(12000));

      if (result.error) {
        clienteAtualizado = false;
        clienteErro = result.error.message;
      }
    }

    return { movimentoSalvo, movimentoErro, clienteAtualizado, clienteErro };
  });

/**
 * Corrige a Data de início de um cliente já salvo. Bloqueia se algum fechamento
 * emitido mudaria (cliente sairia ou entraria numa competência já emitida).
 * Senão: grava a nova data, move só o setup, mantém o dia de vencimento do
 * cliente e registra uma linha de histórico sem impacto financeiro.
 */
export const alterarDataInicioCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clienteId: string; novaData: string }) => {
    if (!input || typeof input.clienteId !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.novaData ?? "")) {
      throw new Error("Data inválida.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: admin } = await sb.rpc("is_admin");
    if (!admin) throw new Error("Só administradores podem alterar a data de início.");

    const { mapDbToCliente, mapDbToPlano } = await import("./mappers");
    const { competenciasQueMudam, proximoVencimentoMantendoDia, dataBr } = await import("./calc/data-inicio");

    const { data: cRow, error: cErr } = await sb.from("elora_clientes").select("*").eq("id", data.clienteId).single();
    if (cErr || !cRow) throw new Error("Cliente não encontrado.");
    const cliente = mapDbToCliente(cRow);
    if (cliente.dataInicio === data.novaData) throw new Error("A data escolhida é a mesma já gravada.");
    const { data: pRow } = cliente.planoId
      ? await sb.from("elora_planos").select("*").eq("id", cliente.planoId).maybeSingle()
      : { data: null };
    const plano = pRow ? mapDbToPlano(pRow) : undefined;

    // Fechamentos emitidos e seus itens ativos.
    const { data: fechs, error: fErr } = await sb
      .from("elora_fechamentos")
      .select("id, titulo, competencia, criado_em")
      .eq("status", "emitido")
      .is("deletado_em", null);
    if (fErr) throw new Error(fErr.message);
    const ids = (fechs ?? []).map((f) => f.id);
    const itens: { fechamento_id: string; cliente_id: string }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data: its, error } = await sb
        .from("elora_fechamento_itens")
        .select("fechamento_id, cliente_id")
        .in("fechamento_id", ids.slice(i, i + 200))
        .is("removido_em", null);
      if (error) throw new Error(error.message);
      itens.push(...(its ?? []));
    }
    // Parceiro de cada cliente presente nos fechamentos (para saber o "escopo" de cada fechamento).
    const outros = [...new Set(itens.map((i) => i.cliente_id))];
    const parceiroDe = new Map<string, string | null>();
    for (let i = 0; i < outros.length; i += 200) {
      const { data: cs } = await sb.from("elora_clientes").select("id, parceiro_id").in("id", outros.slice(i, i + 200));
      (cs ?? []).forEach((c) => parceiroDe.set(c.id, c.parceiro_id ?? null));
    }
    const comps = (fechs ?? []).map((f) => f.competencia).filter(Boolean) as string[];
    const mudam = competenciasQueMudam(cliente, plano, data.novaData, comps);
    const bloqueios = (fechs ?? []).filter((f) => {
      const m = mudam.find((x) => x.competencia === f.competencia);
      if (!m) return false;
      const doFech = itens.filter((i) => i.fechamento_id === f.id);
      if (doFech.some((i) => i.cliente_id === cliente.id)) return true; // sairia (ou mudaria) de um emitido
      // entraria: fechamento emitido do mesmo parceiro nessa competência
      return m.depois && doFech.some((i) => (parceiroDe.get(i.cliente_id) ?? null) === (cliente.parceiroId ?? null));
    });
    if (bloqueios.length) {
      return {
        bloqueado: true as const,
        fechamentos: bloqueios.map((f) => ({ id: f.id, titulo: f.titulo, competencia: f.competencia, emitidoEm: f.criado_em })),
      };
    }

    const dataVencimento = proximoVencimentoMantendoDia(data.novaData, cliente.dataVencimento);
    const up = await sb
      .from("elora_clientes")
      .update({ data_inicio: data.novaData, data_vencimento: dataVencimento })
      .eq("id", cliente.id);
    if (up.error) throw new Error(up.error.message);
    const setup = await sb
      .from("elora_movimentos")
      .update({ data: data.novaData })
      .eq("cliente_id", cliente.id)
      .eq("tipo", "setup")
      .select("id");
    if (setup.error) throw new Error(setup.error.message);

    const email = (context.claims as { email?: string } | undefined)?.email ?? "";
    const hoje = new Date().toISOString().slice(0, 10);
    const histId = Math.random().toString(36).slice(2, 10);
    const observacao = `Data de início alterada de ${dataBr(cliente.dataInicio)} para ${dataBr(data.novaData)}${email ? ` por ${email}` : ""}`;
    const hist = await sb.from("elora_movimentos").insert({
      id: histId,
      cliente_id: cliente.id,
      data: hoje,
      tipo: "data_inicio",
      observacao,
      user_id: context.userId,
    } as TablesInsert<"elora_movimentos">);
    if (hist.error) throw new Error(hist.error.message);

    return {
      bloqueado: false as const,
      dataVencimento,
      setupIds: (setup.data ?? []).map((s) => s.id),
      historico: { id: histId, data: hoje, observacao },
    };
  });
