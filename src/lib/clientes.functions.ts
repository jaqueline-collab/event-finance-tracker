import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cadastrarClienteInputSchema } from "./clientes.schemas";

export const cadastrarClienteComSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => cadastrarClienteInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const clientePayload = {
      ...data.cliente,
      user_id: context.userId,
    } as TablesInsert<"elora_clientes">;
    const movimentoPayload = {
      ...data.movimento,
      user_id: context.userId,
    } as TablesInsert<"elora_movimentos">;

    const clienteResult = await context.supabase
      .from("elora_clientes")
      .upsert(clientePayload, { onConflict: "id", ignoreDuplicates: true })
      .select("id")
      .abortSignal(AbortSignal.timeout(12000));

    if (clienteResult.error) {
      throw new Error(`cadastro-cliente: ${clienteResult.error.message}`);
    }

    const movimentoResult = await context.supabase
      .from("elora_movimentos")
      .upsert(movimentoPayload, { onConflict: "id", ignoreDuplicates: true })
      .select("id")
      .abortSignal(AbortSignal.timeout(12000));

    return {
      clienteSalvo: true,
      setupSalvo: !movimentoResult.error,
      setupErro: movimentoResult.error?.message ?? null,
    };
  });
