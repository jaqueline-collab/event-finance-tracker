/**
 * Espelho completo da conta Elora de um cliente (somente servidor).
 * Traz TUDO da API: contatos (todos os status), atendimentos (todos os
 * status e canais, histórico completo) e listas de apoio. Canal não trava
 * nada; filtros são aplicados só na montagem do painel.
 * Mensagens: só estimativa aqui; o texto nunca sai do servidor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAGE_SIZE = 100;
export const PAUSA_MS = 250;
export const MAX_TENTATIVAS_429 = 5;
/** Espera crescente em 429: 15 s, 30 s, 45 s… */
export const espera429 = (tentativa: number) => 15_000 * (tentativa + 1);

export type Fonte = "apoio" | "contatos" | "atendimentos";
export const STATUS_CONTATO = ["ACTIVE", "ARCHIVED", "BLOCKED"] as const;
export const DETALHES_SESSAO = ["ClassificationDetails", "ChannelDetails", "ContactDetails", "AgentDetails"];

export type Contexto = {
  base: string;
  chave: string;
  chamadas: number;
  retentativas: number;
  erros: string[];
  dormir?: (ms: number) => Promise<void>;
  fetcher?: typeof fetch;
};

const dormirPadrao = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chamarElora(ctx: Contexto, caminho: string): Promise<any> {
  const dormir = ctx.dormir ?? dormirPadrao;
  const f = ctx.fetcher ?? fetch;
  for (let tentativa = 0; ; tentativa++) {
    await dormir(PAUSA_MS);
    ctx.chamadas += 1;
    const r = await f(ctx.base + caminho, {
      headers: { Authorization: `Bearer ${ctx.chave}`, Accept: "application/json" },
    });
    if (r.status === 429) {
      if (tentativa >= MAX_TENTATIVAS_429 - 1) {
        ctx.erros.push(`429 persistente em ${caminho.split("?")[0]}`);
        throw new Error("limite da API do Elora: carga pausada, retoma do ponto salvo.");
      }
      ctx.retentativas += 1;
      await dormir(espera429(tentativa));
      continue;
    }
    if (!r.ok) {
      const msg = `${r.status} em ${caminho.split("?")[0]}`;
      ctx.erros.push(msg);
      throw new Error(`Elora respondeu ${msg}`);
    }
    return r.json();
  }
}

const itensDe = (j: any): any[] => (Array.isArray(j) ? j : (j?.items ?? j?.data ?? []));
const s = (v: unknown) => (v == null || v === "" ? null : String(v));

/** "1.02:03:04" | "02:03:04" → segundos. */
export function duracaoSegundos(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const m = v.match(/^(?:(\d+)\.)?(\d+):(\d+):(\d+)/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]);
}

export function mapContato(clienteId: string, c: any) {
  const utm = c?.utm ?? {};
  return {
    cliente_id: clienteId,
    externo_id: String(c.id),
    nome: s(c.name),
    telefone: s(c.phonenumber ?? c.phoneNumber),
    status: s(c.status),
    etiquetas: (Array.isArray(c.tagNames) ? c.tagNames : Array.isArray(c.tags) ? c.tags.map((t: any) => t?.name ?? t) : [])
      .map((t: unknown) => String(t))
      .filter(Boolean),
    utm_source: s(utm.source),
    utm_medium: s(utm.medium),
    utm_campaign: s(utm.campaign),
    origem: s(c.origin),
    criado_em: s(c.createdAt),
    atualizado_em: s(c.updatedAt),
    payload: c,
    sincronizado_em: new Date().toISOString(),
  };
}

export function mapAtendimento(clienteId: string, x: any) {
  const utm = x?.utm ?? {};
  const cls = x?.classification ?? {};
  const classe = s(cls.categoryDescription ?? cls.categoryName);
  const valor = cls.amount == null || cls.amount === "" ? null : Number(cls.amount);
  return {
    cliente_id: clienteId,
    externo_id: String(x.id),
    contato_id: s(x.contactId),
    canal_id: s(x.channelId),
    canal_nome: s(x.channelDetails?.displayName ?? x.channelDetails?.humanId),
    canal_tipo: s(x.channelType ?? x.channelDetails?.platform),
    status: s(x.statusDescription ?? x.status),
    classificacao: classe,
    valor: Number.isFinite(valor) ? valor : null,
    atendente_id: s(x.userId),
    atendente_nome: s(x.agentDetails?.name),
    departamento_id: s(x.departmentId),
    origem: s(x.origin),
    utm_source: s(utm.source),
    utm_medium: s(utm.medium),
    utm_campaign: s(utm.campaign),
    criado_em: s(x.createdAt),
    atualizado_em: s(x.updatedAt),
    encerrado_em: s(x.endAt),
    first_response_at: s(x.firstResponseAt),
    time_wait_segundos: duracaoSegundos(x.timeWait),
    time_service_segundos: duracaoSegundos(x.timeService),
    payload: x,
    sincronizado_em: new Date().toISOString(),
  };
}

const APOIO: { tipo: string; caminho: string; nome: (i: any) => unknown }[] = [
  { tipo: "usuario", caminho: "/core/v1/agent", nome: (i) => i.name },
  { tipo: "etiqueta", caminho: "/core/v1/tag", nome: (i) => i.name },
  { tipo: "canal", caminho: "/chat/v1/channel", nome: (i) => i.identity?.name ?? i.numberFormatted ?? i.number },
  { tipo: "departamento", caminho: "/core/v1/department", nome: (i) => i.name },
  { tipo: "campo", caminho: "/core/v1/custom-field", nome: (i) => i.name },
  { tipo: "painel", caminho: "/crm/v2/panel", nome: (i) => i.title },
];

type Cursor = { etapa?: number; pagina?: number; desde?: string | null };

async function upsert(db: SupabaseClient, tabela: string, linhas: any[], conflito: string) {
  if (!linhas.length) return;
  const { error } = await db.from(tabela).upsert(linhas, { onConflict: conflito });
  if (error) throw new Error(`${tabela}: ${error.message}`);
}

/**
 * Roda uma fonte até terminar ou até `prazoMs`. Grava o cursor a cada
 * página para retomar sem duplicar. Devolve se concluiu.
 */
export async function sincronizarFonte(
  db: SupabaseClient,
  clienteId: string,
  fonte: Fonte,
  ctx: Contexto,
  prazoMs = 45_000,
): Promise<{ concluido: boolean; registros: number }> {
  const inicio = Date.now();
  const { data: est } = await db
    .from("elora_sync_estado")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("fonte", fonte)
    .maybeSingle();
  let cursor: Cursor = (est?.cursor as Cursor) ?? {};
  // Incremental: carga já concluída recomeça reprocessando os últimos 3 dias.
  if (est?.concluido_em && cursor.etapa === undefined) {
    const d = new Date(new Date(est.concluido_em).getTime() - 3 * 86_400_000).toISOString();
    cursor = { etapa: 0, pagina: 1, desde: d };
  }
  cursor.etapa ??= 0;
  cursor.pagina ??= 1;
  const novaPassada = !est || (cursor.etapa === 0 && cursor.pagina === 1);
  let registros = novaPassada ? 0 : Number(est?.registros ?? 0);
  const salvar = async (concluido: boolean) => {
    const { error } = await db.from("elora_sync_estado").upsert(
      {
        cliente_id: clienteId,
        fonte,
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

  const etapas =
    fonte === "apoio" ? APOIO.length : fonte === "contatos" ? STATUS_CONTATO.length : 1;
  try {
    while (cursor.etapa! < etapas) {
      if (Date.now() - inicio > prazoMs) {
        await salvar(false);
        return { concluido: false, registros };
      }
      const p = cursor.pagina!;
      let caminho: string;
      if (fonte === "apoio") caminho = `${APOIO[cursor.etapa!].caminho}?PageNumber=${p}&PageSize=${PAGE_SIZE}`;
      else if (fonte === "contatos")
        caminho = `/core/v1/contact?PageNumber=${p}&PageSize=${PAGE_SIZE}&Status=${STATUS_CONTATO[cursor.etapa!]}&IncludeDetails=Tags&IncludeDetails=CustomFields&IncludeDetails=Portfolios`;
      else
        caminho =
          `/chat/v2/session?PageNumber=${p}&PageSize=${PAGE_SIZE}` +
          DETALHES_SESSAO.map((d) => `&IncludeDetails=${d}`).join("") +
          (cursor.desde ? `&UpdatedAt.After=${encodeURIComponent(cursor.desde)}` : "");
      const resp = await chamarElora(ctx, caminho);
      const itens = itensDe(resp);
      if (fonte === "apoio") {
        const a = APOIO[cursor.etapa!];
        await upsert(
          db,
          "elora_apoio_espelho",
          itens.map((i) => ({
            cliente_id: clienteId,
            tipo: a.tipo,
            externo_id: String(i.id),
            nome: s(a.nome(i)),
            payload: i,
            sincronizado_em: new Date().toISOString(),
          })),
          "cliente_id,tipo,externo_id",
        );
      } else if (fonte === "contatos") {
        await upsert(db, "elora_contatos_espelho", itens.map((c) => mapContato(clienteId, c)), "cliente_id,externo_id");
      } else {
        await upsert(db, "elora_atendimentos_espelho", itens.map((x) => mapAtendimento(clienteId, x)), "cliente_id,externo_id");
      }
      registros += itens.length;
      const temMais = Boolean(resp?.hasMorePages) && itens.length > 0;
      if (temMais) cursor.pagina = p + 1;
      else {
        cursor.etapa = cursor.etapa! + 1;
        cursor.pagina = 1;
      }
      await salvar(false);
    }
    await salvar(true);
    return { concluido: true, registros };
  } catch (e) {
    await salvar(false);
    throw e;
  }
}

/** Estimativa de mensagens: soma de totalItems por amostra de atendimentos. */
export async function estimarMensagens(ctx: Contexto, sessaoIds: string[], totalSessoes: number) {
  let soma = 0;
  for (const id of sessaoIds) {
    const j = await chamarElora(ctx, `/chat/v1/session/${id}/message?PageSize=1`);
    soma += Number(j?.totalItems ?? 0);
  }
  const media = sessaoIds.length ? soma / sessaoIds.length : 0;
  const mensagens = Math.round(media * totalSessoes);
  return { amostra: sessaoIds.length, mediaPorAtendimento: media, mensagens, chamadas: Math.ceil(mensagens / PAGE_SIZE) + totalSessoes };
}

/** Clientes que continuam lendo as tabelas antigas até confirmação. */
export const LEITURA_ANTIGA = new Set(["jvu3dzqk"]);

/** O cliente já tem carga completa de contatos e atendimentos no espelho? */
export async function usaEspelho(db: SupabaseClient, clienteId: string): Promise<boolean> {
  if (LEITURA_ANTIGA.has(clienteId)) return false;
  const { data } = await db
    .from("elora_sync_estado")
    .select("fonte, concluido_em")
    .eq("cliente_id", clienteId)
    .in("fonte", ["contatos", "atendimentos"]);
  return (data ?? []).filter((r: any) => r.concluido_em).length === 2;
}

async function lerTudo(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/**
 * Lê o espelho no mesmo formato das tabelas antigas, para nenhum widget
 * mudar. Nunca lê texto de mensagem.
 */
export async function lerEspelhoNoFormatoAntigo(
  db: SupabaseClient,
  clienteId: string,
  inicio: string | null,
  fim: string | null,
) {
  const periodo = (t: string, cols: string) => () => {
    let x: any = db.from(t).select(cols).eq("cliente_id", clienteId);
    if (inicio) x = x.gte("criado_em", inicio);
    if (fim) x = x.lte("criado_em", fim);
    return x.order("externo_id");
  };
  const [ct, at] = await Promise.all([
    lerTudo(periodo("elora_contatos_espelho", "externo_id, nome, telefone, criado_em, utm_source, utm_medium, utm_campaign, payload->customFields")),
    lerTudo(
      periodo(
        "elora_atendimentos_espelho",
        "externo_id, contato_id, classificacao, criado_em, first_response_at, time_wait_segundos, time_service_segundos, payload->lastMessageIn, payload->lastMessageOut",
      ),
    ),
  ]);
  const contatos = ct.map((c) => ({
    contact_id: c.externo_id,
    nome: c.nome,
    telefone: c.telefone,
    criado_em: c.criado_em,
    utm_source: c.utm_source,
    utm_medium: c.utm_medium,
    utm_campaign: c.utm_campaign,
    campos_personalizados: Object.fromEntries(
      Object.entries((c.customFields ?? {}) as Record<string, unknown>)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ),
  }));
  const conversas = at.map((s) => ({
    sessao_id: s.externo_id,
    contato_id: s.contato_id,
    category_name: s.classificacao,
    criado_em: s.criado_em,
    teve_resposta: Boolean(s.lastMessageIn) && Boolean(s.lastMessageOut),
    time_wait_segundos: s.time_wait_segundos,
    time_service_segundos: s.time_service_segundos,
  }));
  return { contatos, conversas };
}
