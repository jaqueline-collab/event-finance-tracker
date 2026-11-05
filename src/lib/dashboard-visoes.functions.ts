import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { diffVisoes, visoesVisiveis, type Visao } from "@/lib/dashboard-visoes";

/**
 * Visões (abas) do painel do cliente. A tabela não tem acesso direto pela
 * API: tudo passa aqui. Leitura segue as mesmas regras do painel; rascunhos
 * e qualquer gravação só para super admin (is_admin).
 */

async function podeVerPainel(db: any, clienteId: string) {
  const [{ data: interno }, { data: meuCliente }, { data: parceiroOk }] = await Promise.all([
    db.rpc("is_equipe_interna"),
    db.rpc("cliente_do_usuario"),
    db.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId }),
  ]);
  return Boolean(interno) || meuCliente === clienteId || Boolean(parceiroOk);
}

async function ehSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  return Boolean(data);
}

async function lerVisoes(admin: any, clienteId: string): Promise<(Visao & { filtrosBrutos: Record<string, unknown> })[]> {
  const [{ data: vs, error }, { data: ws }] = await Promise.all([
    admin
      .from("elora_dashboard_visoes")
      .select("id, nome, ordem, publicada, filtros")
      .eq("cliente_id", clienteId)
      .order("ordem", { ascending: true }),
    admin.from("elora_dashboard_widgets").select("visao_id").eq("cliente_id", clienteId),
  ]);
  if (error) throw new Error(`visoes: ${error.message}`);
  const contagem = new Map<string, number>();
  for (const w of (ws ?? []) as any[]) {
    if (w.visao_id) contagem.set(String(w.visao_id), (contagem.get(String(w.visao_id)) ?? 0) + 1);
  }
  return ((vs ?? []) as any[]).map((v) => ({
    id: String(v.id),
    nome: String(v.nome),
    ordem: Number(v.ordem ?? 0),
    publicada: Boolean(v.publicada),
    totalGraficos: contagem.get(String(v.id)) ?? 0,
    ocultos: Array.isArray(v.filtros?.cartoesOcultos) ? v.filtros.cartoesOcultos.map(String) : [],
    filtrosBrutos: v.filtros ?? {},
  }));
}

export const listarVisoesCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), incluirRascunhos: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ visoes: Visao[]; podeEditar: boolean }> => {
    if (!(await podeVerPainel(context.supabase, data.clienteId))) {
      throw new Error("acesso-negado: este painel não está liberado para você.");
    }
    const admin = await ehSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (admin) {
      const { visaoPadrao } = await import("@/lib/dashboard-visoes.server");
      await visaoPadrao(supabaseAdmin, data.clienteId);
    }
    const todas = await lerVisoes(supabaseAdmin, data.clienteId);
    return { visoes: visoesVisiveis(todas, admin && data.incluirRascunhos).map(({ filtrosBrutos: _f, ...v }) => v), podeEditar: admin };
  });

const visaoEditadaSchema = z.object({
  id: z.string().min(1).max(60),
  nome: z.string().trim().min(1).max(60),
  ordem: z.number().int().min(0).max(99),
  publicada: z.boolean(),
  novaDe: z.string().uuid().nullable().optional(),
  ocultos: z.array(z.string().max(40)).max(30).optional(),
});

export const salvarVisoesCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), visoes: z.array(visaoEditadaSchema).min(1).max(30) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ visoes: Visao[] }> => {
    if (!(await ehSuperAdmin(context.supabase))) throw new Error("acesso-negado: apenas super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const salvas = await lerVisoes(db, data.clienteId);
    const { criar, atualizar, excluir } = diffVisoes(salvas, data.visoes);

    for (const id of excluir) {
      const { error } = await db.from("elora_dashboard_visoes").delete().eq("id", id).eq("cliente_id", data.clienteId);
      if (error) throw new Error(`visoes: ${error.message}`);
    }
    for (const v of atualizar) {
      const { error } = await db
        .from("elora_dashboard_visoes")
        .update({
          nome: v.nome,
          ordem: v.ordem,
          publicada: v.publicada,
          filtros: { ...(salvas.find((s) => s.id === v.id)?.filtrosBrutos ?? {}), cartoesOcultos: v.ocultos ?? [] },
        })
        .eq("id", v.id)
        .eq("cliente_id", data.clienteId);
      if (error) throw new Error(`visoes: ${error.message}`);
    }
    const idsSalvos = new Set(salvas.map((s) => s.id));
    for (const v of criar) {
      const { data: nova, error } = await db
        .from("elora_dashboard_visoes")
        .insert({ cliente_id: data.clienteId, nome: v.nome, ordem: v.ordem, publicada: v.publicada, filtros: { cartoesOcultos: v.ocultos ?? [] } })
        .select("id")
        .single();
      if (error) throw new Error(`visoes: ${error.message}`);
      // Duplicar: copia os gráficos da visão de origem (só se for do mesmo cliente).
      if (v.novaDe && idsSalvos.has(v.novaDe)) {
        const { data: ws } = await db
          .from("elora_dashboard_widgets")
          .select("tipo, titulo, configuracao, ordem, layout")
          .eq("cliente_id", data.clienteId)
          .eq("visao_id", v.novaDe);
        const copias = ((ws ?? []) as any[]).map((w) => ({ ...w, cliente_id: data.clienteId, visao_id: nova.id }));
        if (copias.length) {
          const { error: e2 } = await db.from("elora_dashboard_widgets").insert(copias);
          if (e2) throw new Error(`visoes: ${e2.message}`);
        }
      }
    }
    const { visaoPadrao } = await import("@/lib/dashboard-visoes.server");
    await visaoPadrao(db, data.clienteId);
    return { visoes: (await lerVisoes(db, data.clienteId)).map(({ filtrosBrutos: _f, ...v }) => v) };
  });
