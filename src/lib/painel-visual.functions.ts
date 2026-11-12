import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema } from "@/lib/campos-elora";
const vd = z.union([z.string().max(300), z.array(z.string().max(300)).max(100)]).optional();
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  clienteId: z.string().min(1),
  de: dia,
  ate: dia,
  filtros: z
    .object({ canal: vd, origem: vd, atendente: vd, etiqueta: vd, campanha: vd })
    .default({}),
  campos: z.array(filtroCampoSchema).max(20).default([]),
});

/**
 * Painel visual do cliente: só agregados, lidos do espelho no servidor.
 * Nunca lê o texto das mensagens.
 */
export const getPainelVisual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const [{ data: interno }, { data: meuCliente }, { data: parceiroOk }] = await Promise.all([
      db.rpc("is_equipe_interna"),
      db.rpc("cliente_do_usuario"),
      db.rpc("parceiro_pode_ver_painel", { _cliente_id: data.clienteId }),
    ]);
    if (!(Boolean(interno) || meuCliente === data.clienteId || Boolean(parceiroOk)))
      throw new Error("acesso-negado: este painel não está liberado para você.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adm = supabaseAdmin as any;
    const { usaEspelho } = await import("@/lib/elora-espelho.server");
    if (!(await usaEspelho(adm, data.clienteId))) return { disponivel: false as const };

    const { calcularPainelVisual } = await import("@/lib/painel-visual.server");
    return calcularPainelVisual(adm, data.clienteId, { de: data.de, ate: data.ate }, data.filtros, data.campos);
  });
