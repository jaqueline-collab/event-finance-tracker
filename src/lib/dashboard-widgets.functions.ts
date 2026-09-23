import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanearLayout } from "@/lib/grid-layout";

/**
 * Widgets do painel do cliente ("Meu Dash") + exportação e limpeza dos dados
 * vindos da integração com o app Elora.
 *
 * Toda gravação exige equipe interna ANTES de carregar a credencial de
 * serviço. Referências dentro da configuração (rótulo, painel, sequência)
 * são conferidas contra o mesmo cliente do widget — o banco não valida
 * identificadores dentro de um campo livre, então a trava é aqui.
 */

export type Widget = {
  id: string;
  tipo: string;
  titulo: string;
  configuracao: any;
  ordem: number;
  layout: { x: number; y: number; w: number; h: number } | null;
};

async function exigirEquipeInterna(db: any) {
  const { data: interno } = await db.rpc("is_equipe_interna");
  if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
}

const soCliente = z.object({ clienteId: z.string().min(1) });

const layoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(999),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(60),
});

export const listarWidgetsCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soCliente.parse(input))
  .handler(async ({ data, context }): Promise<{ widgets: Widget[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("elora_dashboard_widgets")
      .select("id, tipo, titulo, configuracao, ordem, layout")
      .eq("cliente_id", data.clienteId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(`widgets: ${error.message}`);
    return {
      widgets: ((rows ?? []) as any[]).map((w) => ({
        id: String(w.id),
        tipo: String(w.tipo),
        titulo: String(w.titulo),
        configuracao: w.configuracao ?? {},
        ordem: Number(w.ordem ?? 0),
        layout: sanearLayout(w.layout),
      })),
    };
  });

const widgetSchema = z.object({
  clienteId: z.string().min(1),
  widgetId: z.string().uuid().nullable().default(null),
  tipo: z.enum(["metrico", "pizza", "barras", "calendario", "ranking", "tabela"]),
  titulo: z.string().trim().min(1).max(120),
  configuracao: z.record(z.string(), z.unknown()).default({}),
  ordem: z.number().int().min(0).max(999).default(0),
  layout: layoutSchema.nullable().default(null),
});

/** Coleta todo identificador citado na configuração, por tipo de entidade. */
function referencias(cfg: any) {
  const rotulos = new Set<string>();
  const paineis = new Set<string>();
  const sequencias = new Set<string>();
  if (cfg?.rotuloId) rotulos.add(String(cfg.rotuloId));
  for (const s of Array.isArray(cfg?.series) ? cfg.series : []) {
    if (s?.rotuloId) rotulos.add(String(s.rotuloId));
  }
  for (const c of Array.isArray(cfg?.camadas) ? cfg.camadas : []) {
    if (c?.rotuloId) rotulos.add(String(c.rotuloId));
  }
  if (cfg?.painelId) paineis.add(String(cfg.painelId));
  if (cfg?.filtros?.painelId) paineis.add(String(cfg.filtros.painelId));
  if (cfg?.sequenciaId) sequencias.add(String(cfg.sequenciaId));
  return { rotulos: [...rotulos], paineis: [...paineis], sequencias: [...sequencias] };
}

async function conferirReferencias(admin: any, clienteId: string, cfg: any) {
  const { rotulos, paineis, sequencias } = referencias(cfg);

  if (rotulos.length > 0) {
    const { data } = await admin
      .from("elora_classificacoes_rotulos")
      .select("id")
      .eq("cliente_id", clienteId)
      .in("id", rotulos);
    const ok = new Set(((data ?? []) as any[]).map((r) => String(r.id)));
    if (rotulos.some((id) => !ok.has(id))) {
      throw new Error("widgets: um dos rótulos escolhidos não pertence a este cliente.");
    }
  }
  if (paineis.length > 0) {
    const { data } = await admin
      .from("elora_paineis_sincronizados")
      .select("painel_id")
      .eq("cliente_id", clienteId)
      .in("painel_id", paineis);
    const ok = new Set(((data ?? []) as any[]).map((r) => String(r.painel_id)));
    if (paineis.some((id) => !ok.has(id))) {
      throw new Error("widgets: um dos painéis escolhidos não pertence a este cliente.");
    }
  }
  if (sequencias.length > 0) {
    const { data } = await admin
      .from("elora_sequencias_sincronizadas")
      .select("sequencia_id")
      .eq("cliente_id", clienteId)
      .in("sequencia_id", sequencias);
    const ok = new Set(((data ?? []) as any[]).map((r) => String(r.sequencia_id)));
    if (sequencias.some((id) => !ok.has(id))) {
      throw new Error("widgets: uma das sequências escolhidas não pertence a este cliente.");
    }
  }
}

export const salvarWidgetCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => widgetSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ widgetId: string }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await conferirReferencias(supabaseAdmin, data.clienteId, data.configuracao);

    if (data.widgetId) {
      const { error } = await supabaseAdmin
        .from("elora_dashboard_widgets")
        .update({
          tipo: data.tipo,
          titulo: data.titulo,
          configuracao: data.configuracao as never,
          ordem: data.ordem,
          layout: (data.layout ?? {}) as never,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", data.widgetId)
        .eq("cliente_id", data.clienteId);
      if (error) throw new Error(`widgets: ${error.message}`);
      return { widgetId: data.widgetId };
    }

    const { data: criado, error } = await supabaseAdmin
      .from("elora_dashboard_widgets")
      .insert({
        cliente_id: data.clienteId,
        tipo: data.tipo,
        titulo: data.titulo,
        configuracao: data.configuracao as never,
        ordem: data.ordem,
        layout: (data.layout ?? {}) as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(`widgets: ${error.message}`);
    return { widgetId: String(criado.id) };
  });

export const excluirWidgetCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), widgetId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("elora_dashboard_widgets")
      .delete()
      .eq("id", data.widgetId)
      .eq("cliente_id", data.clienteId);
    if (error) throw new Error(`widgets: ${error.message}`);
    return { ok: true };
  });

export const reordenarWidgetsCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        clienteId: z.string().min(1),
        ordem: z.array(z.string().uuid()).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (let i = 0; i < data.ordem.length; i++) {
      await supabaseAdmin
        .from("elora_dashboard_widgets")
        .update({ ordem: i, atualizado_em: new Date().toISOString() })
        .eq("id", data.ordem[i])
        .eq("cliente_id", data.clienteId);
    }
    return { ok: true };
  });

/** Salva de uma vez a posição/tamanho (e a ordem visual) da grade inteira. */
export const salvarGradeCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        clienteId: z.string().min(1),
        blocos: z.array(z.object({ id: z.string().uuid(), layout: layoutSchema })).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ordenados = [...data.blocos].sort(
      (a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x,
    );
    for (let i = 0; i < ordenados.length; i++) {
      await supabaseAdmin
        .from("elora_dashboard_widgets")
        .update({
          layout: ordenados[i].layout as never,
          ordem: i,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", ordenados[i].id)
        .eq("cliente_id", data.clienteId);
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Modelos de painel (grade reutilizável)
 * ------------------------------------------------------------------ */

export type ModeloPainel = {
  id: string;
  nome: string;
  descricao: string | null;
  widgets: {
    tipo: string;
    titulo: string;
    configuracao: any;
    ordem: number;
    layout: { x: number; y: number; w: number; h: number } | null;
  }[];
};

const modeloWidgetSchema = z.object({
  tipo: z.enum(["metrico", "pizza", "barras", "calendario", "ranking", "tabela"]),
  titulo: z.string().trim().min(1).max(120),
  configuracao: z.record(z.string(), z.unknown()).default({}),
  ordem: z.number().int().min(0).max(999).default(0),
  layout: layoutSchema.nullable().default(null),
});

export const listarModelosPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ modelos: ModeloPainel[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("elora_dashboard_modelos")
      .select("id, nome, descricao, widgets")
      .order("nome", { ascending: true });
    if (error) throw new Error(`modelos: ${error.message}`);
    return {
      modelos: ((rows ?? []) as any[]).map((m) => ({
        id: String(m.id),
        nome: String(m.nome),
        descricao: m.descricao ? String(m.descricao) : null,
        widgets: Array.isArray(m.widgets) ? m.widgets : [],
      })),
    };
  });

export const salvarModeloPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        modeloId: z.string().uuid().nullable().default(null),
        nome: z.string().trim().min(1).max(120),
        descricao: z.string().trim().max(400).nullable().default(null),
        widgets: z.array(modeloWidgetSchema).max(100).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ modeloId: string }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.modeloId) {
      const { error } = await supabaseAdmin
        .from("elora_dashboard_modelos")
        .update({
          nome: data.nome,
          descricao: data.descricao,
          widgets: data.widgets as never,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", data.modeloId);
      if (error) throw new Error(`modelos: ${error.message}`);
      return { modeloId: data.modeloId };
    }
    const { data: criado, error } = await supabaseAdmin
      .from("elora_dashboard_modelos")
      .insert({
        nome: data.nome,
        descricao: data.descricao,
        widgets: data.widgets as never,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`modelos: ${error.message}`);
    return { modeloId: String((criado as any).id) };
  });

/** Captura o painel atual de um cliente como modelo novo. */
export const salvarPainelComoModelo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        clienteId: z.string().min(1),
        nome: z.string().trim().min(1).max(120),
        descricao: z.string().trim().max(400).nullable().default(null),
        modeloId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ modeloId: string; total: number }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("elora_dashboard_widgets")
      .select("tipo, titulo, configuracao, ordem, layout")
      .eq("cliente_id", data.clienteId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(`modelos: ${error.message}`);
    const widgets = ((rows ?? []) as any[]).map((w, i) => ({
      tipo: String(w.tipo),
      titulo: String(w.titulo),
      configuracao: w.configuracao ?? {},
      ordem: Number(w.ordem ?? i),
      layout: sanearLayout(w.layout),
    }));
    if (data.modeloId) {
      const { error: e1 } = await supabaseAdmin
        .from("elora_dashboard_modelos")
        .update({
          nome: data.nome,
          descricao: data.descricao,
          widgets: widgets as never,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", data.modeloId);
      if (e1) throw new Error(`modelos: ${e1.message}`);
      return { modeloId: data.modeloId, total: widgets.length };
    }
    const { data: criado, error: e2 } = await supabaseAdmin
      .from("elora_dashboard_modelos")
      .insert({
        nome: data.nome,
        descricao: data.descricao,
        widgets: widgets as never,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (e2) throw new Error(`modelos: ${e2.message}`);
    return { modeloId: String((criado as any).id), total: widgets.length };
  });

export const excluirModeloPainel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ modeloId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("elora_dashboard_modelos")
      .delete()
      .eq("id", data.modeloId);
    if (error) throw new Error(`modelos: ${error.message}`);
    return { ok: true };
  });

/**
 * Aplica o modelo aos clientes escolhidos: apaga os widgets atuais e grava uma
 * cópia independente. Referências (rótulo, painel, sequência) que não existirem
 * no destino ficam em branco — nunca apontam para outro cliente.
 */
export const aplicarModeloEmClientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        modeloId: z.string().uuid(),
        clienteIds: z.array(z.string().min(1)).min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ aplicados: number }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: modelo, error } = await supabaseAdmin
      .from("elora_dashboard_modelos")
      .select("widgets")
      .eq("id", data.modeloId)
      .single();
    if (error) throw new Error(`modelos: ${error.message}`);
    const widgets = Array.isArray((modelo as any).widgets) ? ((modelo as any).widgets as any[]) : [];

    for (const clienteId of data.clienteIds) {
      const [{ data: rot }, { data: pai }, { data: seq }] = await Promise.all([
        supabaseAdmin.from("elora_classificacoes_rotulos").select("id").eq("cliente_id", clienteId),
        supabaseAdmin
          .from("elora_paineis_sincronizados")
          .select("painel_id")
          .eq("cliente_id", clienteId),
        supabaseAdmin
          .from("elora_sequencias_sincronizadas")
          .select("sequencia_id")
          .eq("cliente_id", clienteId),
      ]);
      const okRot = new Set(((rot ?? []) as any[]).map((r) => String(r.id)));
      const okPai = new Set(((pai ?? []) as any[]).map((r) => String(r.painel_id)));
      const okSeq = new Set(((seq ?? []) as any[]).map((r) => String(r.sequencia_id)));

      const limpar = (cfg: any): any => {
        const c = JSON.parse(JSON.stringify(cfg ?? {}));
        if (c.rotuloId && !okRot.has(String(c.rotuloId))) c.rotuloId = null;
        if (Array.isArray(c.series)) {
          c.series = c.series.filter((s: any) => s?.rotuloId && okRot.has(String(s.rotuloId)));
        }
        if (Array.isArray(c.camadas)) {
          c.camadas = c.camadas.map((x: any) =>
            x?.rotuloId && !okRot.has(String(x.rotuloId)) ? { ...x, rotuloId: null } : x,
          );
        }
        if (c.painelId && !okPai.has(String(c.painelId))) c.painelId = null;
        if (c.filtros?.painelId && !okPai.has(String(c.filtros.painelId))) c.filtros.painelId = null;
        if (c.sequenciaId && !okSeq.has(String(c.sequenciaId))) c.sequenciaId = null;
        return c;
      };

      await supabaseAdmin.from("elora_dashboard_widgets").delete().eq("cliente_id", clienteId);
      if (widgets.length === 0) continue;
      const { error: e2 } = await supabaseAdmin.from("elora_dashboard_widgets").insert(
        widgets.map((w, i) => ({
          cliente_id: clienteId,
          tipo: String(w.tipo),
          titulo: String(w.titulo),
          configuracao: limpar(w.configuracao) as never,
          ordem: Number(w.ordem ?? i),
          layout: (sanearLayout(w.layout) ?? {}) as never,
        })) as never,
      );
      if (e2) throw new Error(`modelos: ${e2.message}`);
    }

    return { aplicados: data.clienteIds.length };
  });

/* ------------------------------------------------------------------ *
 * Exportar e apagar os dados vindos da integração
 * ------------------------------------------------------------------ */

export type EntidadeExportada = { nome: string; colunas: string[]; linhas: (string | number | null)[][] };

const ENTIDADES: { tabela: string; nome: string }[] = [
  { tabela: "elora_contatos_sincronizados", nome: "Contatos" },
  { tabela: "elora_conversas_classificadas", nome: "Conversas" },
  { tabela: "elora_classificacoes_descobertas", nome: "Classificacoes" },
  { tabela: "elora_paineis_sincronizados", nome: "Paineis" },
  { tabela: "elora_sequencias_sincronizadas", nome: "Sequencias" },
];

const celula = (v: unknown): string | number | null => {
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "sim" : "não";
  return JSON.stringify(v);
};

/** Lê tudo que veio da integração para exportação (equipe interna apenas). */
export const exportarDadosIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soCliente.parse(input))
  .handler(async ({ data, context }): Promise<{ entidades: EntidadeExportada[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const entidades: EntidadeExportada[] = [];
    for (const e of ENTIDADES) {
      const { data: rows } = await supabaseAdmin
        .from(e.tabela as any)
        .select("*")
        .eq("cliente_id", data.clienteId)
        .limit(50000);
      const lista = (rows ?? []) as any[];
      const colunas = lista.length > 0 ? Object.keys(lista[0]) : [];
      entidades.push({
        nome: e.nome,
        colunas,
        linhas: lista.map((r) => colunas.map((c) => celula(r[c]))),
      });
    }

    // Rótulos de classificação e seus valores, numa aba só.
    const { data: rotulos } = await supabaseAdmin
      .from("elora_classificacoes_rotulos")
      .select("id, nome")
      .eq("cliente_id", data.clienteId);
    const ids = ((rotulos ?? []) as any[]).map((r) => r.id);
    const { data: valores } = ids.length
      ? await supabaseAdmin
          .from("elora_classificacoes_rotulo_valores")
          .select("rotulo_id, valor_bruto")
          .in("rotulo_id", ids)
      : { data: [] as any[] };
    entidades.push({
      nome: "Rotulos",
      colunas: ["rotulo", "valor_bruto"],
      linhas: ((valores ?? []) as any[]).map((v) => [
        String(((rotulos ?? []) as any[]).find((r) => r.id === v.rotulo_id)?.nome ?? ""),
        String(v.valor_bruto),
      ]),
    });

    return { entidades };
  });

/** Quantos registros existem hoje, para avisar antes de cancelar/apagar. */
export const contarDadosIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soCliente.parse(input))
  .handler(async ({ data, context }): Promise<{ total: number; porEntidade: Record<string, number> }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const porEntidade: Record<string, number> = {};
    let total = 0;
    for (const e of ENTIDADES) {
      const { count } = await supabaseAdmin
        .from(e.tabela as any)
        .select("*", { count: "exact", head: true })
        .eq("cliente_id", data.clienteId);
      porEntidade[e.nome] = count ?? 0;
      total += count ?? 0;
    }
    return { total, porEntidade };
  });

/** Apaga só o que veio da integração. Nada financeiro é tocado. */
export const apagarDadosIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soCliente.parse(input))
  .handler(async ({ data, context }) => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rótulos: valores primeiro, depois as referências e os próprios rótulos.
    const { data: rotulos } = await supabaseAdmin
      .from("elora_classificacoes_rotulos")
      .select("id")
      .eq("cliente_id", data.clienteId);
    const ids = ((rotulos ?? []) as any[]).map((r) => r.id);
    if (ids.length > 0) {
      await supabaseAdmin.from("elora_classificacoes_rotulo_valores").delete().in("rotulo_id", ids);
    }

    await supabaseAdmin.from("elora_dashboard_widgets").delete().eq("cliente_id", data.clienteId);

    for (const e of ENTIDADES) {
      await supabaseAdmin.from(e.tabela as any).delete().eq("cliente_id", data.clienteId);
    }

    // Só depois das conversas/descobertas some o rótulo em si.
    if (ids.length > 0) {
      await supabaseAdmin
        .from("elora_integracao_contas")
        .update({
          bloco2_rotulo_id: null,
          bloco3_rotulo_id: null,
          grafico1_serie1_rotulo_id: null,
          grafico1_serie2_rotulo_id: null,
          grafico2_serie1_rotulo_id: null,
          grafico2_serie2_rotulo_id: null,
        } as never)
        .eq("cliente_id", data.clienteId);
      await supabaseAdmin.from("elora_classificacoes_rotulos").delete().in("id", ids);
    }

    await supabaseAdmin.from("elora_integracao_contas").delete().eq("cliente_id", data.clienteId);

    return { ok: true };
  });

/** Cria uma planilha nova no Google Sheets com uma aba por entidade. */
export const exportarParaGoogleSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clienteId: z.string().min(1), nomeCliente: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const sheetsKey = process.env["GOOGLE_SHEETS_API_KEY"];
    if (!lovableKey || !sheetsKey) {
      throw new Error("Google Sheets não está conectado neste projeto.");
    }

    const entidades: EntidadeExportada[] = [];
    for (const e of ENTIDADES) {
      const { data: rows } = await supabaseAdmin
        .from(e.tabela as any)
        .select("*")
        .eq("cliente_id", data.clienteId)
        .limit(20000);
      const lista = (rows ?? []) as any[];
      const colunas = lista.length > 0 ? Object.keys(lista[0]) : ["sem dados"];
      entidades.push({
        nome: e.nome,
        colunas,
        linhas: lista.map((r) => colunas.map((c) => celula(r[c]))),
      });
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const titulo = `Elora — ${data.nomeCliente} — ${hoje}`;

    const criar = await fetch("https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: titulo },
        sheets: entidades.map((e) => ({ properties: { title: e.nome } })),
      }),
    });
    if (!criar.ok) {
      const corpo = await criar.text();
      throw new Error(`Google Sheets [${criar.status}]: ${corpo}`);
    }
    const planilha = (await criar.json()) as any;
    const id = String(planilha.spreadsheetId);

    const valores = entidades.map((e) => ({
      range: `${e.nome}!A1`,
      majorDimension: "ROWS",
      values: [e.colunas, ...e.linhas.map((l) => l.map((v) => (v == null ? "" : v)))],
    }));

    const gravar = await fetch(
      `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${id}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ valueInputOption: "RAW", data: valores }),
      },
    );
    if (!gravar.ok) {
      const corpo = await gravar.text();
      throw new Error(`Google Sheets [${gravar.status}]: ${corpo}`);
    }

    return { url: `https://docs.google.com/spreadsheets/d/${id}/edit` };
  });
