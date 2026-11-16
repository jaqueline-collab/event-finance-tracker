import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema, filtrosPadraoValidos } from "@/lib/campos-elora";
import { ehChavePadrao, slugColuna } from "@/lib/matriz";

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const valorDim = z.union([z.string().max(200), z.array(z.string().max(200)).max(100)]).optional();
const filtros = z.object({ canal: valorDim, atendente: valorDim, equipe: valorDim }).default({});


async function podeVer(db: any, clienteId: string) {
  const [{ data: interno }, { data: meu }, { data: parceiro }] = await Promise.all([
    db.rpc("is_equipe_interna"),
    db.rpc("cliente_do_usuario"),
    db.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId }),
  ]);
  if (!(Boolean(interno) || meu === clienteId || Boolean(parceiro))) throw new Error("acesso-negado: este painel não está liberado para você.");
}
async function ehSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  return Boolean(data);
}
async function exigirSuperAdmin(db: any) {
  if (!(await ehSuperAdmin(db))) throw new Error("acesso-negado: só a super admin.");
}

import { coluna, paraLinha, type Coluna } from "@/lib/matriz-coluna";

/** Matriz do cliente: qualquer pessoa com acesso ao painel; edição só super admin. */
export const lerMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: dia, ate: dia, filtros, campos: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const podeEditar = await ehSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { montarMatrizCliente } = await import("@/lib/matriz.server");
    const { comCacheCalculo } = await import("@/lib/cartao-calculo.server");
    const { criarContexto } = await import("@/lib/calculo-contexto.server");
    // Com catálogo (só quem edita) a Matriz também lê os cards, por isso a chave separa os dois casos.
    const r = await comCacheCalculo(supabaseAdmin as any, data.clienteId, ["matriz", podeEditar, data.de, data.ate, data.filtros, data.campos], () =>
      montarMatrizCliente(supabaseAdmin as any, data.clienteId, { de: data.de, ate: data.ate }, data.filtros, { comCatalogo: podeEditar, campos: data.campos as any, ctx: criarContexto() }),
    );
    const { data: cfg } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").select("matriz_filtros_padrao, matriz_ordem_linhas").eq("cliente_id", data.clienteId).maybeSingle();
    const filtrosPadrao = filtrosPadraoValidos(cfg?.matriz_filtros_padrao);
    const ordemLinhas = ordemLinhasValida(cfg?.matriz_ordem_linhas);
    return {
      podeEditar,
      filtrosPadrao,
      ordemLinhas,
      colunas: r.colunas,
      // colunas ocultas só para quem edita
      todasColunas: podeEditar ? r.todasColunas : r.colunas,
      linhas: r.linhas,
      total: r.total,
      cobertura: r.cobertura,
      semHistoricoAntes: r.semHistoricoAntes, colunasSemHistorico: r.colunasSemHistorico,
      erros: podeEditar ? r.erros : [],
      opcoes: r.opcoes,
      temCards: r.temCards,
      etapas: r.etapas,
      catalogo: r.catalogo,
    };
  });

/** Prévia dos últimos 30 dias de uma coluna ainda não salva. Só super admin. */
export const previaColunaMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: dia, ate: dia, coluna }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { montarMatrizCliente } = await import("@/lib/matriz.server");
    const chave = data.coluna.chave || "__previa";
    const rascunho = { ...paraLinha(data.clienteId, data.coluna, chave, 9999), ativo: true } as any;
    const r = await montarMatrizCliente(supabaseAdmin as any, data.clienteId, { de: data.de, ate: data.ate }, {}, { rascunho });
    return {
      dias: r.linhas.map((l) => ({ dia: l.dia, ...l.celulas[chave] })),
      total: r.total[chave] ?? null,
    };
  });

export const salvarColunaMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), coluna }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: existentes, error } = await db.from("elora_indicadores_config").select("chave, ordem").eq("cliente_id", data.clienteId);
    if (error) throw new Error(error.message);
    const chaves = (existentes ?? []).map((e: any) => e.chave as string);
    const chave = data.coluna.chave && (chaves.includes(data.coluna.chave) || ehChavePadrao(data.coluna.chave)) ? data.coluna.chave : slugColuna(data.coluna.nome, chaves);
    if (data.coluna.tipo === "combinada" && !ehChavePadrao(chave) && !data.coluna.evento) throw new Error("escolha o evento da coluna.");
    const ordem = data.coluna.ordem ?? Math.max(100, ...(existentes ?? []).map((e: any) => Number(e.ordem) + 1));
    const { error: e2 } = await db.from("elora_indicadores_config").upsert(paraLinha(data.clienteId, data.coluna, chave, ordem), { onConflict: "cliente_id,chave" });
    if (e2) throw new Error(e2.message);
    return { chave };
  });

/** Reordenar e ocultar colunas (padrão inclusive). Só super admin. */
export const ordenarColunasMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), colunas: z.array(z.object({ chave: z.string().min(1).max(60), nome: z.string().max(60), ativo: z.boolean() })).max(100) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    for (const [i, c] of data.colunas.entries()) {
      if (ehChavePadrao(c.chave)) {
        const { error } = await db
          .from("elora_indicadores_config")
          .upsert(paraLinha(data.clienteId, { nome: c.nome, tipo: "app", formato: "numero", ativo: c.ativo, fonte: "contatos", medida: "contagem", condicoes: { op: "E", itens: [] } } as Coluna, c.chave, i), { onConflict: "cliente_id,chave" });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("elora_indicadores_config").update({ ordem: i, ativo: c.ativo, atualizado_em: new Date().toISOString() }).eq("cliente_id", data.clienteId).eq("chave", c.chave);
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });

async function papelDe(db: any, clienteId: string) {
  const [{ data: admin }, { data: meu }, { data: parc }] = await Promise.all([
    db.rpc("is_admin"), db.rpc("cliente_do_usuario"), db.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId }),
  ]);
  return { superAdmin: Boolean(admin), cliente: meu === clienteId, parceiro: Boolean(parc) && !admin };
}

/** Célula de coluna manual: valor do dia (null apaga). Quem preenche e dia futuro seguem a regra da coluna; toda alteração fica registrada. */
export const salvarCelulaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), chave: z.string().min(1).max(60), data: dia, valor: z.number().finite().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const papel = await papelDe(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: col } = await db.from("elora_indicadores_config").select("tipo, nome, formato, preenche, aceita_futuro").eq("cliente_id", data.clienteId).eq("chave", data.chave).maybeSingle();
    if (col?.tipo !== "manual") throw new Error("esta coluna não é manual.");
    const { podePreencher, diaPermitido, formatoManual } = await import("@/lib/coluna-manual");
    if (!podePreencher(col.preenche ?? "super_admin", papel)) throw new Error("acesso-negado: você não pode preencher esta coluna.");
    const { hojeSP } = await import("@/lib/coluna-manual");
    if (!diaPermitido(data.data, hojeSP(), Boolean(col.aceita_futuro))) throw new Error("Esta coluna não aceita dias futuros.");
    if (data.valor !== null && formatoManual(col.formato) === "inteiro" && !Number.isInteger(data.valor)) throw new Error("Esta coluna aceita só números inteiros.");
    const { data: antes } = await db.from("elora_matriz_manual").select("valor").eq("cliente_id", data.clienteId).eq("coluna_chave", data.chave).eq("data", data.data).maybeSingle();
    const anterior = antes?.valor == null ? null : Number(antes.valor);
    if (anterior === data.valor) return { ok: true };
    const quem = (context as any).claims?.email ?? (context as any).userId ?? null;
    const { error } = await db
      .from("elora_matriz_manual")
      .upsert({ cliente_id: data.clienteId, coluna_chave: data.chave, data: data.data, valor: data.valor, alterado_por: quem, alterado_em: new Date().toISOString() }, { onConflict: "cliente_id,coluna_chave,data" });
    if (error) throw new Error(error.message);
    const txt = (v: number | null) => (v == null ? "vazio" : String(v));
    const { error: eLog } = await db.from("elora_config_acoes").insert({
      cliente_id: data.clienteId, usuario_id: (context as any).userId ?? null, usuario_email: (context as any).claims?.email ?? null,
      alvo: `manual:${data.chave}|${data.data}`, descricao: `${col.nome ?? data.chave} em ${data.data.split("-").reverse().join("/")}: ${txt(anterior)} → ${txt(data.valor)}`,
      antes: { valor: anterior }, depois: { valor: data.valor },
    });
    if (eLog) console.error("log da coluna manual:", eLog.message);
    return { ok: true };
  });

/** Regra de cada coluna manual para quem está vendo (quem preenche, dia futuro, formato). */
export const lerRegrasManuais = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const papel = await papelDe(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cols } = await (supabaseAdmin as any).from("elora_indicadores_config").select("chave, formato, preenche, aceita_futuro").eq("cliente_id", data.clienteId).eq("tipo", "manual");
    const { podePreencher, formatoManual } = await import("@/lib/coluna-manual");
    const { hojeSP } = await import("@/lib/coluna-manual");
    const regras: Record<string, { pode: boolean; aceitaFuturo: boolean; formato: "inteiro" | "decimal" | "moeda"; preenche: "cliente" | "parceiro" | "super_admin" }> = {};
    for (const c of cols ?? []) regras[c.chave] = { pode: podePreencher(c.preenche ?? "super_admin", papel), aceitaFuturo: Boolean(c.aceita_futuro), formato: formatoManual(c.formato), preenche: c.preenche ?? "super_admin" };
    return { regras, hoje: hojeSP(), superAdmin: papel.superAdmin };
  });

/** Quem preenche e se aceita dia futuro (só super admin). */
export const salvarRegraManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), chave: z.string().min(1).max(60), preenche: z.enum(["cliente", "parceiro", "super_admin"]), aceitaFuturo: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_indicadores_config").update({ preenche: data.preenche, aceita_futuro: data.aceitaFuturo }).eq("cliente_id", data.clienteId).eq("chave", data.chave).eq("tipo", "manual");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Filtros padrão da visão Matriz (lidos por todos ao abrir). Só super admin grava. */
export const salvarFiltrosPadraoMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), filtros: z.array(filtroCampoSchema).max(20) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("elora_relatorio_corte_config")
      .upsert({ cliente_id: data.clienteId, matriz_filtros_padrao: data.filtros }, { onConflict: "cliente_id" });
    if (error) throw new Error(`matriz: ${error.message}`);
    return { ok: true };
  });

/** Ordem padrão das linhas do Relatório diário; sem gravação, dia mais recente primeiro. */
export function ordemLinhasValida(v: unknown): { col: string; desc: boolean } {
  const o = v as { col?: unknown; desc?: unknown } | null;
  return o && typeof o.col === "string" && o.col.length <= 120 && typeof o.desc === "boolean" ? { col: o.col, desc: o.desc } : { col: "dia", desc: true };
}

/** Salva a ordem padrão das linhas. Só super admin. */
export const salvarOrdemLinhasMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), ordem: z.object({ col: z.string().min(1).max(120), desc: z.boolean() }) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").upsert({ cliente_id: data.clienteId, matriz_ordem_linhas: data.ordem }, { onConflict: "cliente_id" });
    if (error) throw new Error(`matriz: ${error.message}`);
    return { ok: true };
  });

export const NOME_MATRIZ_PADRAO = "Relatório diário";

/** Nome da aba fixa da Matriz (qualquer pessoa com acesso ao painel lê). */
export const lerNomeMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").select("matriz_nome, matriz_ordem").eq("cliente_id", data.clienteId).maybeSingle();
    return { nome: (cfg?.matriz_nome as string | null)?.trim() || NOME_MATRIZ_PADRAO, ordem: typeof cfg?.matriz_ordem === "number" ? (cfg.matriz_ordem as number) : null };
  });

/** Renomeia a aba da Matriz. Só super admin. */
export const salvarNomeMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), nome: z.string().trim().min(1).max(60).optional(), ordem: z.number().int().min(0).max(60).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").upsert({ cliente_id: data.clienteId, ...(data.nome !== undefined ? { matriz_nome: data.nome } : {}), ...(data.ordem !== undefined ? { matriz_ordem: data.ordem } : {}) }, { onConflict: "cliente_id" });
    if (error) throw new Error(`matriz: ${error.message}`);
    return { ok: true };
  });

/** "Dados atualizados até": conclusão mais antiga das fontes do painel (quem vê o painel pode ler). */
export const lerAtualizadoAte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: est } = await (supabaseAdmin as any).from("elora_sync_estado").select("fonte, concluido_em").eq("cliente_id", data.clienteId);
    const { atualizadoAte } = await import("./sync-orquestrador.server");
    return { ate: atualizadoAte(est ?? []) };
  });
