import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema } from "@/lib/campos-elora";
import { cartaoSchema, cartoesValidos, cartaoTemDinheiro, type CartaoGrafico } from "@/lib/graficos";

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Filtros fixos sempre da versão gravada (bloco e visão), aplicados antes dos de quem vê. */
async function comFixos(clienteId: string, cartoes: CartaoGrafico[], quemVe: any[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { aplicarFixosGravados, filtrosFixosValidos } = await import("@/lib/filtros-fixos");
  const { data: vs, error } = await (supabaseAdmin as any).from("elora_dashboard_visoes").select("id, filtros").eq("cliente_id", clienteId);
  if (error) throw new Error(`visoes: ${error.message}`);
  const visoes = (vs ?? []).map((v: any) => ({ id: String(v.id), cartoes: cartoesValidos(v.filtros?.cartoes), filtrosFixos: filtrosFixosValidos(v.filtros?.filtrosFixos) }));
  const { data: cfg } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").select("matriz_cartoes").eq("cliente_id", clienteId).maybeSingle();
  visoes.push({ id: VISAO_MATRIZ_ID, cartoes: cartoesValidos(cfg?.matriz_cartoes), filtrosFixos: [] });
  return aplicarFixosGravados(cartoes, visoes, quemVe);
}

async function acesso(db: any, clienteId: string) {
  const [{ data: interno }, { data: meu }, { data: parceiro }, { data: admin }, { data: veValores }] = await Promise.all([
    db.rpc("is_equipe_interna"),
    db.rpc("cliente_do_usuario"),
    db.rpc("parceiro_pode_ver_painel", { _cliente_id: clienteId }),
    db.rpc("is_admin"),
    db.rpc("parceiro_ve_valores"),
  ]);
  const ehInterno = Boolean(interno);
  const ehCliente = meu === clienteId;
  if (!(ehInterno || ehCliente || Boolean(parceiro))) throw new Error("acesso-negado: este painel não está liberado para você.");
  // parceiro (não equipe, não o próprio cliente) só vê dinheiro com permissão
  const semDinheiro = !ehInterno && !ehCliente && !veValores;
  return { superAdmin: Boolean(admin), semDinheiro };
}

/** Opções do construtor: catálogo (rótulos/ocultos aplicados) e indicadores da Matriz. */
export const opcoesGraficos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (!a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const { catalogoVisivel } = await import("@/lib/campos-elora");
    const { lerConfig } = await import("@/lib/indicadores.server");
    const { colunasMatriz } = await import("@/lib/matriz");
    const cat = await catalogoDoCliente(supabaseAdmin as any, data.clienteId);
    const indicadores = colunasMatriz((await lerConfig(supabaseAdmin as any, data.clienteId)) as any).filter((c) => c.ativo).map((c) => ({ chave: c.chave, nome: c.nome, formato: c.formato }));
    return {
      catalogo: catalogoVisivel(cat.catalogo).map((g) => ({ ...g, campos: g.campos.map(({ opcoes: _o, ...c }) => c) })),
      indicadores,
    };
  });

/** Calcula um cartão (salvo ou em prévia). Visualizar: quem vê o painel; prévia de cartão novo: só super admin. */
export const calcularCartao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), de: dia, ate: dia, cartao: cartaoSchema, filtrosVisao: z.array(filtroCampoSchema).max(20).default([]), previa: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (data.previa && !a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const fx = await comFixos(data.clienteId, [data.cartao as CartaoGrafico], data.filtrosVisao);
    const c = fx.cartoes[0];
    if (a.semDinheiro && cartaoTemDinheiro(c)) return { oculto: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calcularCartaoServidor } = await import("@/lib/cartao-calculo.server");
    return calcularCartaoServidor(supabaseAdmin as any, { ...data, filtrosVisao: fx.filtrosVisao }, c, a);
  });

/** Calcula vários cartões de uma visão numa só requisição (leitura única, cache curto, permissão aplicada depois). */
export const calcularCartoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ clienteId: z.string().min(1), de: dia, ate: dia, cartoes: z.array(cartaoSchema).min(1).max(40), filtrosVisao: z.array(filtroCampoSchema).max(20).default([]), previa: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (data.previa && !a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { calcularCartoesServidor } = await import("@/lib/cartao-calculo.server");
    const fx = await comFixos(data.clienteId, data.cartoes as CartaoGrafico[], data.filtrosVisao);
    return calcularCartoesServidor(supabaseAdmin as any, { ...data, filtrosVisao: fx.filtrosVisao }, fx.cartoes, a, { usarCache: !data.previa });
  });

/** Itens de um dia do calendário (nome, telefone, atendente, valor, campos escolhidos). Nunca lê texto de mensagem. */
export const itensDiaCalendario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), dia, cartao: cartaoSchema, filtrosVisao: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    const fx = await comFixos(data.clienteId, [data.cartao as CartaoGrafico], data.filtrosVisao);
    const c = fx.cartoes[0];
    if (c.tipo !== "calendario" || c.medida === "indicador") return { itens: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const { itensDoDia } = await import("@/lib/graficos");
    const cat = await catalogoDoCliente(supabaseAdmin as any, data.clienteId);
    return { itens: itensDoDia(cat.base, c, data.dia, fx.filtrosVisao as any, a.semDinheiro) };
  });

/** Grava a lista de cartões de uma visão (ordem incluída). Só super admin. Remover cartão não apaga dado. */
export const salvarCartoesVisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), visaoId: z.string().uuid().or(z.literal("__matriz")), cartoes: z.array(cartaoSchema).max(40) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (!a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await gravar(supabaseAdmin as any, data.clienteId, data.visaoId, data.cartoes);
    return { ok: true };
  });

/** Move um cartão para outra visão do mesmo cliente. Só super admin. */
export const moverCartaoVisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: z.string().uuid().or(z.literal("__matriz")), para: z.string().uuid().or(z.literal("__matriz")), cartaoId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (!a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const origem = await ler(db, data.clienteId, data.de);
    const destino = await ler(db, data.clienteId, data.para);
    const c = origem.find((x) => x.id === data.cartaoId);
    if (!c) throw new Error("cartão não encontrado.");
    await gravar(db, data.clienteId, data.para, [...destino, c]);
    await gravar(db, data.clienteId, data.de, origem.filter((x) => x.id !== data.cartaoId));
    return { ok: true };
  });

async function ler(db: any, clienteId: string, visaoId: string): Promise<CartaoGrafico[]> {
  if (visaoId === VISAO_MATRIZ_ID) {
    const { data: cfg, error } = await db.from("elora_relatorio_corte_config").select("matriz_cartoes").eq("cliente_id", clienteId).maybeSingle();
    if (error) throw new Error(`matriz: ${error.message}`);
    return cartoesValidos(cfg?.matriz_cartoes);
  }
  const { data: v, error } = await db.from("elora_dashboard_visoes").select("filtros").eq("id", visaoId).eq("cliente_id", clienteId).maybeSingle();
  if (error) throw new Error(`visoes: ${error.message}`);
  if (!v) throw new Error("visão não encontrada.");
  return cartoesValidos(v.filtros?.cartoes);
}
async function gravar(db: any, clienteId: string, visaoId: string, cartoes: CartaoGrafico[]) {
  if (visaoId === VISAO_MATRIZ_ID) {
    // A tabela do Relatório diário nunca sai da visão nem é removida.
    const lista = cartoesDaMatriz(cartoes);
    const { error } = await db.from("elora_relatorio_corte_config").upsert({ cliente_id: clienteId, matriz_cartoes: lista }, { onConflict: "cliente_id" });
    if (error) throw new Error(`matriz: ${error.message}`);
    return;
  }
  if (cartoes.some((c) => c.id === BLOCO_TABELA_MATRIZ)) throw new Error("a tabela do Relatório diário não sai da sua aba.");
  const { data: v, error } = await db.from("elora_dashboard_visoes").select("filtros").eq("id", visaoId).eq("cliente_id", clienteId).maybeSingle();
  if (error) throw new Error(`visoes: ${error.message}`);
  if (!v) throw new Error("visão não encontrada.");
  const { error: e2 } = await db.from("elora_dashboard_visoes").update({ filtros: { ...(v.filtros ?? {}), cartoes } }).eq("id", visaoId).eq("cliente_id", clienteId);
  if (e2) throw new Error(`visoes: ${e2.message}`);
}

/** Início da semana do Calendário deste cliente (domingo por padrão). Quem vê o painel lê. */
export const lerInicioSemana = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await (supabaseAdmin as any).from("elora_relatorio_corte_config").select("semana_inicia_segunda").eq("cliente_id", data.clienteId).maybeSingle();
    return { iniciaSegunda: Boolean(cfg?.semana_inicia_segunda), podeMudar: a.superAdmin };
  });

/** Grava o início da semana do Calendário (só super admin). */
export const salvarInicioSemana = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), iniciaSegunda: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await acesso(context.supabase, data.clienteId);
    if (!a.superAdmin) throw new Error("acesso-negado: só a super admin.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_relatorio_corte_config")
      .upsert({ cliente_id: data.clienteId, semana_inicia_segunda: data.iniciaSegunda, atualizado_em: new Date().toISOString() }, { onConflict: "cliente_id" });
    if (error) throw new Error(`início da semana: ${error.message}`);
    return { ok: true };
  });

/** Blocos do Relatório diário (a tabela + outros). Quem vê o painel lê. */
export const lerCartoesMatriz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await acesso(context.supabase, data.clienteId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return { cartoes: cartoesDaMatriz(await ler(supabaseAdmin as any, data.clienteId, VISAO_MATRIZ_ID)) };
  });
