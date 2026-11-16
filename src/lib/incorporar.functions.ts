import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filtroCampoSchema } from "@/lib/campos-elora";
import { cartaoSchema } from "@/lib/graficos";

/**
 * Link de painel incorporado. Gerar, revogar e listar: só super admin (is_admin, conferido aqui).
 * Ler e calcular pelo link: sem login; o token é validado (hash, não revogado) a cada chamada e
 * só a visão e o cliente do link são lidos. Respostas sem cache compartilhado.
 */

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const token = z.string().regex(/^[A-Za-z0-9_-]{40,64}$/);

async function exigirSuperAdmin(db: any) {
  const { data } = await db.rpc("is_admin");
  if (!data) throw new Error("acesso-negado: só a super admin.");
}

export const listarLinksIncorporados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }): Promise<{ visoes: { id: string; nome: string }[]; links: { id: string; visaoId: string; dadosPessoais: boolean; criadoEm: string; ultimoAcessoEm: string | null }[] }> => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: vs, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
      db.from("elora_dashboard_visoes").select("id, nome, ordem, publicada").eq("cliente_id", data.clienteId).order("ordem"),
      db.from("elora_paineis_incorporados").select("id, visao_id, dados_pessoais, criado_em, revogado_em, ultimo_acesso_em").eq("cliente_id", data.clienteId).is("revogado_em", null),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2).message);
    return {
      visoes: (vs ?? []).filter((v: any) => v.publicada).map((v: any) => ({ id: String(v.id), nome: String(v.nome) })),
      links: (ls ?? []).map((l: any) => ({ id: String(l.id), visaoId: String(l.visao_id), dadosPessoais: Boolean(l.dados_pessoais), criadoEm: String(l.criado_em), ultimoAcessoEm: l.ultimo_acesso_em ? String(l.ultimo_acesso_em) : null })),
    };
  });

/** Gera link novo para a visão (o anterior dela é revogado na hora). O token só volta nesta resposta. */
export const gerarLinkIncorporado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), visaoId: z.string().uuid(), dadosPessoais: z.boolean().default(false) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { novoToken, hashToken } = await import("@/lib/incorporar");
    const db = supabaseAdmin as any;
    const { data: v } = await db.from("elora_dashboard_visoes").select("id, publicada").eq("id", data.visaoId).eq("cliente_id", data.clienteId).maybeSingle();
    if (!v?.publicada) throw new Error("Visão não encontrada ou ainda em rascunho.");
    const agora = new Date().toISOString();
    const { error: er } = await db.from("elora_paineis_incorporados").update({ revogado_em: agora }).eq("cliente_id", data.clienteId).eq("visao_id", data.visaoId).is("revogado_em", null);
    if (er) throw new Error(er.message);
    const t = novoToken();
    const { error } = await db.from("elora_paineis_incorporados").insert({ cliente_id: data.clienteId, visao_id: data.visaoId, token_hash: await hashToken(t), dados_pessoais: data.dadosPessoais, criado_por: context.userId });
    if (error) throw new Error(error.message);
    return { token: t };
  });

export const revogarLinkIncorporado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_paineis_incorporados").update({ revogado_em: new Date().toISOString() }).eq("id", data.id).eq("cliente_id", data.clienteId).is("revogado_em", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Liga/desliga tabelas com nome de paciente ou contato num link já gerado (sem trocar o link). */
export const alterarDadosPessoaisLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), id: z.string().uuid(), dadosPessoais: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { error } = await db.from("elora_paineis_incorporados").update({ dados_pessoais: data.dadosPessoais }).eq("id", data.id).eq("cliente_id", data.clienteId).is("revogado_em", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Pelo link (sem login) ---------------- */

/** Link válido → cliente, visão e blocos que o link pode mostrar. Inválido ou revogado → null. */
async function abrirLink(t: string, registrarAcesso: boolean) {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { hashToken, cartoesDoLink } = await import("@/lib/incorporar");
  const { cartoesValidos } = await import("@/lib/graficos");
  const { filtrosFixosValidos } = await import("@/lib/filtros-fixos");
  const db = supabaseAdmin as any;
  const { data: l } = await db.from("elora_paineis_incorporados").select("id, cliente_id, visao_id, dados_pessoais").eq("token_hash", await hashToken(t)).is("revogado_em", null).maybeSingle();
  if (!l) return null;
  const { data: v } = await db.from("elora_dashboard_visoes").select("id, nome, publicada, filtros").eq("id", l.visao_id).eq("cliente_id", l.cliente_id).maybeSingle();
  if (!v?.publicada) return null;
  if (registrarAcesso) await db.from("elora_paineis_incorporados").update({ ultimo_acesso_em: new Date().toISOString() }).eq("id", l.id);
  const ocultos = Array.isArray(v.filtros?.cartoesOcultos) ? v.filtros.cartoesOcultos.map(String) : [];
  return {
    db,
    clienteId: String(l.cliente_id),
    visaoNome: String(v.nome),
    cartoes: cartoesDoLink(cartoesValidos(v.filtros?.cartoes), ocultos, Boolean(l.dados_pessoais)),
    fixos: filtrosFixosValidos(v.filtros?.filtrosFixos),
    padrao: filtrosFixosValidos(v.filtros?.filtrosPadrao),
  };
}

const INVALIDO = { valido: false as const };

export const lerPainelIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token }).parse(i))
  .handler(async ({ data }) => {
    const l = await abrirLink(data.token, true);
    if (!l) return INVALIDO;
    const { data: c } = await l.db.from("elora_clientes").select("nome").eq("id", l.clienteId).maybeSingle();
    return { valido: true as const, nomeCliente: String(c?.nome ?? ""), nomeVisao: l.visaoNome, cartoes: l.cartoes, filtrosPadrao: l.padrao };
  });

export const calcularPainelIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, de: dia, ate: dia, cartoes: z.array(cartaoSchema).min(1).max(40), filtrosVisao: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data }) => {
    const l = await abrirLink(data.token, false);
    if (!l) throw new Error("link-invalido: este link foi revogado ou não existe.");
    const { cartaoPedido } = await import("@/lib/incorporar");
    const { calcularCartoesServidor } = await import("@/lib/cartao-calculo.server");
    const gravados = new Map(l.cartoes.map((c) => [c.id, c]));
    const cartoes = data.cartoes.filter((c) => gravados.has(c.id)).map((c) => cartaoPedido(gravados.get(c.id)!, c));
    if (!cartoes.length) return {};
    // Mesmo cálculo e cache do painel normal (chave já inclui o cliente); quem vê é o próprio cliente.
    return calcularCartoesServidor(l.db, { clienteId: l.clienteId, de: data.de, ate: data.ate, filtrosVisao: [...l.fixos, ...data.filtrosVisao] }, cartoes, { semDinheiro: false }, { usarCache: true });
  });

export const itensDiaIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, dia, cartao: cartaoSchema, filtrosVisao: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data }) => {
    const l = await abrirLink(data.token, false);
    if (!l) throw new Error("link-invalido: este link foi revogado ou não existe.");
    const gravado = l.cartoes.find((c) => c.id === data.cartao.id);
    // Calendário só existe no link quando a super admin liberou dados pessoais.
    if (!gravado || gravado.tipo !== "calendario" || gravado.medida === "indicador") return { itens: [] };
    const { cartaoPedido } = await import("@/lib/incorporar");
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const { itensDoDia } = await import("@/lib/graficos");
    const cat = await catalogoDoCliente(l.db, l.clienteId);
    return { itens: itensDoDia(cat.base, cartaoPedido(gravado, data.cartao), data.dia, [...l.fixos, ...data.filtrosVisao] as any, false) };
  });
