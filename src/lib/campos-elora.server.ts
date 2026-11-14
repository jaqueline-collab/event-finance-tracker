import { exibirCanal } from "./nome-canal";
/** Leitura do espelho para o catálogo "Campos do Elora" e filtros (somente servidor). Nunca lê texto de mensagens. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { NAO_DEFINIDO } from "./nao-definido";
import type { AjusteCampo, BaseCampos } from "./campos-elora";

import { lerTudo } from "./ler-paginas.server";

const cache = new Map<string, { em: number; chave: string | null; base: BaseCampos }>();

async function ultimaSync(db: SupabaseClient, clienteId: string): Promise<string | null> {
  const { data } = await (db as any).from("elora_sync_estado").select("concluido_em, atualizado_em").eq("cliente_id", clienteId);
  return ((data ?? []) as any[]).map((r) => r.concluido_em ?? r.atualizado_em).filter(Boolean).sort().pop() ?? null;
}

/** Tudo que o catálogo e os filtros precisam, por cliente. Cache curto, renovado a cada sincronização. */
export async function lerBaseCampos(db: SupabaseClient, clienteId: string): Promise<BaseCampos> {
  const chave = await ultimaSync(db, clienteId);
  const c = cache.get(clienteId);
  if (c && c.chave === chave && Date.now() - c.em < 120_000) return c.base;
  const d = db as any;
  const [apoio, contatos, atend, cards, classif, corte] = await Promise.all([
    lerTudo(() => d.from("elora_apoio_espelho").select("tipo, externo_id, nome, payload").eq("cliente_id", clienteId).in("tipo", ["campo", "canal", "usuario"]).order("externo_id")),
    lerTudo(() =>
      d.from("elora_contatos_espelho").select("externo_id, nome, telefone, status, etiquetas, origem, utm_source, utm_medium, utm_campaign, criado_em, cf:payload->customFields, utm:payload->utm").eq("cliente_id", clienteId).order("externo_id"),
    12),
    lerTudo(() =>
      d.from("elora_atendimentos_espelho").select("externo_id, contato_id, canal_id, canal_nome, atendente_id, atendente_nome, status, classificacao, criado_em, time_wait_segundos, time_service_segundos").eq("cliente_id", clienteId).order("externo_id"),
    ),
    lerTudo(() =>
      d.from("elora_cards_espelho").select("externo_id, contato_ids, painel_titulo, etapa_titulo, etapa_fase, status, criado_em, atualizado_em, valor:payload->monetaryAmount, cf:payload->customFields").eq("cliente_id", clienteId).order("externo_id"),
    ),
    lerTudo(() => d.from("elora_conversas_classificadas").select("sessao_id, category_name").eq("cliente_id", clienteId).order("id")),
    d.from("elora_relatorio_corte_config").select("equipe_por_canal").eq("cliente_id", clienteId).maybeSingle(),
  ]);
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
      painel: x.painel_titulo, etapa: x.etapa_titulo, fase: x.etapa_fase, status: x.status,
      valor: x.valor == null ? null : Number(x.valor), criado_em: x.criado_em, atualizado_em: x.atualizado_em, cf: obj(x.cf),
    })),
  };
  cache.set(clienteId, { em: Date.now(), chave, base });
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
