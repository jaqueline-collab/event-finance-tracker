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
    // Cache com o dado completo (com catálogo); o que é só de quem edita sai depois, a cada requisição.
    const completo = await comCacheCalculo(supabaseAdmin as any, data.clienteId, ["matriz", data.de, data.ate, data.filtros, data.campos], () =>
      montarMatrizCliente(supabaseAdmin as any, data.clienteId, { de: data.de, ate: data.ate }, data.filtros, { comCatalogo: true, campos: data.campos as any, ctx: criarContexto() }),
    );
    const r = podeEditar ? completo : { ...completo, etapas: [] as string[], catalogo: [] as typeof completo.catalogo };
    const { data: cfg } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").select("matriz_filtros_padrao").eq("cliente_id", data.clienteId).maybeSingle();
    const filtrosPadrao = filtrosPadraoValidos(cfg?.matriz_filtros_padrao);
    return {
      podeEditar,
      filtrosPadrao,
      colunas: r.colunas,
      // colunas ocultas só para quem edita
      todasColunas: podeEditar ? r.todasColunas : r.colunas,
      linhas: r.linhas,
      total: r.total,
      cobertura: r.cobertura,
      primeiraLeitura: r.primeiraLeitura,
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

/** Célula de coluna manual: valor do dia (null apaga o valor). Só super admin. */
export const salvarCelulaManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), chave: z.string().min(1).max(60), data: dia, valor: z.number().finite().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: col } = await db.from("elora_indicadores_config").select("tipo").eq("cliente_id", data.clienteId).eq("chave", data.chave).maybeSingle();
    if (col?.tipo !== "manual") throw new Error("esta coluna não é manual.");
    const quem = (context as any).claims?.email ?? (context as any).userId ?? null;
    const { error } = await db
      .from("elora_matriz_manual")
      .upsert({ cliente_id: data.clienteId, coluna_chave: data.chave, data: data.data, valor: data.valor, alterado_por: quem, alterado_em: new Date().toISOString() }, { onConflict: "cliente_id,coluna_chave,data" });
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
