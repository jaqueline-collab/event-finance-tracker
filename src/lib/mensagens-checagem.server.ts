/**
 * Conferência com o Elora App (amplia a antiga checagem semanal de mensagens):
 * por dia dos últimos 7 (Brasília), compara atendimentos, contatos e cards criados
 * com o total direto no Elora (filtro de data, só contando) e confere mensagens por
 * amostra de conversas. Só lê o Elora; nunca grava no espelho. Retomável em rodadas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { chamarElora, itensDe, mapMensagem, mensagensDoPeriodo, PAGE_SIZE, STATUS_CONTATO, type Contexto } from "./elora-espelho.server";
import { STATUS_CARDS } from "./elora-cards.server";
import { diaSP } from "./painel-visual";
import { diasConferencia, ETAPAS_CONFERENCIA, limitesDia, ROTULO_ETAPA, diaSPDe, type LinhaConferencia } from "./conferencia";

const AMOSTRA_POR_DIA = 4;
const VALIDADE_EM_ANDAMENTO_MS = 60 * 60_000;
type Cursor = { dias?: string[]; i?: number; etapa?: number; parte?: number; parcial?: number };

/** Total de uma lista do Elora: usa totalItems; sem ele, percorre só contando. */
async function contarElora(ctx: Contexto, caminho: string): Promise<number> {
  const sep = caminho.includes("?") ? "&" : "?";
  const r = await chamarElora(ctx, `${caminho}${sep}PageSize=1&PageNumber=1`);
  if (typeof r?.totalItems === "number") return r.totalItems;
  let n = 0;
  for (let p = 1; p < 500; p++) {
    const j = await chamarElora(ctx, `${caminho}${sep}PageSize=${PAGE_SIZE}&PageNumber=${p}`);
    const it = itensDe(j);
    n += it.length;
    if (!j?.hasMorePages || !it.length) break;
  }
  return n;
}
const filtro = (de: string, ate: string) => `CreatedAt.After=${encodeURIComponent(de)}&CreatedAt.Before=${encodeURIComponent(ate)}`;

async function contarNosso(db: SupabaseClient, tabela: string, clienteId: string, de: string, ate: string) {
  const { count, error } = await (db as any).from(tabela).select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).gte("criado_em", de).lt("criado_em", ate);
  if (error) throw new Error(`${tabela}: ${error.message}`);
  return count ?? 0;
}

export async function ultimaConferencia(db: SupabaseClient, clienteId: string) {
  const { data } = await (db as any).from("elora_conferencias").select("*").eq("cliente_id", clienteId).order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  return data as any;
}
export async function ultimaConcluida(db: SupabaseClient, clienteId: string) {
  const { data } = await (db as any).from("elora_conferencias").select("*").eq("cliente_id", clienteId).eq("situacao", "concluida").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  return data as any;
}

/** Roda (ou continua) a conferência do cliente até concluir ou acabar o prazo. */
export async function conferirCliente(db: SupabaseClient, clienteId: string, ctx: Contexto, prazoMs = 20_000, origem = "manual", nDias?: number) {
  const inicio = Date.now();
  let conf = await ultimaConferencia(db, clienteId);
  if (!conf || conf.situacao !== "conferindo" || Date.now() - Date.parse(conf.updated_at) > VALIDADE_EM_ANDAMENTO_MS) {
    const dias = diasConferencia(Date.now(), nDias);
    const { data, error } = await (db as any).from("elora_conferencias").insert({ cliente_id: clienteId, origem, cursor: { dias, i: 0, etapa: 0 }, linhas: dias.map((dia) => ({ dia })), progresso: "Começando" }).select("*").single();
    if (error) throw new Error(`elora_conferencias: ${error.message}`);
    conf = data;
  }
  const cursor: Cursor = conf.cursor ?? {};
  const linhas: LinhaConferencia[] = conf.linhas ?? [];
  const dias = cursor.dias!;
  let paineis: string[] | null = null;
  const salvar = async (extra: Record<string, unknown> = {}) => {
    const { error } = await (db as any).from("elora_conferencias").update({ cursor, linhas, ...extra }).eq("id", conf.id);
    if (error) throw new Error(`elora_conferencias: ${error.message}`);
  };
  const total = dias.length * ETAPAS_CONFERENCIA.length;
  while (cursor.i! < dias.length) {
    if (Date.now() - inicio > prazoMs) {
      await salvar();
      return { id: conf.id, concluida: false };
    }
    const dia = dias[cursor.i!];
    const { de, ate } = limitesDia(dia);
    const etapa = ETAPAS_CONFERENCIA[cursor.etapa!];
    const linha = linhas[cursor.i!];
    const passo = cursor.i! * ETAPAS_CONFERENCIA.length + cursor.etapa! + 1;
    const progresso = `${dia.slice(8, 10)}/${dia.slice(5, 7)} · ${ROTULO_ETAPA[etapa]} (${passo} de ${total})`;
    if (etapa === "atendimentos") {
      linha.atendimentos = { nosso: await contarNosso(db, "elora_atendimentos_espelho", clienteId, de, ate), elora: await contarElora(ctx, `/chat/v2/session?${filtro(de, ate)}`) };
    } else if (etapa === "contatos") {
      let e = 0;
      for (const st of STATUS_CONTATO) e += await contarElora(ctx, `/core/v1/contact?Status=${st}&${filtro(de, ate)}`);
      linha.contatos = { nosso: await contarNosso(db, "elora_contatos_espelho", clienteId, de, ate), elora: e };
    } else if (etapa === "cards") {
      if (!paineis) {
        const { data } = await (db as any).from("elora_apoio_espelho").select("externo_id").eq("cliente_id", clienteId).eq("tipo", "painel");
        paineis = (data ?? []).map((p: any) => String(p.externo_id));
      }
      // Sem Statuses a API devolve só abertos: soma abertos, ganhos, perdidos e arquivados.
      let e = 0;
      for (const p of paineis!) for (const st of STATUS_CARDS) e += await contarElora(ctx, `/crm/v2/panel/card?PanelId=${p}${st ? `&Statuses=${st}` : ""}&${filtro(de, ate)}`);
      linha.cards = { nosso: await contarNosso(db, "elora_cards_espelho", clienteId, de, ate), elora: e };
    } else {
      linha.mensagens = await amostraMensagens(db, clienteId, ctx, dia, de, ate);
    }
    if (cursor.etapa! < ETAPAS_CONFERENCIA.length - 1) cursor.etapa = cursor.etapa! + 1;
    else { cursor.i = cursor.i! + 1; cursor.etapa = 0; }
    await salvar({ progresso });
  }
  await salvar({ situacao: "concluida", concluido_em: new Date().toISOString(), progresso: null });
  return { id: conf.id, concluida: true };
}

async function amostraMensagens(db: SupabaseClient, clienteId: string, ctx: Contexto, dia: string, de: string, ate: string) {
  const ms = await mensagensDoPeriodo(db, clienteId, de, ate);
  const porSessao = new Map<string, number>();
  for (const m of ms) if (diaSP(m.enviada_em) === dia) porSessao.set(String(m.sessao_id), (porSessao.get(String(m.sessao_id)) ?? 0) + 1);
  const ids = [...porSessao.keys()].sort(() => Math.random() - 0.5).slice(0, AMOSTRA_POR_DIA);
  let bateram = 0, andamento = 0;
  const ehHoje = dia === diaSPDe(Date.now());
  for (const sid of ids) {
    let n = 0;
    for (let p = 1; p < 50; p++) {
      const j = await chamarElora(ctx, `/chat/v1/message?SessionId=${sid}&PageNumber=${p}&PageSize=${PAGE_SIZE}`);
      const itens = itensDe(j);
      n += itens.filter((m) => diaSP(mapMensagem(clienteId, m, sid).enviada_em) === dia).length;
      if (!j?.hasMorePages || !itens.length) break;
    }
    const d = Math.abs(n - (porSessao.get(sid) ?? 0));
    if (d === 0) bateram++;
    else if (ehHoje && d <= 1) andamento++;
  }
  return { amostra: ids.length, bateram, andamento };
}
