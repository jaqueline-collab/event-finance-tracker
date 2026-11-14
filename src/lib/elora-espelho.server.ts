/**
 * Espelho completo da conta Elora de um cliente (somente servidor).
 * Traz TUDO da API: contatos (todos os status), atendimentos (todos os
 * status e canais, histórico completo) e listas de apoio. Canal não trava
 * nada; filtros são aplicados só na montagem do painel.
 * Mensagens: por atendimento (/chat/v1/message?SessionId=); o texto nunca sai do servidor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAGE_SIZE = 100;
export const PAUSA_MS = 250;
export const MAX_TENTATIVAS_429 = 5;
/** Espera crescente em 429: 15 s, 30 s, 45 s… */
export const espera429 = (tentativa: number) => 15_000 * (tentativa + 1);

export type Fonte = "apoio" | "contatos" | "atendimentos" | "mensagens";
export const ORDEM_FONTES: Fonte[] = ["apoio", "contatos", "atendimentos", "mensagens"];
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

/** Mensagem: colunas visíveis sem texto; o registro completo fica só no servidor. */
export function mapMensagem(clienteId: string, m: any, sessaoId: string) {
  const userId = s(m.userId);
  return {
    cliente_id: clienteId,
    externo_id: String(m.id),
    sessao_id: s(m.sessionId) ?? sessaoId,
    direcao: s(m.direction),
    tipo: s(m.type),
    user_id_elora: userId,
    eh_bot: m.direction === "FROM_HUB" ? !userId : null,
    enviada_em: s(m.timestamp ?? m.createdAt),
    payload: m,
    sincronizado_em: new Date().toISOString(),
  };
}

/** Atendimentos (ids) cujas mensagens serão lidas; incremental = só os alterados. */
async function sessoesParaMensagens(db: SupabaseClient, clienteId: string, desde?: string | null) {
  const ids: string[] = [];
  for (let de = 0; ; de += 1000) {
    let q = db.from("elora_atendimentos_espelho").select("externo_id").eq("cliente_id", clienteId);
    if (desde) q = q.gte("atualizado_em", desde);
    const { data, error } = await q.order("externo_id").range(de, de + 999);
    if (error) throw new Error(`elora_atendimentos_espelho: ${error.message}`);
    ids.push(...(data ?? []).map((r: any) => String(r.externo_id)));
    if (!data || data.length < 1000) return ids;
  }
}

const APOIO: { tipo: string; caminho: string; nome: (i: any) => unknown }[] = [
  { tipo: "usuario", caminho: "/core/v1/agent", nome: (i) => i.name },
  { tipo: "etiqueta", caminho: "/core/v1/tag", nome: (i) => i.name },
  { tipo: "canal", caminho: "/chat/v1/channel", nome: (i) => i.identity?.name ?? i.numberFormatted ?? i.number },
  { tipo: "departamento", caminho: "/core/v1/department", nome: (i) => i.name },
  { tipo: "campo", caminho: "/core/v1/custom-field", nome: (i) => i.name },
  { tipo: "painel", caminho: "/crm/v2/panel", nome: (i) => i.title },
];

type Cursor = { etapa?: number; pagina?: number; desde?: string | null; dias?: string[] };

/** Dias (America/Sao_Paulo) cujo cálculo padrão pode mudar com estas linhas novas/alteradas. */
async function diasAfetados(db: SupabaseClient, clienteId: string, tabela: string, linhas: any[], campos: string[], campoData: string): Promise<string[]> {
  if (!linhas.length) return [];
  const { diaSP } = await import("./painel-visual");
  const ids = linhas.map((l) => l.externo_id);
  const antes = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await (db as any).from(tabela).select(["externo_id", ...campos].join(",")).eq("cliente_id", clienteId).in("externo_id", ids.slice(i, i + 200));
    for (const r of data ?? []) antes.set(String(r.externo_id), r);
  }
  const dias = new Set<string>();
  for (const l of linhas) {
    const a = antes.get(String(l.externo_id));
    if (a && campos.every((c) => String(a[c] ?? "") === String(l[c] ?? ""))) continue;
    for (const v of [l[campoData], a?.[campoData]]) {
      const d = diaSP(v);
      if (d) dias.add(d);
    }
  }
  return [...dias];
}

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

  const sessoes = fonte === "mensagens" ? await sessoesParaMensagens(db, clienteId, cursor.desde) : [];
  const etapas =
    fonte === "apoio" ? APOIO.length : fonte === "contatos" ? STATUS_CONTATO.length : fonte === "mensagens" ? sessoes.length : 1;
  try {
    while (cursor.etapa! < etapas) {
      if (Date.now() - inicio > prazoMs) {
        await salvar(false);
        return { concluido: false, registros };
      }
      const p: number = cursor.pagina!;
      let caminho: string;
      if (fonte === "apoio") caminho = `${APOIO[cursor.etapa!].caminho}?PageNumber=${p}&PageSize=${PAGE_SIZE}`;
      else if (fonte === "contatos")
        caminho = `/core/v1/contact?PageNumber=${p}&PageSize=${PAGE_SIZE}&Status=${STATUS_CONTATO[cursor.etapa!]}&IncludeDetails=Tags&IncludeDetails=CustomFields&IncludeDetails=Portfolios`;
      else if (fonte === "mensagens")
        caminho = `/chat/v1/message?SessionId=${sessoes[cursor.etapa!]}&PageNumber=${p}&PageSize=${PAGE_SIZE}`;
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
        const linhas = itens.map((c) => mapContato(clienteId, c));
        if (est?.concluido_em) cursor.dias = [...new Set([...(cursor.dias ?? []), ...(await diasAfetados(db, clienteId, "elora_contatos_espelho", linhas, ["criado_em", "origem", "utm_campaign"], "criado_em"))])];
        await upsert(db, "elora_contatos_espelho", linhas, "cliente_id,externo_id");
      } else if (fonte === "mensagens") {
        const sid = sessoes[cursor.etapa!];
        const linhas = itens.map((m) => mapMensagem(clienteId, m, sid));
        if (est?.concluido_em) cursor.dias = [...new Set([...(cursor.dias ?? []), ...(await diasAfetados(db, clienteId, "elora_mensagens_espelho", linhas, ["enviada_em", "direcao", "tipo", "user_id_elora"], "enviada_em"))])];
        await upsert(db, "elora_mensagens_espelho", linhas, "cliente_id,externo_id");
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
    // Dias já gravados que mudaram: recalcula com backup das linhas anteriores (só esses dias).
    if (cursor.dias?.length && (await usaEspelho(db, clienteId))) {
      const { recalcularDiasGravados } = await import("./relatorio-recalculo.server");
      await recalcularDiasGravados(db, clienteId, cursor.dias, `sincronização ${fonte}: dados alterados`);
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
    const j = await chamarElora(ctx, `/chat/v1/message?SessionId=${id}&PageSize=1`);
    soma += Number(j?.totalItems ?? 0);
  }
  const media = sessaoIds.length ? soma / sessaoIds.length : 0;
  const mensagens = Math.round(media * totalSessoes);
  return { amostra: sessaoIds.length, mediaPorAtendimento: media, mensagens, chamadas: Math.ceil(mensagens / PAGE_SIZE) + totalSessoes };
}

export type FonteDados = "automatica" | "antiga";

/** Regra pura: "antiga" nunca usa o espelho; "automatica" usa quando contatos e atendimentos estão completos. */
export function decidirEspelho(fonte: FonteDados | null | undefined, estados: { fonte: string; concluido_em: string | null }[]): boolean {
  if (fonte === "antiga") return false;
  const ok = new Set(estados.filter((e) => e.concluido_em).map((e) => e.fonte));
  return ok.has("contatos") && ok.has("atendimentos");
}

/** Fonte dos dados configurada para o cliente (padrão "automatica"). */
export async function lerFonteDados(db: SupabaseClient, clienteId: string): Promise<FonteDados> {
  const { data } = await (db as any).from("elora_integracao_contas").select("fonte_dados").eq("cliente_id", clienteId).maybeSingle();
  return data?.fonte_dados === "antiga" ? "antiga" : "automatica";
}

/** O cliente lê do espelho? Segue a configuração "fonte dos dados" do cliente. */
export async function usaEspelho(db: SupabaseClient, clienteId: string): Promise<boolean> {
  const fonte = await lerFonteDados(db, clienteId);
  if (fonte === "antiga") return false;
  const { data } = await db
    .from("elora_sync_estado")
    .select("fonte, concluido_em")
    .eq("cliente_id", clienteId)
    .in("fonte", ["contatos", "atendimentos"]);
  return decidirEspelho(fonte, (data ?? []) as any);
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

/** Mensagens TO_HUB do período, só colunas sem texto (para o painel). */
/**
 * Conversas (sessão + dia de Brasília) já resumidas no banco por `elora_conversas_pares`,
 * devolvidas no formato de mensagens: uma marca por conversa (com "usuário" quando houve
 * mensagem DEFAULT) e, se houver, a última mensagem humana do dia. Nunca traz texto.
 * Dá exatamente o mesmo resultado que ler todas as mensagens TO_HUB válidas.
 */
export async function lerMensagensSemTexto(db: SupabaseClient, clienteId: string, inicio: string, fim: string, ctx?: import("./calculo-contexto.server").Ctx) {
  // Faixa já lida nesta requisição: recorta em memória (os limites são sempre começo/fim de dia).
  if (ctx?.msgs && ctx.msgs.inicio <= inicio && ctx.msgs.fim >= fim) {
    const ini = Date.parse(inicio), f = Date.parse(fim);
    return (await ctx.msgs.lista).filter((m) => { const t = Date.parse(m.enviada_em); return t >= ini && t <= f; });
  }
  if (ctx) return ctx.memo(`msgs|${clienteId}|${inicio}|${fim}`, () => lerMensagensSemTexto(db, clienteId, inicio, fim));
  const pares = await lerTudo(() =>
    (db as any).rpc("elora_conversas_pares", { _cliente_id: clienteId, _inicio: inicio, _fim: fim }).order("sessao_id").order("primeira_em"),
  );
  const out: { sessao_id: string; enviada_em: string | null; tipo: string | null; origem: string | null; user_id: string | null }[] = [];
  for (const r of pares as any[]) {
    const s = String(r.sessao_id);
    out.push({ sessao_id: s, enviada_em: r.primeira_em, tipo: null, origem: r.usuario ? "DEFAULT" : null, user_id: null });
    if (r.humano_em && r.humano_user) out.push({ sessao_id: s, enviada_em: r.humano_em, tipo: null, origem: null, user_id: String(r.humano_user) });
  }
  return out;
}
