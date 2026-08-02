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
