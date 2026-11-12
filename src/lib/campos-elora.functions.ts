import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function podeVer(db: any, clienteId: string) {
  const [{ data: interno }, { data: meu }, { data: parceiro }] = await Promise.all([
    db.rpc("is_equipe_interna"),
    db.rpc("cliente_do_usuario"),
    db.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId }),
  ]);
  if (!(Boolean(interno) || meu === clienteId || Boolean(parceiro))) throw new Error("acesso-negado: este painel não está liberado para você.");
}
/** Configuração do catálogo: super admin ou equipe interna. */
export async function exigirEquipeConfig(db: any) {
  const [{ data: admin }, { data: interno }] = await Promise.all([db.rpc("is_admin"), db.rpc("is_equipe_interna")]);
  if (!(Boolean(admin) || Boolean(interno))) throw new Error("acesso-negado: só super admin ou equipe interna.");
}
const fonte = z.enum(["contato", "atendimento", "card", "utm"]);

/** Catálogo completo (com ocultos) para a aba Configurar → Campos do Elora. */
export const lerCatalogoConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirEquipeConfig(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    return { grupos: (await catalogoDoCliente(supabaseAdmin as any, data.clienteId)).catalogo };
  });

/** Catálogo para o "+ Filtro": só visíveis, para quem vê o painel. */
export const lerCatalogoFiltro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const { catalogoVisivel } = await import("@/lib/campos-elora");
    const g = catalogoVisivel((await catalogoDoCliente(supabaseAdmin as any, data.clienteId)).catalogo, "filtro");
    // telefone e nome não viram lista de opções
    return { grupos: g };
  });

export const salvarAjusteCampo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), fonte, campo: z.string().min(1).max(200), rotulo: z.string().trim().max(80).nullable(), oculto: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeConfig(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const quem = (context as any).claims?.email ?? (context as any).userId ?? null;
    const { error } = await (supabaseAdmin as any).from("elora_campos_ajustes").upsert(
      { cliente_id: data.clienteId, fonte: data.fonte, campo: data.campo, rotulo: data.rotulo || null, oculto: data.oculto, atualizado_em: new Date().toISOString(), atualizado_por: quem },
      { onConflict: "cliente_id,fonte,campo" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
