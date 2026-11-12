import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema } from "@/lib/campos-elora";
import { cartaoSchema, cartoesValidos, cartaoTemDinheiro, type CartaoGrafico } from "@/lib/graficos";

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
    const c = data.cartao as CartaoGrafico;
    if (a.semDinheiro && cartaoTemDinheiro(c)) return { oculto: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const p = { de: data.de, ate: data.ate };
    if (c.painel) {
      const { calcularPainelVisual } = await import("@/lib/painel-visual.server");
      const { separarFiltros } = await import("@/lib/campos-elora");
      const { cartaoDoPainel } = await import("@/lib/graficos");
      const nativos = { canal: { fonte: "atendimento" as const, campo: "canal" }, atendente: { fonte: "atendimento" as const, campo: "atendente" }, origem: { fonte: "contato" as const, campo: "origem" }, etiqueta: { fonte: "contato" as const, campo: "etiquetas" }, campanha: { fonte: "utm" as const, campo: "campaign" } };
      const { diretos, outros } = separarFiltros([...data.filtrosVisao, ...c.filtros], nativos);
      const painel = await calcularPainelVisual(db, data.clienteId, p, diretos, outros);
      return { oculto: false as const, r: { ...cartaoDoPainel(painel, c), cobertura: painel.cobertura } };
    }
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const cat = await catalogoDoCliente(db, data.clienteId);
    if (c.medida === "indicador") {
      if (!c.indicador) return { oculto: false as const, r: null };
      const { montarMatrizCliente } = await import("@/lib/matriz.server");
      const { cartaoDeIndicador } = await import("@/lib/graficos");
      const { periodoAnterior } = await import("@/lib/painel-visual");
      const campos = [...data.filtrosVisao, ...c.filtros] as any;
      const m = await montarMatrizCliente(db, data.clienteId, p, {}, { campos });
      if (!m.todasColunas.some((x) => x.chave === c.indicador)) return { oculto: false as const, r: null };
      let ant: number | null = null;
      if (c.comparar) {
        const ma = await montarMatrizCliente(db, data.clienteId, periodoAnterior(p), {}, { campos });
        ant = cartaoDeIndicador(ma.linhas as any, c.indicador, c, null).total;
      }
      return { oculto: false as const, r: { ...cartaoDeIndicador(m.linhas as any, c.indicador, c, ant), primeiraLeitura: m.primeiraLeitura, cobertura: Object.values(m.cobertura).some(s => s !== "confirmado") ? "parcial" : "confirmado" } };
    }
    const { agregarCartao } = await import("@/lib/graficos");
    return { oculto: false as const, r: agregarCartao(cat.base, c, p, data.filtrosVisao as any, cat.catalogo) };
  });

/** Grava a lista de cartões de uma visão (ordem incluída). Só super admin. Remover cartão não apaga dado. */
export const salvarCartoesVisao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), visaoId: z.string().uuid(), cartoes: z.array(cartaoSchema).max(40) }).parse(i))
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
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), de: z.string().uuid(), para: z.string().uuid(), cartaoId: z.string().min(1) }).parse(i))
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
  const { data: v, error } = await db.from("elora_dashboard_visoes").select("filtros").eq("id", visaoId).eq("cliente_id", clienteId).maybeSingle();
  if (error) throw new Error(`visoes: ${error.message}`);
  if (!v) throw new Error("visão não encontrada.");
  return cartoesValidos(v.filtros?.cartoes);
}
async function gravar(db: any, clienteId: string, visaoId: string, cartoes: CartaoGrafico[]) {
  const { data: v, error } = await db.from("elora_dashboard_visoes").select("filtros").eq("id", visaoId).eq("cliente_id", clienteId).maybeSingle();
  if (error) throw new Error(`visoes: ${error.message}`);
  if (!v) throw new Error("visão não encontrada.");
  const { error: e2 } = await db.from("elora_dashboard_visoes").update({ filtros: { ...(v.filtros ?? {}), cartoes } }).eq("id", visaoId).eq("cliente_id", clienteId);
  if (e2) throw new Error(`visoes: ${e2.message}`);
}
