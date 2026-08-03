import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { persistMutationInputSchema } from "./mutations.schemas";

export const persistMutation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => persistMutationInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const deadline = () => AbortSignal.timeout(12000);
    const fail = (stage: string, error: { message?: string } | null) => {
      if (error) throw new Error(`${stage}: ${error.message ?? "falha no banco"}`);
    };
    const insertOwned = async (table: string, payload: Record<string, unknown>, stage: string) => {
      const result = await db.from(table).insert({ ...payload, user_id: context.userId }).select("id").abortSignal(deadline());
      fail(stage, result.error);
      if (!result.data?.[0]?.id) throw new Error(`${stage}-confirmacao: registro não encontrado após salvar`);
      return result.data[0].id as string;
    };
    const updateById = async (table: string, id: string, payload: Record<string, unknown>, stage: string) => {
      const result = await db.from(table).update(payload).eq("id", id).select("id").abortSignal(deadline());
      fail(stage, result.error);
      if (!result.data?.[0]?.id) throw new Error(`${stage}-confirmacao: registro não encontrado após atualizar`);
      return id;
    };
    const deleteById = async (table: string, id: string, stage: string) => {
      const result = await db.from(table).delete().eq("id", id).select("id").abortSignal(deadline());
      fail(stage, result.error);
      if (!result.data?.[0]?.id) throw new Error(`${stage}-confirmacao: registro não encontrado para excluir`);
      return id;
    };
    const requireAdmin = async () => {
      const result = await db
        .from("app_users")
        .select("id")
        .eq("user_id", context.userId)
        .eq("is_admin", true)
        .maybeSingle()
        .abortSignal(deadline());
      fail("admin-verificacao", result.error);
      if (!result.data?.id) throw new Error("admin-verificacao: acesso negado");
    };

    switch (data.operation) {
      case "plan-create": return { id: await insertOwned("elora_planos", data.payload, "plano-cadastro") };
      case "plan-update": return { id: await updateById("elora_planos", data.id, data.payload, "plano-atualizacao") };
      case "plan-delete": return { id: await deleteById("elora_planos", data.id, "plano-exclusao") };
      case "partner-create": return { id: await insertOwned("elora_parceiros", data.payload, "parceiro-cadastro") };
      case "partner-update": return { id: await updateById("elora_parceiros", data.id, data.payload, "parceiro-atualizacao") };
      case "partner-delete": return { id: await deleteById("elora_parceiros", data.id, "parceiro-exclusao") };
      case "finance-create": return { id: await insertOwned("elora_financeiro", data.payload, "financeiro-cadastro") };
      case "finance-update": return { id: await updateById("elora_financeiro", data.id, data.payload, "financeiro-atualizacao") };
      case "finance-delete": return { id: await deleteById("elora_financeiro", data.id, "financeiro-exclusao") };
      case "discount-create": return { id: await insertOwned("elora_descontos", data.payload, "desconto-cadastro") };
      case "discount-update": return { id: await updateById("elora_descontos", data.id, data.payload, "desconto-atualizacao") };
      case "discount-delete": return { id: await deleteById("elora_descontos", data.id, "desconto-exclusao") };
      case "client-delete": return { id: await deleteById("elora_clientes", data.id, "cliente-exclusao") };
      case "movement-delete": {
        await deleteById("elora_movimentos", data.id, "movimento-exclusao");
        if (data.clientId && data.clientPatch && Object.keys(data.clientPatch).length > 0) {
          await updateById("elora_clientes", data.clientId, data.clientPatch, "movimento-reversao-cliente");
        }
        return { id: data.id };
      }
      case "closing-update": return { id: await updateById("elora_fechamentos", data.id, data.payload, "fechamento-atualizacao") };
      case "closing-delete": {
        const items = await db.from("elora_fechamento_itens").delete().eq("fechamento_id", data.id).abortSignal(deadline());
        fail("fechamento-itens-exclusao", items.error);
        return { id: await deleteById("elora_fechamentos", data.id, "fechamento-exclusao") };
      }
      case "closing-mau-update": {
        await updateById("elora_fechamento_itens", data.itemId, data.itemPayload, "mau-item");
        await updateById("elora_fechamentos", data.closingId, data.closingPayload, "mau-fechamento");
        if (data.financeId && data.financePayload) await updateById("elora_financeiro", data.financeId, data.financePayload, "mau-financeiro");
        return { id: data.itemId };
      }
      case "kanban-create": return { id: await insertOwned("elora_kanban_cards", data.payload, "oportunidade-cadastro") };
      case "kanban-update": return { id: await updateById("elora_kanban_cards", data.id, data.payload, "oportunidade-atualizacao") };
      case "kanban-delete": return { id: await deleteById("elora_kanban_cards", data.id, "oportunidade-exclusao") };
      case "admin-user-create": {
        await requireAdmin();
        const result = await db.from("app_users").insert(data.payload).select("id").abortSignal(deadline());
        fail("usuario-cadastro", result.error);
        if (!result.data?.[0]?.id) throw new Error("usuario-cadastro-confirmacao: usuário não encontrado após salvar");
        return { id: result.data[0].id as string };
      }
      case "admin-user-update": await requireAdmin(); return { id: await updateById("app_users", data.id, data.payload, "usuario-atualizacao") };
      case "admin-user-delete": {
        await requireAdmin();
        const perm = await db.from("app_user_permissions").delete().eq("email", data.email).abortSignal(deadline());
        fail("usuario-permissoes-exclusao", perm.error);
        return { id: await deleteById("app_users", data.id, "usuario-exclusao") };
      }
      case "admin-permission-upsert": {
        await requireAdmin();
        const result = await db.from("app_user_permissions").upsert({ email: data.email, module: data.module, ...data.payload }, { onConflict: "email,module" }).select("id").abortSignal(deadline());
        fail("permissao-atualizacao", result.error);
        if (!result.data?.[0]?.id) throw new Error("permissao-confirmacao: permissão não encontrada após salvar");
        return { id: result.data[0].id as string };
      }
    }
  });