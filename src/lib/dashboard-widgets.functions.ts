import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
};

async function exigirEquipeInterna(db: any) {
  const { data: interno } = await db.rpc("is_equipe_interna");
  if (!interno) throw new Error("acesso-negado: apenas equipe interna.");
}

const soCliente = z.object({ clienteId: z.string().min(1) });

export const listarWidgetsCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => soCliente.parse(input))
  .handler(async ({ data, context }): Promise<{ widgets: Widget[] }> => {
    await exigirEquipeInterna(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("elora_dashboard_widgets")
      .select("id, tipo, titulo, configuracao, ordem")
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
