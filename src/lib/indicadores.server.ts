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
  catalogoCampos,
  type IndicadorConfig,
  type Leitura,
} from "./indicadores-motor";

async function lerTudo(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export async function lerConfig(db: SupabaseClient, clienteId: string): Promise<IndicadorConfig[]> {
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
    configs.some((c) => c.fonte === "cards" && c.tipo === "app" && c.ativo)
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
  const erros = configs.filter((c) => c.ativo && c.tipo === "app").flatMap((c) => errosDeConfig(c).map((e) => `${c.nome}: ${e}`));
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
