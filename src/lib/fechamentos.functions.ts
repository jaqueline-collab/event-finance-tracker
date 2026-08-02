import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";
import { gerarFechamentoInputSchema } from "./fechamentos.schemas";

/**
 * Grava um fechamento completo (lançamentos financeiros + fechamento + itens)
 * no servidor, com a sessão validada pelo middleware e prazo em cada consulta.
 * Nada é gravado pelo navegador e nenhum registro anterior é tocado.
 */
export const gerarFechamentoCompleto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => gerarFechamentoInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const desfazerLancamentos = async (): Promise<string | null> => {
      if (data.lancamentos.length === 0) return null;
      const res = await supabase
        .from("elora_financeiro")
        .delete()
        .in("id", data.lancamentos.map((l) => l.id))
        .abortSignal(AbortSignal.timeout(12000));
      return res.error?.message ?? null;
    };

    // 1) Lançamentos financeiros — idempotentes por id.
    if (data.lancamentos.length > 0) {
      const payload = data.lancamentos.map(
        (l) => ({ ...l, user_id: userId }) as TablesInsert<"elora_financeiro">,
      );
      const res = await supabase
        .from("elora_financeiro")
        .upsert(payload, { onConflict: "id", ignoreDuplicates: true })
        .select("id")
        .abortSignal(AbortSignal.timeout(12000));
      if (res.error) {
        throw new Error(`fechamento-lancamentos: ${res.error.message}`);
      }
    }

    // 2) Fechamento (pai).
    const fechamentoPayload = {
      ...data.fechamento,
      criado_por: userId,
    } as TablesInsert<"elora_fechamentos">;
    const fechRes = await supabase
      .from("elora_fechamentos")
      .upsert(fechamentoPayload, { onConflict: "id", ignoreDuplicates: true })
      .select("id")
      .abortSignal(AbortSignal.timeout(12000));
    if (fechRes.error) {
      const erroLanc = await desfazerLancamentos();
      throw new Error(
        `fechamento-cabecalho: ${fechRes.error.message}` +
          (erroLanc ? ` (falha ao desfazer lançamentos: ${erroLanc})` : ""),
      );
    }

    // 3) Itens do fechamento.
    if (data.itens.length > 0) {
      const itensPayload = data.itens as TablesInsert<"elora_fechamento_itens">[];
      const itensRes = await supabase
        .from("elora_fechamento_itens")
        .upsert(itensPayload, { onConflict: "id", ignoreDuplicates: true })
        .select("id")
        .abortSignal(AbortSignal.timeout(12000));
      if (itensRes.error) {
        const delFech = await supabase
          .from("elora_fechamentos")
          .delete()
          .eq("id", data.fechamento.id)
          .abortSignal(AbortSignal.timeout(12000));
        const erroLanc = await desfazerLancamentos();
        throw new Error(
          `fechamento-itens: ${itensRes.error.message}` +
            (delFech.error ? ` (falha ao desfazer fechamento: ${delFech.error.message})` : "") +
            (erroLanc ? ` (falha ao desfazer lançamentos: ${erroLanc})` : ""),
        );
      }
    }

    // 4) Confirmação real: relê o que ficou gravado.
    const conferencia = await supabase
      .from("elora_fechamentos")
      .select("id")
      .eq("id", data.fechamento.id)
      .abortSignal(AbortSignal.timeout(12000));
    if (conferencia.error || !conferencia.data || conferencia.data.length === 0) {
      throw new Error(
        "fechamento-confirmacao: o fechamento não foi encontrado após a gravação" +
          (conferencia.error ? `: ${conferencia.error.message}` : "."),
      );
    }

    return {
      fechamentoId: data.fechamento.id,
      itensGravados: data.itens.length,
      lancamentosGravados: data.lancamentos.length,
    };
  });