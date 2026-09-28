import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FiltrosCongelados = {
  canais: string[];
  atendentes: string[];
  equipes: string[];
  data_inicial: string;
  data_final: string;
  colunas_visiveis: string[];
  ordem_colunas: string[];
};

const filtrosSchema = z.object({
  canais: z.array(z.string().max(200)).max(200),
  atendentes: z.array(z.string().max(200)).max(200),
  equipes: z.array(z.string().max(200)).max(200),
  data_inicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_final: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  colunas_visiveis: z.array(z.string().max(60)).max(50),
  ordem_colunas: z.array(z.string().max(60)).max(50),
});

type Ctx = { supabase: any };

async function podeCongelar(ctx: Ctx, clienteId: string): Promise<boolean> {
  const { data: interno } = await ctx.supabase.rpc("is_equipe_interna");
  if (interno) return true;
  const { data: parceiro } = await ctx.supabase.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId });
  return Boolean(parceiro);
}

/** Filtro congelado do usuário logado para o cliente, e se ele pode congelar. */
export const getFiltroCongelado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clienteId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("relatorio_diario_filtro_congelado")
      .select("filtros, congelado_em")
      .eq("cliente_id", data.clienteId)
      .eq("usuario_alvo_id", context.userId)
      .maybeSingle();
    return {
      filtros: (row?.filtros ?? null) as FiltrosCongelados | null,
      congeladoEm: row?.congelado_em ?? null,
      podeCongelar: await podeCongelar(context, data.clienteId),
      userId: context.userId,
    };
  });

export const listarUsuariosCongelaveis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clienteId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await podeCongelar(context, data.clienteId))) throw new Error("Sem permissão para congelar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: usuarios }, { data: congelados }] = await Promise.all([
      supabaseAdmin
        .from("elora_cliente_usuarios")
        .select("user_id, nome, email")
        .eq("cliente_id", data.clienteId)
        .eq("ativo", true)
        .not("user_id", "is", null)
        .order("nome"),
      supabaseAdmin
        .from("relatorio_diario_filtro_congelado")
        .select("usuario_alvo_id")
        .eq("cliente_id", data.clienteId),
    ]);
    const setCong = new Set((congelados ?? []).map((c) => c.usuario_alvo_id));
    return (usuarios ?? []).map((u) => ({
      userId: u.user_id as string,
      nome: u.nome,
      email: u.email,
      congelado: setCong.has(u.user_id as string),
    }));
  });

export const congelarVisualizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ clienteId: z.string().min(1).max(64), usuarioAlvoId: z.string().uuid(), filtros: filtrosSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await podeCongelar(context, data.clienteId))) throw new Error("Sem permissão para congelar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.usuarioAlvoId !== context.userId) {
      const { data: u } = await supabaseAdmin
        .from("elora_cliente_usuarios")
        .select("id")
        .eq("cliente_id", data.clienteId)
        .eq("user_id", data.usuarioAlvoId)
        .maybeSingle();
      if (!u) throw new Error("Esse usuário não pertence a este cliente.");
    }
    const { error } = await supabaseAdmin.from("relatorio_diario_filtro_congelado").upsert(
      {
        cliente_id: data.clienteId,
        usuario_alvo_id: data.usuarioAlvoId,
        filtros: data.filtros,
        congelado_por: context.userId,
        congelado_em: new Date().toISOString(),
      },
      { onConflict: "cliente_id,usuario_alvo_id" },
    );
    if (error) throw new Error("Não foi possível congelar a visualização.");
    return { ok: true };
  });

export const descongelarVisualizacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ clienteId: z.string().min(1).max(64), usuarioAlvoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await podeCongelar(context, data.clienteId))) throw new Error("Sem permissão para descongelar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("relatorio_diario_filtro_congelado")
      .delete()
      .eq("cliente_id", data.clienteId)
      .eq("usuario_alvo_id", data.usuarioAlvoId);
    if (error) throw new Error("Não foi possível descongelar.");
    return { ok: true };
  });
