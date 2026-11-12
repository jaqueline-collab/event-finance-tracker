import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema } from "@/lib/campos-elora";
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

const campoRef = z.object({ fonte: z.enum(["card", "contato", "atendimento", "utm"]), campo: z.string().min(1).max(200) });
const condicao = z.object({ campo: campoRef, operador: z.enum(["preenchido", "vazio", "igual", "contem"]), valor: z.string().max(300).optional() });
const grupo = z.object({ op: z.enum(["E", "OU"]), itens: z.array(condicao).max(20) });
const evento = z.union([
  z.object({ tipo: z.literal("entrou_etapa"), etapa: z.string().min(1).max(200) }),
  z.object({ tipo: z.literal("virou_ganho") }),
  z.object({ tipo: z.literal("virou_perdido") }),
  z.object({ tipo: z.literal("campo_preenchido"), campo: campoRef }),
  z.object({ tipo: z.literal("foi_criado") }),
]);
const coluna = z.object({
  chave: z.string().max(60).optional(),
  nome: z.string().trim().min(1).max(60),
  tipo: z.enum(["app", "manual", "combinada", "formula"]),
  formato: z.enum(["numero", "percentual", "moeda"]).default("numero"),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).max(1000).optional(),
  fonte: z.enum(["contatos", "conversas", "cards"]).default("cards"),
  medida: z.enum(["contagem", "soma", "media"]).default("contagem"),
  evento: evento.optional(),
  condicoes: grupo.default({ op: "E", itens: [] }),
  formula: z.object({ op: z.enum(["soma", "diferenca", "razao", "percentual"]), a: z.string().max(60), b: z.string().max(60) }).optional().nullable(),
});
type Coluna = z.infer<typeof coluna>;

function paraLinha(clienteId: string, c: Coluna, chave: string, ordem: number) {
  const padrao = ehChavePadrao(chave);
  return {
    cliente_id: clienteId,
    chave,
    nome: c.nome,
    tipo: padrao ? "app" : c.tipo,
    fonte: padrao ? "contatos" : c.fonte,
    medida: c.medida,
    evento: c.tipo === "combinada" && !padrao ? (c.evento ?? {}) : {},
    condicoes: c.tipo === "combinada" && !padrao ? c.condicoes : { op: "E", itens: [] },
    formula: c.tipo === "formula" && !padrao ? (c.formula ?? null) : null,
    formato: c.formato,
    ordem,
    ativo: c.ativo,
    atualizado_em: new Date().toISOString(),
  };
}

/** Matriz do cliente: qualquer pessoa com acesso ao painel; edição só super admin. */
export const lerMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: dia, ate: dia, filtros, campos: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data, context }) => {
    await podeVer(context.supabase, data.clienteId);
    const podeEditar = await ehSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { montarMatrizCliente } = await import("@/lib/matriz.server");
    const r = await montarMatrizCliente(supabaseAdmin as any, data.clienteId, { de: data.de, ate: data.ate }, data.filtros, { comCatalogo: podeEditar, campos: data.campos as any });
    return {
      podeEditar,
      colunas: r.colunas,
      // colunas ocultas só para quem edita
      todasColunas: podeEditar ? r.todasColunas : r.colunas,
      linhas: r.linhas,
      total: r.total,
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
