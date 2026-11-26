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

type LinkInfo = { id: string; visaoId: string | null; ocultarPessoais: boolean; criadoEm: string; ultimoAcessoEm: string | null };

export const listarLinksIncorporados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }): Promise<{ visoes: { id: string; nome: string }[]; links: LinkInfo[] }> => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: vs, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
      db.from("elora_dashboard_visoes").select("id, nome, ordem, publicada").eq("cliente_id", data.clienteId).order("ordem"),
      db.from("elora_paineis_incorporados").select("id, visao_id, ocultar_pessoais, criado_em, ultimo_acesso_em").eq("cliente_id", data.clienteId).is("revogado_em", null),
    ]);
    if (e1 || e2) throw new Error((e1 ?? e2).message);
    return {
      visoes: (vs ?? []).filter((v: any) => v.publicada).map((v: any) => ({ id: String(v.id), nome: String(v.nome) })),
      links: (ls ?? []).map((l: any) => ({ id: String(l.id), visaoId: l.visao_id ? String(l.visao_id) : null, ocultarPessoais: Boolean(l.ocultar_pessoais), criadoEm: String(l.criado_em), ultimoAcessoEm: l.ultimo_acesso_em ? String(l.ultimo_acesso_em) : null })),
    };
  });

/** Gera link novo (visaoId vazio = "Todas as visões"); o anterior do mesmo alvo é revogado na hora. O token só volta nesta resposta. */
export const gerarLinkIncorporado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), visaoId: z.string().uuid().nullable(), ocultarPessoais: z.boolean().default(false) }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { novoToken, hashToken } = await import("@/lib/incorporar");
    const db = supabaseAdmin as any;
    if (data.visaoId) {
      const { data: v } = await db.from("elora_dashboard_visoes").select("id, publicada").eq("id", data.visaoId).eq("cliente_id", data.clienteId).maybeSingle();
      if (!v?.publicada) throw new Error("Visão não encontrada ou não visível ao cliente.");
    }
    let rev = db.from("elora_paineis_incorporados").update({ revogado_em: new Date().toISOString() }).eq("cliente_id", data.clienteId).is("revogado_em", null);
    rev = data.visaoId ? rev.eq("visao_id", data.visaoId) : rev.is("visao_id", null);
    const { error: er } = await rev;
    if (er) throw new Error(er.message);
    const t = novoToken();
    const { error } = await db.from("elora_paineis_incorporados").insert({ cliente_id: data.clienteId, visao_id: data.visaoId, token_hash: await hashToken(t), ocultar_pessoais: data.ocultarPessoais, criado_por: context.userId });
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

/** Liga/desliga "Ocultar dados de pacientes" num link já gerado (sem trocar o link). */
export const alterarOcultarPessoaisLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ clienteId: z.string().min(1), id: z.string().uuid(), ocultarPessoais: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await exigirSuperAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("elora_paineis_incorporados").update({ ocultar_pessoais: data.ocultarPessoais }).eq("id", data.id).eq("cliente_id", data.clienteId).is("revogado_em", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Pelo link (sem login) ---------------- */

const INVALIDO = { valido: false as const };
const abaId = z.string().min(1).max(64);
const valorDim = z.union([z.string().max(200), z.array(z.string().max(200)).max(100)]).optional();

async function admin() {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const lerPainelIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, formato: z.enum(["query", "hash"]).optional() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { abrirLink } = await import("@/lib/incorporar.server");
    const l = await abrirLink(db, data.token, true);
    if (!l) {
      console.warn("[incorporado] recusado", { formato: data.formato ?? "desconhecido", motivo: "desativado" });
      return INVALIDO;
    }
    const { data: c } = await db.from("elora_clientes").select("nome").eq("id", l.clienteId).maybeSingle();
    return { valido: true as const, nomeCliente: String(c?.nome ?? ""), abas: l.abas.map((a) => ({ id: a.id, nome: a.nome, matriz: a.matriz, cartoes: a.cartoes, filtrosPadrao: a.padrao })) };
  });

/** Registra no servidor apenas o formato e o motivo de uma recusa local (sem nunca receber ou gravar o código). */
export const registrarRecusaIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ formato: z.enum(["query", "hash", "nenhum"]), motivo: z.enum(["ausente", "cortado"]) }).parse(i))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    console.warn("[incorporado] recusado", { formato: data.formato, motivo: data.motivo });
    return { ok: true };
  });

export const calcularPainelIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, abaId, de: dia, ate: dia, cartoes: z.array(cartaoSchema).min(1).max(40), filtrosVisao: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { calcularPeloLink } = await import("@/lib/incorporar.server");
    return calcularPeloLink(db, data.token, data as any);
  });

export const itensDiaIncorporado = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, abaId, dia, cartao: cartaoSchema, filtrosVisao: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { itensDiaPeloLink } = await import("@/lib/incorporar.server");
    return itensDiaPeloLink(db, data.token, data as any);
  });

export const matrizIncorporada = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token, de: dia, ate: dia, filtros: z.object({ canal: valorDim, atendente: valorDim, equipe: valorDim }).default({}), campos: z.array(filtroCampoSchema).max(20).default([]) }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { matrizPeloLink } = await import("@/lib/incorporar.server");
    return matrizPeloLink(db, data.token, data as any);
  });
