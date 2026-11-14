/** Leitura do banco para o motor do relatório diário (somente servidor). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { limitesUtc, listaDias, type Periodo } from "./painel-visual";
import { lerMensagensSemTexto } from "./elora-espelho.server";
import {
  calcularIndicadoresCards,
  calcularPadrao,
  colunasDoCliente,
  COLUNAS_PADRAO,
  montarRelatorio,
  errosDeConfig,
  ehCombinadaDeCard,
  catalogoCampos,
  type IndicadorConfig,
  type Leitura,
} from "./indicadores-motor";

import { lerTudo } from "./ler-paginas.server";

export async function lerConfig(db: SupabaseClient, clienteId: string, ctx?: import("./calculo-contexto.server").Ctx): Promise<IndicadorConfig[]> {
  if (ctx) return ctx.memo(`cfg|${clienteId}`, () => lerConfig(db, clienteId));
  const { data, error } = await db.from("elora_indicadores_config").select("*").eq("cliente_id", clienteId).order("ordem");
  if (error) throw new Error(`elora_indicadores_config: ${error.message}`);
  return (data ?? []) as any;
}

export async function calcularRelatorioCliente(db: SupabaseClient, clienteId: string, p: Periodo) {
  const { inicio, fim } = limitesUtc(p);
  const configs = await lerConfig(db, clienteId);
  const [contatos, mensagens, leituras] = await Promise.all([
    lerTudo(() =>
      db
        .from("elora_contatos_espelho")
        .select("criado_em, origem, utm_campaign")
        .eq("cliente_id", clienteId)
        .gte("criado_em", inicio)
        .lte("criado_em", fim)
        .order("externo_id"),
    ),
    lerMensagensSemTexto(db, clienteId, inicio, fim),
    configs.some((c) => ehCombinadaDeCard(c) && c.ativo)
      ? lerTudo(() =>
          db
            .from("elora_cards_historico")
            .select("card_id, visto_em, estimado, etapa_id, etapa_titulo, status, campos")
            .eq("cliente_id", clienteId)
            .order("id"),
        )
      : Promise.resolve([]),
  ]);
  const criados = new Map<string, string | null>();
  if (leituras.length) {
    const cards = await lerTudo(() => db.from("elora_cards_espelho").select("externo_id, criado_em").eq("cliente_id", clienteId).order("externo_id"));
    for (const c of cards) criados.set(String(c.externo_id), c.criado_em);
  }
  const ls: Leitura[] = leituras.map((l: any) => ({ ...l, card_id: String(l.card_id), criado_em: criados.get(String(l.card_id)) ?? null }));
  const m = calcularPadrao(contatos as any, mensagens);
  calcularIndicadoresCards(configs, ls, m);
  const colunas = colunasDoCliente(configs);
  const { linhas, total } = montarRelatorio(m, listaDias(p), colunas.map((c) => c.chave));
  const erros = configs.filter((c) => c.ativo && ehCombinadaDeCard(c)).flatMap((c) => errosDeConfig(c).map((e) => `${c.nome}: ${e}`));
  return { colunas, linhas, total, erros, catalogo: catalogoCampos(ls) };
}

/** Soma por dia do que o n8n já gravou (colunas padrão). */
export async function lerRelatorioExistente(db: SupabaseClient, clienteId: string, p: Periodo) {
  const { data, error } = await db
    .from("elora_relatorio_diario")
    .select("data, novos_contatos, novos_contatos_ads, conversas_total_dia, conversas_usuario, conversas_bot")
    .eq("cliente_id", clienteId)
    .gte("data", p.de)
    .lte("data", p.ate);
  if (error) throw new Error(`elora_relatorio_diario: ${error.message}`);
  const out = new Map<string, Record<string, number>>();
  for (const r of data ?? []) {
    const o = out.get(String(r.data)) ?? {};
    for (const c of COLUNAS_PADRAO) o[c.chave] = (o[c.chave] ?? 0) + Number((r as any)[c.chave] ?? 0);
    out.set(String(r.data), o);
  }
  return out;
}

/**
 * Colunas padrão por dia + canal + atendente + equipe. Tudo vem de configuração:
 * suporte interno (global), mapa de equipe e lista extra (por cliente), agentes e canais da conta.
 */
export async function calcularCorteCliente(db: SupabaseClient, clienteId: string, p: Periodo, soContatos?: Set<string>, ctx?: import("./calculo-contexto.server").Ctx) {
  const { calcularPadraoPorCorteDetalhado } = await import("./indicadores-motor");
  const { inicio, fim } = limitesUtc(p);
  const [suporte, corte, apoio, msgsRaw, contatosRaw] = await Promise.all([
    db.from("elora_suporte_interno" as any).select("nome, email"),
    db.from("elora_relatorio_corte_config" as any).select("equipe_por_canal, atendentes_ignorados").eq("cliente_id", clienteId).maybeSingle(),
    lerTudo(() => db.from("elora_apoio_espelho").select("tipo, externo_id, nome, payload").eq("cliente_id", clienteId).in("tipo", ["canal", "usuario"]).order("externo_id")),
    lerMensagensSemTexto(db, clienteId, inicio, fim, ctx),
    lerTudo(() =>
      db.from("elora_contatos_espelho").select("externo_id, criado_em, origem, utm_campaign").eq("cliente_id", clienteId).gte("criado_em", inicio).lte("criado_em", fim).order("externo_id"),
    ),
  ]);
  if (suporte.error) throw new Error(`elora_suporte_interno: ${suporte.error.message}`);
  if (corte.error) throw new Error(`elora_relatorio_corte_config: ${corte.error.message}`);
  const sids = [...new Set(msgsRaw.map((m: any) => String(m.sessao_id)))];
  const sessoes: any[] = [];
  const blocos = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, k) => xs.slice(k * n, k * n + n));
  const lotesSes = await Promise.all(
    blocos(sids, 200).map((ids) => db.from("elora_atendimentos_espelho").select("externo_id, contato_id, canal_id, canal_nome, atendente_id, atendente_nome").eq("cliente_id", clienteId).in("externo_id", ids)),
  );
  for (const { data, error } of lotesSes) {
    if (error) throw new Error(`elora_atendimentos_espelho: ${error.message}`);
    for (const s of data ?? [])
      sessoes.push({ id: String(s.externo_id), contato_id: s.contato_id, canal_id: s.canal_id, canal_nome: s.canal_nome, responsavel_id: s.atendente_id, responsavel_nome: s.atendente_nome });
  }
  // sessões de todos os contatos novos (qualquer data), para achar a primeira de cada um
  const novosIds = [...new Set((contatosRaw as any[]).map((x) => String(x.externo_id)))];
  const primeiras: any[] = [];
  const lotesPrim = await Promise.all(
    blocos(novosIds, 200).map((ids) => db.from("elora_atendimentos_espelho").select("externo_id, contato_id, canal_id, canal_nome, atendente_id, atendente_nome, criado_em").eq("cliente_id", clienteId).in("contato_id", ids)),
  );
  for (const { data, error } of lotesPrim) {
    if (error) throw new Error(`elora_atendimentos_espelho: ${error.message}`);
    for (const s of data ?? [])
      primeiras.push({ id: String(s.externo_id), contato_id: s.contato_id, canal_id: s.canal_id, canal_nome: s.canal_nome, responsavel_id: s.atendente_id, responsavel_nome: s.atendente_nome, criado_em: s.criado_em });
  }
  const nomeCanal: Record<string, string> = {};
  const agentes: Record<string, { nome: string; email?: string | null }> = {};
  for (const a of apoio as any[]) {
    if (a.tipo === "canal") nomeCanal[a.externo_id] = a.payload?.identity?.humanId ?? a.nome ?? a.externo_id;
    else agentes[a.externo_id] = { nome: a.nome ?? "", email: a.payload?.email ?? null };
  }
  if (soContatos) {
    const { restringirAContatos } = await import("./indicadores-motor");
    const r = restringirAContatos(soContatos, { sessoes, msgs: msgsRaw as any[], contatos: contatosRaw as any[], primeiras });
    sessoes.splice(0, sessoes.length, ...r.sessoes);
    msgsRaw.splice(0, msgsRaw.length, ...r.msgs);
    contatosRaw.splice(0, contatosRaw.length, ...r.contatos);
    primeiras.splice(0, primeiras.length, ...r.primeiras);
  }
  const c: any = corte.data ?? {};
  const extra = Array.isArray(c.atendentes_ignorados) ? c.atendentes_ignorados : [];
  return calcularPadraoPorCorteDetalhado(
    (contatosRaw as any[]).map((x) => ({ id: String(x.externo_id), criado_em: x.criado_em, origem: x.origem, utm_campaign: x.utm_campaign })),
    msgsRaw,
    sessoes,
    { nomeCanal, agentes, equipePorCanal: c.equipe_por_canal ?? {}, ignorar: [...((suporte.data ?? []) as any[]), ...extra] },
    primeiras,
  );
}
