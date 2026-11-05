/**
 * Cards do Elora (somente servidor): espelho + histórico de leituras.
 * A API não guarda histórico de etapas, então cada leitura que muda etapa,
 * status ou campos vira uma linha em elora_cards_historico. A primeira
 * leitura de um card é "estimado" (dia = última atualização do card).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { assinatura, camposDaLeitura } from "./indicadores-motor";
import { chamarElora, mapContato, PAGE_SIZE, type Contexto } from "./elora-espelho.server";

/** Sem Statuses a API só devolve abertos; o filtro Status= é ignorado. */
export const STATUS_CARDS: (string | null)[] = [null, "WON", "LOST", "ARCHIVED"];
const DETALHES = ["PanelTitle", "StepTitle", "StepPhase", "ResponsibleUser", "Contacts", "CustomFields", "LostReason"];
/** Folga da leitura incremental agendada. */
export const FOLGA_MS = 60 * 60_000;

const itensDe = (j: any): any[] => (Array.isArray(j) ? j : (j?.items ?? []));

export function caminhoCards(painelId: string, status: string | null, pagina: number, desde?: string | null) {
  return (
    `/crm/v2/panel/card?PanelId=${painelId}&PageNumber=${pagina}&PageSize=${PAGE_SIZE}` +
    (status ? `&Statuses=${status}` : "") +
    DETALHES.map((d) => `&IncludeDetails=${d}`).join("") +
    (desde ? `&UpdatedAt.After=${encodeURIComponent(desde)}` : "")
  );
}

export function mapCard(clienteId: string, c: any) {
  return {
    cliente_id: clienteId,
    externo_id: String(c.id),
    painel_id: c.panelId ?? null,
    painel_titulo: c.panelTitle ?? null,
    etapa_id: c.stepId ?? null,
    etapa_titulo: c.stepTitle ?? null,
    etapa_fase: c.stepPhase ?? null,
    status: c.status ?? null,
    contato_ids: Array.isArray(c.contactIds) ? c.contactIds.map(String) : [],
    criado_em: c.createdAt ?? null,
    atualizado_em: c.updatedAt ?? null,
    payload: c,
    sincronizado_em: new Date().toISOString(),
  };
}

/** Grava uma leitura nova para cada card cuja etapa, status ou campos mudaram. */
export async function registrarLeituras(db: SupabaseClient, clienteId: string, cards: any[], agora = new Date().toISOString()) {
  if (!cards.length) return 0;
  const ids = cards.map((c) => String(c.id));
  const contatoIds = [...new Set(cards.flatMap((c) => (c.contactIds ?? []).slice(0, 1).map(String)))];
  const contatos = new Map<string, any>();
  for (let i = 0; i < contatoIds.length; i += 200) {
    const { data, error } = await db
      .from("elora_contatos_espelho")
      .select("externo_id, utm_campaign, utm_source, utm_medium, origem, payload")
      .eq("cliente_id", clienteId)
      .in("externo_id", contatoIds.slice(i, i + 200));
    if (error) throw new Error(`elora_contatos_espelho: ${error.message}`);
    for (const c of data ?? []) contatos.set(String(c.externo_id), c);
  }
  const ultimo = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db
      .from("elora_cards_historico")
      .select("card_id, hash, visto_em")
      .eq("cliente_id", clienteId)
      .in("card_id", ids.slice(i, i + 200))
      .order("visto_em", { ascending: true });
    if (error) throw new Error(`elora_cards_historico: ${error.message}`);
    for (const h of data ?? []) ultimo.set(String(h.card_id), String(h.hash));
  }
  const novas: any[] = [];
  for (const c of cards) {
    const contato = contatos.get(String((c.contactIds ?? [])[0] ?? "")) ?? null;
    const campos = camposDaLeitura(c, contato);
    const linha = { etapa_id: c.stepId ?? null, status: c.status ?? null, campos };
    const hash = assinatura(linha);
    const anterior = ultimo.get(String(c.id));
    if (anterior === hash) continue;
    const primeira = anterior === undefined;
    novas.push({
      cliente_id: clienteId,
      card_id: String(c.id),
      visto_em: primeira ? (c.updatedAt ?? c.createdAt ?? agora) : agora,
      estimado: primeira,
      painel_id: c.panelId ?? null,
      etapa_id: c.stepId ?? null,
      etapa_titulo: c.stepTitle ?? null,
      etapa_fase: c.stepPhase ?? null,
      status: c.status ?? null,
      campos,
      hash,
    });
  }
  for (let i = 0; i < novas.length; i += 500) {
    const { error } = await db.from("elora_cards_historico").insert(novas.slice(i, i + 500));
    if (error) throw new Error(`elora_cards_historico: ${error.message}`);
  }
  return novas.length;
}

type CursorCards = { painel?: number; status?: number; pagina?: number; desde?: string | null; paineis?: string[] };

/**
 * Lê cards de todos os painéis × status (abertos, WON, LOST, ARCHIVED).
 * Retoma pelo cursor em elora_sync_estado (fonte "cards"). Carga já
 * concluída vira incremental: UpdatedAt.After = última conclusão − 1 h.
 */
export async function sincronizarCards(db: SupabaseClient, clienteId: string, ctx: Contexto, prazoMs = 45_000) {
  const inicio = Date.now();
  const { data: est } = await db.from("elora_sync_estado").select("*").eq("cliente_id", clienteId).eq("fonte", "cards").maybeSingle();
  let cursor: CursorCards = (est?.cursor as CursorCards) ?? {};
  if (!cursor.paineis) {
    const desde = est?.concluido_em ? new Date(new Date(est.concluido_em).getTime() - FOLGA_MS).toISOString() : null;
    const j = await chamarElora(ctx, `/crm/v2/panel?PageNumber=1&PageSize=${PAGE_SIZE}`);
    cursor = { painel: 0, status: 0, pagina: 1, desde, paineis: itensDe(j).map((p: any) => String(p.id)) };
  }
  let registros = cursor.painel === 0 && cursor.status === 0 && cursor.pagina === 1 ? 0 : Number(est?.registros ?? 0);
  let leituras = 0;
  const salvar = async (concluido: boolean) => {
    const { error } = await db.from("elora_sync_estado").upsert(
      {
        cliente_id: clienteId,
        fonte: "cards",
        cursor: concluido ? {} : cursor,
        chamadas: Number(est?.chamadas ?? 0) + ctx.chamadas,
        retentativas: Number(est?.retentativas ?? 0) + ctx.retentativas,
        erros: [...((est?.erros as string[]) ?? []), ...ctx.erros].slice(-50),
        registros,
        iniciado_em: est?.iniciado_em ?? new Date().toISOString(),
        concluido_em: concluido ? new Date().toISOString() : (est?.concluido_em ?? null),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "cliente_id,fonte" },
    );
    if (error) throw new Error(`elora_sync_estado: ${error.message}`);
  };
  const desdeContatos = cursor.desde;
  try {
    while (cursor.painel! < cursor.paineis!.length) {
      if (Date.now() - inicio > prazoMs) {
        await salvar(false);
        return { concluido: false, registros, leituras };
      }
      const resp = await chamarElora(ctx, caminhoCards(cursor.paineis![cursor.painel!], STATUS_CARDS[cursor.status!], cursor.pagina!, cursor.desde));
      const itens = itensDe(resp);
      if (itens.length) {
        const { error } = await db.from("elora_cards_espelho").upsert(itens.map((c) => mapCard(clienteId, c)), { onConflict: "cliente_id,externo_id" });
        if (error) throw new Error(`elora_cards_espelho: ${error.message}`);
        leituras += await registrarLeituras(db, clienteId, itens);
      }
      registros += itens.length;
      if (resp?.hasMorePages && itens.length) cursor.pagina = cursor.pagina! + 1;
      else if (cursor.status! < STATUS_CARDS.length - 1) {
        cursor.status = cursor.status! + 1;
        cursor.pagina = 1;
      } else {
        cursor.painel = cursor.painel! + 1;
        cursor.status = 0;
        cursor.pagina = 1;
      }
      await salvar(false);
    }
    // Incremental: contatos alterados podem mudar condições (ex.: campo preenchido) sem mexer no card.
    if (desdeContatos) leituras += await releituraPorContatos(db, clienteId, ctx, desdeContatos);
    await salvar(true);
    return { concluido: true, registros, leituras };
  } catch (e) {
    await salvar(false);
    throw e;
  }
}

async function releituraPorContatos(db: SupabaseClient, clienteId: string, ctx: Contexto, desde: string) {
  const alterados: string[] = [];
  for (let p = 1; p <= 50; p++) {
    const j = await chamarElora(
      ctx,
      `/core/v1/contact?PageNumber=${p}&PageSize=${PAGE_SIZE}&IncludeDetails=Tags&IncludeDetails=CustomFields&IncludeDetails=Portfolios&UpdatedAt.After=${encodeURIComponent(desde)}`,
    );
    const itens = itensDe(j);
    if (itens.length) {
      const { error } = await db.from("elora_contatos_espelho").upsert(itens.map((c) => mapContato(clienteId, c)), { onConflict: "cliente_id,externo_id" });
      if (error) throw new Error(`elora_contatos_espelho: ${error.message}`);
      alterados.push(...itens.map((c) => String(c.id)));
    }
    if (!j?.hasMorePages || !itens.length) break;
  }
  if (!alterados.length) return 0;
  const { data, error } = await db.from("elora_cards_espelho").select("payload").eq("cliente_id", clienteId).overlaps("contato_ids", alterados);
  if (error) throw new Error(`elora_cards_espelho: ${error.message}`);
  return registrarLeituras(db, clienteId, (data ?? []).map((r: any) => r.payload));
}

/** Monta o contexto de chamada do Elora com a chave do cofre. */
export async function contextoElora(db: SupabaseClient, clienteId: string): Promise<Contexto | null> {
  const { obterChaveElora } = await import("./credenciais.server");
  const chave = await obterChaveElora(clienteId);
  const { data: conta } = await db.from("elora_integracao_contas").select("base_url").eq("cliente_id", clienteId).maybeSingle();
  if (!chave || !conta?.base_url) return null;
  const base = String(conta.base_url).replace(/\/+$/, "").replace(/\/(core|crm|chat)$/i, "");
  return { base, chave, chamadas: 0, retentativas: 0, erros: [] };
}
