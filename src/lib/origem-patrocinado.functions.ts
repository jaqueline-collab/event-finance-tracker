import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { origemPatrocinadoValida } from "@/lib/origem-patrocinado";

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

/** Campo de Origem e valores patrocinados do cliente; só super admin lê a configuração. */
export const lerOrigemPatrocinado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const { catalogoVisivel } = await import("@/lib/campos-elora");
    const [{ data: cfg }, cat] = await Promise.all([
      db.from("elora_relatorio_corte_config").select("origem_patrocinado").eq("cliente_id", data.clienteId).maybeSingle(),
      catalogoDoCliente(db, data.clienteId),
    ]);
    const contato = catalogoVisivel(cat.catalogo, "coluna").find((g) => g.fonte === "contato");
    return {
      config: origemPatrocinadoValida(cfg?.origem_patrocinado),
      campos: (contato?.campos ?? []).filter((c) => c.opcoes?.length).map((c) => ({ campo: c.campo, rotulo: c.rotulo, opcoes: c.opcoes ?? [] })),
    };
  });

const entrada = z.object({
  clienteId: z.string().min(1),
  config: z.object({ campo: z.string().trim().min(1).max(200), patrocinados: z.array(z.string().trim().min(1).max(200)).max(300) }).nullable(),
});

/** Grava a classificação de Origem. Mudar a configuração invalida os cálculos em cache. */
export const salvarOrigemPatrocinado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => entrada.parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const config = data.config ? origemPatrocinadoValida(data.config) : null;
    if (data.config && !config) throw new Error("Configuração de Origem inválida.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").upsert(
      { cliente_id: data.clienteId, origem_patrocinado: config, atualizado_em: new Date().toISOString() },
      { onConflict: "cliente_id" },
    );
    if (error) throw new Error(`Origem patrocinada: ${error.message}`);
    return { ok: true };
  });
