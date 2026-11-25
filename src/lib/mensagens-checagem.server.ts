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
import { decidirRetomada, somarCardsPorDia, decidirExclusao, diasConferencia, ehNaoEncontrado, ETAPAS_CONFERENCIA, JANELA_EXCLUSAO_DIAS, limitesDia, ROTULO_ETAPA, diaSPDe, type LinhaConferencia } from "./conferencia";

const AMOSTRA_POR_DIA = 4;
type Excl = { desde: string; paineis: string[]; p: number; s: number; pg: number; ids: string[]; fase: "listar" | "pedir"; pendentes?: string[]; nf?: string[]; reativar?: string[]; erro?: string };
type LoteCards = { paineis: string[]; p: number; s: number; pg: number; porDia: Record<string, number>; ids: string[]; feito?: boolean };
type Cursor = { dias?: string[]; i?: number; etapa?: number; parte?: number; parcial?: number; cl?: LoteCards; excl?: Excl };

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
  let q = (db as any).from(tabela).select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).gte("criado_em", de).lt("criado_em", ate);
  if (tabela === "elora_cards_espelho") q = q.is("excluido_em", null);
  const { count, error } = await q;
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
  const decisao = decidirRetomada(conf);
  if (decisao === "interromper") {
    await (db as any).from("elora_conferencias").update({ situacao: "interrompida", progresso: `Interrompida (aberta há mais de 24 horas) · ${conf.progresso ?? ""}`.trim() }).eq("id", conf.id);
  }
  if (decisao !== "retomar") {
    const dias = diasConferencia(Date.now(), nDias);
    const { data, error } = await (db as any).from("elora_conferencias").insert({ cliente_id: clienteId, origem, cursor: { dias, i: 0, etapa: 0 }, linhas: dias.map((dia) => ({ dia })), progresso: "Começando" }).select("*").single();
    if (error) throw new Error(`elora_conferencias: ${error.message}`);
    conf = data;
  }
  const cursor: Cursor = conf.cursor ?? {};
  const linhas: LinhaConferencia[] = conf.linhas ?? [];
  const dias = cursor.dias!;
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
      const [nosso, ...totais] = await Promise.all([
        contarNosso(db, "elora_contatos_espelho", clienteId, de, ate),
        ...STATUS_CONTATO.map((st) => contarElora(ctx, `/core/v1/contact?Status=${st}&${filtro(de, ate)}`)),
      ]);
      linha.contatos = { nosso, elora: totais.reduce((s, n) => s + n, 0) };
    } else if (etapa === "cards") {
      // Lote único para os 7 dias: cada pedido grava o cursor, então toda rodada avança.
      if (!cursor.cl) {
        const { data } = await (db as any).from("elora_apoio_espelho").select("externo_id").eq("cliente_id", clienteId).eq("tipo", "painel");
        cursor.cl = { paineis: (data ?? []).map((p: any) => String(p.externo_id)), p: 0, s: 0, pg: 1, porDia: {}, ids: [] };
        await salvar({ progresso });
      }
      const cl = cursor.cl;
      if (!cl.feito) {
        const de0 = limitesDia(dias[0]).de, ate0 = limitesDia(dias[dias.length - 1]).ate;
        const vistos = new Set(cl.ids);
        while (cl.p < cl.paineis.length) {
          if (Date.now() - inicio > prazoMs) { await salvar({ progresso: `Cards criados nos 7 dias (painel ${cl.p + 1} de ${cl.paineis.length})` }); return { id: conf.id, concluida: false }; }
          const st = STATUS_CARDS[cl.s];
          const j = await chamarElora(ctx, `/crm/v2/panel/card?PanelId=${cl.paineis[cl.p]}${st ? `&Statuses=${st}` : ""}&${filtro(de0, ate0)}&PageSize=${PAGE_SIZE}&PageNumber=${cl.pg}`);
          const it = itensDe(j);
          somarCardsPorDia(cl.porDia, vistos, it, dias);
          cl.ids = [...vistos];
          if (j?.hasMorePages && it.length) cl.pg++;
          else if (cl.s < STATUS_CARDS.length - 1) { cl.s++; cl.pg = 1; }
          else { cl.p++; cl.s = 0; cl.pg = 1; }
          await salvar({ progresso: `Cards criados nos 7 dias (painel ${Math.min(cl.p + 1, cl.paineis.length)} de ${cl.paineis.length})` });
        }
        cl.feito = true; cl.ids = [];
      }
      const e = cl.porDia[dia] ?? 0;
      linha.cards = { nosso: await contarNosso(db, "elora_cards_espelho", clienteId, de, ate), elora: e };
    } else {
      linha.mensagens = await amostraMensagens(db, clienteId, ctx, dia, de, ate);
    }
    if (cursor.etapa! < ETAPAS_CONFERENCIA.length - 1) cursor.etapa = cursor.etapa! + 1;
    else { cursor.i = cursor.i! + 1; cursor.etapa = 0; }
    await salvar({ progresso });
  }
  // Cards excluídos no Elora: janela de 30 dias, só confirmados pelo id.
  const r = await verificarExclusoes(db, clienteId, ctx, cursor, inicio, prazoMs, () => salvar({ progresso: "Verificando cards excluídos no Elora" }));
  if (!r) {
    await salvar({ progresso: "Verificando cards excluídos no Elora" });
    return { id: conf.id, concluida: false };
  }
  // A exclusão acontece depois da contagem: atualiza o nosso lado antes de
  // concluir para a tela não manter uma diferença que já foi resolvida.
  if (r.marcados.length || r.reativados.length) {
    for (const linha of linhas) {
      if (!linha.cards) continue;
      const { de, ate } = limitesDia(linha.dia);
      linha.cards.nosso = await contarNosso(db, "elora_cards_espelho", clienteId, de, ate);
    }
  }
  await salvar({ situacao: "concluida", concluido_em: new Date().toISOString(), progresso: null, exclusoes: r });
  return { id: conf.id, concluida: true };
}

async function amostraMensagens(db: SupabaseClient, clienteId: string, ctx: Contexto, dia: string, de: string, ate: string) {
  const ms = await mensagensDoPeriodo(db, clienteId, de, ate);
  const porSessao = new Map<string, number>();
  for (const m of ms) if (diaSP(m.enviada_em) === dia) porSessao.set(String(m.sessao_id), (porSessao.get(String(m.sessao_id)) ?? 0) + 1);
  const ids = [...porSessao.keys()].sort(() => Math.random() - 0.5).slice(0, AMOSTRA_POR_DIA);
  const ehHoje = dia === diaSPDe(Date.now());
  const conferir = async (sid: string) => {
    let n = 0;
    for (let p = 1; p < 50; p++) {
      const j = await chamarElora(ctx, `/chat/v1/message?SessionId=${sid}&PageNumber=${p}&PageSize=${PAGE_SIZE}`);
      const itens = itensDe(j);
      n += itens.filter((m) => diaSP(mapMensagem(clienteId, m, sid).enviada_em) === dia).length;
      if (!j?.hasMorePages || !itens.length) break;
    }
    return Math.abs(n - (porSessao.get(sid) ?? 0));
  };
  // Conversas são independentes: paralelizar não muda a amostra nem as contagens.
  const diferencas = await Promise.all(ids.map(conferir));
  return {
    amostra: ids.length,
    bateram: diferencas.filter((d) => d === 0).length,
    andamento: ehHoje ? diferencas.filter((d) => d > 0 && d <= 1).length : 0,
  };
}

/** GET do card pelo id, sem lançar erro: devolve código e corpo. */
async function pedirCard(ctx: Contexto, id: string): Promise<{ status: number; corpo: any }> {
  await new Promise((r) => setTimeout(r, 250));
  ctx.chamadas += 1;
  const r = await (ctx.fetcher ?? fetch)(`${ctx.base}/crm/v2/panel/card/${id}`, { headers: { Authorization: `Bearer ${ctx.chave}`, Accept: "application/json" } });
  let corpo: any = null;
  try { corpo = await r.json(); } catch { corpo = null; }
  return { status: r.status, corpo };
}

/**
 * Marca (soft delete) cards criados nos últimos 30 dias que sumiram do Elora,
 * só com "não encontrado" ao pedir pelo id, nunca de rodada incompleta ou com erro,
 * e respeitando o limite de segurança. Reativa cards marcados que voltaram.
 * Devolve null enquanto não terminou (retoma na próxima chamada).
 */
async function verificarExclusoes(db: SupabaseClient, clienteId: string, ctx: Contexto, cursor: Cursor, inicio: number, prazoMs: number, gravar: () => Promise<void> = async () => {}) {
  const d: any = db;
  if (!cursor.excl) {
    const { data } = await d.from("elora_apoio_espelho").select("externo_id").eq("cliente_id", clienteId).eq("tipo", "painel");
    const desde = limitesDia(diasConferencia(Date.now(), JANELA_EXCLUSAO_DIAS)[0]).de;
    cursor.excl = { desde, paineis: (data ?? []).map((p: any) => String(p.externo_id)), p: 0, s: 0, pg: 1, ids: [], fase: "listar" };
  }
  const x = cursor.excl;
  const tempo = () => Date.now() - inicio > prazoMs;
  try {
    while (x.fase === "listar" && x.p < x.paineis.length) {
      if (tempo()) return null;
      const st = STATUS_CARDS[x.s];
      const j = await chamarElora(ctx, `/crm/v2/panel/card?PanelId=${x.paineis[x.p]}${st ? `&Statuses=${st}` : ""}&CreatedAt.After=${encodeURIComponent(x.desde)}&PageSize=${PAGE_SIZE}&PageNumber=${x.pg}`);
      const it = itensDe(j);
      x.ids.push(...it.map((c: any) => String(c.id)));
      if (j?.hasMorePages && it.length) x.pg++;
      else if (x.s < STATUS_CARDS.length - 1) { x.s++; x.pg = 1; }
      else { x.p++; x.s = 0; x.pg = 1; }
      await gravar();
    }
    if (x.fase === "listar") {
      const noElora = new Set(x.ids);
      const { lerTudo } = await import("./ler-paginas.server");
      const nossos = await lerTudo(() => d.from("elora_cards_espelho").select("externo_id, excluido_em").eq("cliente_id", clienteId).gte("criado_em", x.desde).order("externo_id"));
      const ativos = (nossos ?? []).filter((n: any) => !n.excluido_em).map((n: any) => String(n.externo_id));
      const marcados = (nossos ?? []).filter((n: any) => n.excluido_em).map((n: any) => String(n.externo_id));
      x.reativar = marcados.filter((id: string) => noElora.has(id));
      x.pendentes = [...ativos.filter((id: string) => !noElora.has(id)), ...marcados.filter((id: string) => !noElora.has(id))];
      x.nf = [];
      x.ids = [];
      x.fase = "pedir";
      await gravar();
    }
    while (x.pendentes!.length) {
      if (tempo()) return null;
      const id = x.pendentes![0];
      const r = await pedirCard(ctx, id);
      if (ehNaoEncontrado(r.status, r.corpo)) x.nf!.push(id);
      else if (r.status === 200 && String(r.corpo?.id ?? "") === id) x.reativar!.push(id);
      else { x.erro = `Card ${id.slice(0, 8)}: Elora respondeu ${r.status} ${r.corpo?.key ?? ""}`.trim(); x.pendentes = []; break; }
      x.pendentes!.shift();
      await gravar();
    }
  } catch (e) {
    x.erro = String((e as Error)?.message ?? e).slice(0, 200);
  }
  const { data: sync } = await d.from("elora_sync_estado").select("ultima_execucao_concluida").eq("cliente_id", clienteId).eq("fonte", "cards").maybeSingle();
  const rodadaOk = !x.erro && sync?.ultima_execucao_concluida !== false;
  const { data: ja } = await d.from("elora_cards_espelho").select("externo_id").eq("cliente_id", clienteId).in("externo_id", x.nf!.length ? x.nf! : ["-"]).not("excluido_em", "is", null);
  const jaMarcados = new Set((ja ?? []).map((r: any) => String(r.externo_id)));
  const novos = x.nf!.filter((id) => !jaMarcados.has(id));
  const { count: totalJanela } = await d.from("elora_cards_espelho").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId).gte("criado_em", x.desde).is("excluido_em", null);
  const dec = decidirExclusao(novos, totalJanela ?? 0, rodadaOk);
  const agora = new Date().toISOString();
  if (dec.marcar.length) await d.from("elora_cards_espelho").update({ excluido_em: agora }).eq("cliente_id", clienteId).in("externo_id", dec.marcar);
  const reativar = rodadaOk ? x.reativar! : [];
  if (reativar.length) await d.from("elora_cards_espelho").update({ excluido_em: null }).eq("cliente_id", clienteId).in("externo_id", reativar);
  // Invalida o cache dos painéis quando algo mudou.
  if (dec.marcar.length || reativar.length) await d.from("elora_sync_estado").update({ atualizado_em: agora }).eq("cliente_id", clienteId).eq("fonte", "cards");
  return { janelaDesde: x.desde, verificadosPorId: x.nf!.length + x.reativar!.length, naoEncontrados: novos, marcados: dec.marcar, reativados: reativar, bloqueado: dec.bloqueado, aviso: dec.motivo ?? (x.erro ? x.erro : null), em: agora };
}
