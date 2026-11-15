import { exibirCanal } from "./nome-canal";
/** Leitura do espelho para o catálogo "Campos do Elora" e filtros (somente servidor). Nunca lê texto de mensagens. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NAO_DEFINIDO } from "./nao-definido";
import type { AjusteCampo, BaseCampos } from "./campos-elora";

import { lerTudo } from "./ler-paginas.server";

const cache = new Map<string, { em: number; chave: string | null; base: BaseCampos }>();

/** Versão da sincronização + versão de configuração (mesma chave do cache de cálculo). */
async function versaoCampos(db: SupabaseClient, clienteId: string): Promise<string> {
  const { data, error } = await (db as any).rpc("elora_versoes_cache", { _cliente_id: clienteId });
  if (error) throw new Error(`versoes: ${error.message}`);
  return JSON.stringify(data);
}

/** Tudo que o catálogo e os filtros precisam, por cliente. Cache por cliente, renovado a cada sincronização ou mudança de configuração. */
export async function lerBaseCampos(db: SupabaseClient, clienteId: string): Promise<BaseCampos> {
  const chave = await versaoCampos(db, clienteId);
  const c = cache.get(clienteId);
  if (c && c.chave === chave && Date.now() - c.em < 300_000) return c.base;
  // Cache no banco (compactado), mesma chave de versões: vale para qualquer servidor.
  const chaveDb = await hashTexto(`base-campos|${clienteId}|${chave}`);
  const { data: achado } = await (db as any).from("elora_calculo_cache").select("valor").eq("chave", chaveDb).gte("criado_em", new Date(Date.now() - 300_000).toISOString()).maybeSingle();
  if (achado?.valor?.gz) {
    try {
      const base = JSON.parse(await descompactar(achado.valor.gz)) as BaseCampos;
      cache.set(clienteId, { em: Date.now(), chave, base });
      return base;
    } catch (e) { console.error("cache de campos ilegível", e); }
  }
  const base = await montarBaseCampos(db, clienteId);
  cache.set(clienteId, { em: Date.now(), chave, base });
  // gravação em segundo plano: não atrasa a abertura
  void compactar(JSON.stringify(base))
    .then((gz) => (db as any).from("elora_calculo_cache").upsert({ chave: chaveDb, cliente_id: clienteId, valor: { gz }, criado_em: new Date().toISOString() }, { onConflict: "chave" }))
    .then((r: any) => r?.error && console.error("cache de campos: gravação falhou", r.error.message))
    .catch((e: unknown) => console.error("cache de campos: gravação falhou", e));
  return base;
}

async function hashTexto(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function compactar(t: string): Promise<string> {
  const buf = new Uint8Array(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
async function descompactar(b64: string): Promise<string> {
  const bin = atob(b64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

async function montarBaseCampos(db: SupabaseClient, clienteId: string): Promise<BaseCampos> {
  const d = db as any;
  const [apoio, contatos, atend, cards, classif, corte] = await Promise.all([
    lerTudo(() => d.from("elora_apoio_espelho").select("tipo, externo_id, nome, payload").eq("cliente_id", clienteId).in("tipo", ["campo", "canal", "usuario"]).order("externo_id")),
    lerTudo(() =>
      d.from("elora_contatos_espelho").select("externo_id, nome, telefone, status, etiquetas, origem, utm_source, utm_medium, utm_campaign, criado_em, cf:payload->customFields, utm:payload->utm").eq("cliente_id", clienteId).order("externo_id"),
    12),
    lerTudo(() =>
      d.from("elora_atendimentos_espelho").select("externo_id, contato_id, canal_id, canal_nome, atendente_id, atendente_nome, status, classificacao, criado_em, time_wait_segundos, time_service_segundos").eq("cliente_id", clienteId).order("externo_id"),
    8),
    lerTudo(() =>
      d.from("elora_cards_espelho").select("externo_id, contato_ids, painel_id:payload->>panelId, painel_titulo, etapa_titulo, etapa_fase, status, criado_em, atualizado_em, valor:payload->monetaryAmount, cf:payload->customFields").eq("cliente_id", clienteId).order("externo_id"),
    8),
    lerTudo(() => d.from("elora_conversas_classificadas").select("sessao_id, category_name").eq("cliente_id", clienteId).order("id"), 8),
    d.from("elora_relatorio_corte_config").select("equipe_por_canal, coluna_status").eq("cliente_id", clienteId).maybeSingle(),
  ]);
  const { data: paineis } = await d.from("elora_paineis_sincronizados").select("painel_id, etapas").eq("cliente_id", clienteId);
  const mapaCanais = await (await import("./nome-canal.server")).lerMapaCanais(d, clienteId);
  const canal: Record<string, string> = {};
  const usuario: Record<string, string> = {};
  const definicoes: BaseCampos["definicoes"] = [];
  for (const a of apoio) {
    if (a.tipo === "canal") canal[a.externo_id] = a.payload?.identity?.humanId ?? a.nome ?? a.externo_id;
    else if (a.tipo === "usuario") usuario[a.externo_id] = a.nome ?? "";
    else if (a.payload?.key) definicoes.push({ key: a.payload.key, name: a.payload.name, type: a.payload.type, entityType: a.payload.entityType, options: a.payload.options });
  }
  const equipe: Record<string, string> = corte?.data?.equipe_por_canal ?? {};
  const cls = new Map(classif.map((x: any) => [String(x.sessao_id), x.category_name as string | null]));
  const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  const base: BaseCampos = {
    definicoes,
    contatos: contatos.map((x: any) => ({
      id: String(x.externo_id), nome: x.nome, telefone: x.telefone, status: x.status, etiquetas: Array.isArray(x.etiquetas) ? x.etiquetas.map(String) : [],
      origem: x.origem, utm_source: x.utm_source, utm_medium: x.utm_medium, utm_campaign: x.utm_campaign, criado_em: x.criado_em, cf: obj(x.cf), utm: obj(x.utm),
    })),
    atendimentos: atend.map((x: any) => ({
      id: String(x.externo_id), contato_id: x.contato_id ? String(x.contato_id) : null,
      canal: exibirCanal(mapaCanais, x.canal_id, x.canal_nome || canal[x.canal_id]) || NAO_DEFINIDO,
      atendente: x.atendente_nome || usuario[x.atendente_id] || null,
      equipe: (x.canal_id && equipe[x.canal_id]) || null,
      classificacao: cls.get(String(x.externo_id)) ?? x.classificacao ?? null,
      status: x.status, criado_em: x.criado_em, tempo_espera: x.time_wait_segundos, tempo_atendimento: x.time_service_segundos,
    })),
    cards: cards.map((x: any) => ({
      id: String(x.externo_id), contato_ids: Array.isArray(x.contato_ids) ? x.contato_ids.map(String) : [],
      painel: x.painel_titulo, painel_id: x.painel_id ?? null, etapa: x.etapa_titulo, fase: x.etapa_fase, status: x.status,
      valor: x.valor == null ? null : Number(x.valor), criado_em: x.criado_em, atualizado_em: x.atualizado_em, cf: obj(x.cf),
    })),
  };
  // Coluna "Status do lead": origem escolhida por cliente; sem origem, a coluna não existe (fica oculta).
  const { colunaStatusValida, resolverStatusLead, rotuloStatus } = await import("./status-lead");
  const cfgStatus = colunaStatusValida(corte?.data?.coluna_status);
  const etapasDe = (id: string) => ((paineis ?? []).find((p: any) => p.painel_id === id)?.etapas ?? []).map((e: any) => String(e.nome));
  const todasEtapas = [...new Set((paineis ?? []).flatMap((p: any) => (p.etapas ?? []).map((e: any) => String(e.nome))))] as string[];
  base.ordens = { "card|etapa": todasEtapas };
  if (cfgStatus) {
    resolverStatusLead(base.contatos, base.cards, cfgStatus);
    base.rotuloStatus = rotuloStatus(cfgStatus);
    if (cfgStatus.fonte === "card" && cfgStatus.campo === "etapa" && cfgStatus.funilId) {
      const o = etapasDe(cfgStatus.funilId);
      base.ordens["contato|status_lead"] = o;
      base.ordens["card|status_lead"] = o;
    }
  }
  return base;
}

export async function lerAjustesCampos(db: SupabaseClient, clienteId: string): Promise<AjusteCampo[]> {
  const { data, error } = await (db as any).from("elora_campos_ajustes").select("fonte, campo, rotulo, oculto").eq("cliente_id", clienteId);
  if (error) throw new Error(`elora_campos_ajustes: ${error.message}`);
  return (data ?? []) as AjusteCampo[];
}

export async function catalogoDoCliente(db: SupabaseClient, clienteId: string, ctx?: import("./calculo-contexto.server").Ctx): Promise<{ base: BaseCampos; catalogo: ReturnType<typeof import("./campos-elora").montarCatalogo> }> {
  if (ctx) return ctx.memo(`cat|${clienteId}`, () => catalogoDoCliente(db, clienteId));
  const { montarCatalogo } = await import("./campos-elora");
  const [base, ajustes] = await Promise.all([lerBaseCampos(db, clienteId), lerAjustesCampos(db, clienteId)]);
  return { base, catalogo: montarCatalogo(base, ajustes) };
}
