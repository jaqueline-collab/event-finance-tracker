/** Cálculo de um cartão no servidor (sem checagem de acesso: quem chama já verificou). */
import type { CartaoGrafico } from "@/lib/graficos";

type Dados = { clienteId: string; de: string; ate: string; filtrosVisao: any[] };

export async function calcularCartaoServidor(db: any, data: Dados, c: CartaoGrafico, a: { semDinheiro: boolean }, ctx?: import("./calculo-contexto.server").Ctx) {
    const p = { de: data.de, ate: data.ate };
    if (c.painel) {
      const { calcularPainelVisual } = await import("@/lib/painel-visual.server");
      const { separarFiltros } = await import("@/lib/campos-elora");
      const { cartaoDoPainel } = await import("@/lib/graficos");
      const nativos = { canal: { fonte: "atendimento" as const, campo: "canal" }, atendente: { fonte: "atendimento" as const, campo: "atendente" }, origem: { fonte: "contato" as const, campo: "origem" }, etiqueta: { fonte: "contato" as const, campo: "etiquetas" }, campanha: { fonte: "utm" as const, campo: "campaign" } };
      const { diretos, outros } = separarFiltros([...data.filtrosVisao, ...c.filtros], nativos);
      const painel = await (ctx ? ctx.memo(`painel|${p.de}|${p.ate}|${JSON.stringify(diretos)}|${JSON.stringify(outros)}`, () => calcularPainelVisual(db, data.clienteId, p, diretos, outros, ctx)) : calcularPainelVisual(db, data.clienteId, p, diretos, outros));
      return { oculto: false as const, r: { ...cartaoDoPainel(painel, c), cobertura: painel.cobertura } };
    }
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const cat = await catalogoDoCliente(db, data.clienteId, ctx);
    if (c.medida === "indicador") {
      if (!c.indicador) return { oculto: false as const, r: null };
      const { montarMatrizCliente } = await import("@/lib/matriz.server");
      const { cartaoDeIndicador } = await import("@/lib/graficos");
      const { periodoAnterior } = await import("@/lib/painel-visual");
      const campos = [...data.filtrosVisao, ...c.filtros] as any;
      const m = await (ctx ? ctx.memo(`matriz|${p.de}|${p.ate}|${JSON.stringify(campos)}`, () => montarMatrizCliente(db, data.clienteId, p, {}, { campos, ctx })) : montarMatrizCliente(db, data.clienteId, p, {}, { campos }));
      if (!m.todasColunas.some((x) => x.chave === c.indicador)) return { oculto: false as const, r: null };
      let ant: number | null = null;
      if (c.comparar) {
        const ma = await (ctx ? ctx.memo(`matriz|${periodoAnterior(p).de}|${periodoAnterior(p).ate}|${JSON.stringify(campos)}`, () => montarMatrizCliente(db, data.clienteId, periodoAnterior(p), {}, { campos, ctx })) : montarMatrizCliente(db, data.clienteId, periodoAnterior(p), {}, { campos }));
        ant = cartaoDeIndicador(ma.linhas as any, c.indicador, c, null).total;
      }
      return { oculto: false as const, r: { ...cartaoDeIndicador(m.linhas as any, c.indicador, c, ant), primeiraLeitura: m.primeiraLeitura, cobertura: Object.values(m.cobertura).some(s => s !== "confirmado") ? "parcial" : "confirmado" } };
    }
    const { agregarCartao, agregarCalendario, diasAguardando } = await import("@/lib/graficos");
    const { estadoCobertura } = await import("@/lib/sync-cobertura");
    const { data: estados, error: erroSync } = await (ctx ? ctx.memo("estados", async () => db.from("elora_sync_estado").select("fonte, concluido_em").eq("cliente_id", data.clienteId)) : db.from("elora_sync_estado").select("fonte, concluido_em").eq("cliente_id", data.clienteId)) as any;
    if (erroSync) throw new Error(erroSync.message);
    const fonte = c.fonte === "card" ? "cards" : c.fonte === "atendimento" ? "atendimentos" : "contatos";
    const contadosPor = async (chaves: string[], per: { de: string; ate: string }) => {
      const { lerConfig } = await import("@/lib/indicadores.server");
      const { lerLeiturasCards } = await import("@/lib/matriz.server");
      const { cardsDoIndicador } = await import("@/lib/indicadores-motor");
      const [cfgs, leituras] = await Promise.all([lerConfig(db, data.clienteId, ctx), lerLeiturasCards(db, data.clienteId, ctx)]);
      const { aplicarFiltrosCampos } = await import("@/lib/campos-elora");
      const f = aplicarFiltrosCampos(cat.base, [...(data.filtrosVisao as any), ...c.filtros]);
      const ls = f ? leituras.filter((l) => f.cards.has(l.card_id)) : leituras;
      const m = new Map<string, { card_id: string; estimado: boolean }>();
      for (const k of chaves) { const cfg = cfgs.find((x) => x.chave === k); if (cfg) for (const x of cardsDoIndicador(cfg, ls, per.de, per.ate)) if (!m.has(x.card_id)) m.set(x.card_id, x); }
      return [...m.values()];
    };
    if (c.tipo === "dois_valores" && c.indicador) {
      const { doisValoresDeCards } = await import("@/lib/graficos");
      const { periodoAnterior } = await import("@/lib/painel-visual");
      const contados = await contadosPor([c.indicador], p);
      const ant = c.comparar ? (await contadosPor([c.indicador], periodoAnterior(p))).length : null;
      return { oculto: false as const, r: { ...doisValoresDeCards(cat.base, c, contados, ant), cobertura: estadoCobertura(p.ate, ["cards"], estados ?? []) } };
    }
    if (c.tipo === "dois_valores") {
      const { agregarDoisValores } = await import("@/lib/graficos");
      return { oculto: false as const, r: { ...agregarDoisValores(cat.base, c, p, data.filtrosVisao as any, cat.catalogo), cobertura: estadoCobertura(p.ate, [fonte], estados ?? []) } };
    }
    if (c.tipo === "matriz_utm") {
      const { agregarMatrizUtm } = await import("@/lib/graficos");
      const { lerMensagensSemTexto } = await import("@/lib/elora-espelho.server");
      const { conversasPorDia, limitesUtc } = await import("@/lib/painel-visual");
      const lim = limitesUtc(p);
      const conversas = conversasPorDia(await lerMensagensSemTexto(db, data.clienteId, lim.inicio, lim.fim, ctx));
      return { oculto: false as const, r: { ...agregarMatrizUtm(cat.base, c, p, data.filtrosVisao as any, conversas), cobertura: estadoCobertura(p.ate, ["contatos", "atendimentos"], estados ?? []) } };
    }
    if (c.tipo === "tabela_itens") {
      const { itensTabela } = await import("@/lib/graficos");
      return { oculto: false as const, r: { ...itensTabela(cat.base, c, p, data.filtrosVisao as any, a.semDinheiro, cat.catalogo, 2000, c.fonte === "card" && c.indicadoresItens.length ? new Set((await contadosPor(c.indicadoresItens, p)).map((x) => x.card_id)) : undefined), cobertura: estadoCobertura(p.ate, [fonte], estados ?? []) } };
    }
    if (c.tipo === "calendario") {
      const { eventosCalendario, camposDataCalendario, rotuloTipoData } = await import("@/lib/graficos");
      const r = agregarCalendario(cat.base, c, p, data.filtrosVisao as any);
      const aguardando = diasAguardando(p, r, (d) => estadoCobertura(d, [fonte], estados ?? []));
      const rotCat = (f: { fonte: string; campo: string }) => cat.catalogo.find((g: any) => g.fonte === f.fonte)?.campos.find((x: any) => x.campo === f.campo)?.rotulo;
      const tiposCalendario = camposDataCalendario(c).map((f) => rotuloTipoData(f, rotCat(f)));
      return { oculto: false as const, r: { ...r, aguardando, eventos: eventosCalendario(cat.base, c, p, data.filtrosVisao as any), tiposCalendario, cobertura: estadoCobertura(p.ate, [fonte], estados ?? []) } };
    }
    return { oculto: false as const, r: { ...agregarCartao(cat.base, c, p, data.filtrosVisao as any, cat.catalogo), cobertura: estadoCobertura(p.ate, [fonte], estados ?? []) } };
}

/** Validade do cache curto (além das versões de sincronização e configuração). */
export const CACHE_MS = 5 * 60_000;

async function sha(t: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Calcula vários cartões de uma visão numa requisição: leituras feitas uma vez e repartidas.
 * Cache por cliente + cartão + período + filtros + versão da sincronização + versão da configuração;
 * guarda o dado completo e aplica a permissão de valores depois, a cada requisição.
 */
export async function calcularCartoesServidor(
  db: any,
  data: Dados,
  cartoes: CartaoGrafico[],
  a: { semDinheiro: boolean },
  opcoes: { usarCache?: boolean } = {},
) {
  const { criarContexto } = await import("./calculo-contexto.server");
  const { aplicarPermissaoValores } = await import("./graficos");
  const { periodoAnterior, limitesUtc } = await import("./painel-visual");
  const usarCache = opcoes.usarCache !== false;
  const out: Record<string, { oculto: boolean; r: any }> = {};
  let chaves: Record<string, string> = {};
  let faltam = cartoes;
  if (usarCache) {
    const { data: v, error } = await db.rpc("elora_versoes_cache", { _cliente_id: data.clienteId });
    if (error) throw new Error(`versoes: ${error.message}`);
    const base = JSON.stringify([data.clienteId, data.de, data.ate, data.filtrosVisao, v]);
    for (const c of cartoes) chaves[c.id] = await sha(base + JSON.stringify(c));
    const { data: achados, error: e2 } = await db
      .from("elora_calculo_cache")
      .select("chave, valor")
      .in("chave", Object.values(chaves))
      .gte("criado_em", new Date(Date.now() - CACHE_MS).toISOString());
    if (e2) throw new Error(`cache: ${e2.message}`);
    const m = new Map((achados ?? []).map((x: any) => [x.chave, x.valor]));
    for (const c of cartoes) if (m.has(chaves[c.id])) out[c.id] = m.get(chaves[c.id]) as any;
    faltam = cartoes.filter((c) => !out[c.id]);
  }
  if (faltam.length) {
    const ctx = criarContexto();
    // Mensagens lidas uma vez: do início do período anterior até o fim do período.
    const ini = limitesUtc(periodoAnterior({ de: data.de, ate: data.ate })).inicio;
    const fim = limitesUtc({ de: data.de, ate: data.ate }).fim;
    const { lerMensagensSemTexto } = await import("./elora-espelho.server");
    ctx.msgs = { inicio: ini, fim, lista: lerMensagensSemTexto(db, data.clienteId, ini, fim) };
    const novos = await Promise.all(faltam.map((c) => calcularCartaoServidor(db, data, c, { semDinheiro: false }, ctx)));
    const linhas: any[] = [];
    faltam.forEach((c, i) => {
      const r = JSON.parse(JSON.stringify(novos[i]));
      out[c.id] = r;
      if (usarCache) linhas.push({ chave: chaves[c.id], cliente_id: data.clienteId, valor: r, criado_em: new Date().toISOString() });
    });
    if (linhas.length) {
      const { error } = await db.from("elora_calculo_cache").upsert(linhas, { onConflict: "chave" });
      if (error) console.error("cache: gravação falhou", error.message);
      // limpeza do que já venceu deste cliente
      await db.from("elora_calculo_cache").delete().eq("cliente_id", data.clienteId).lt("criado_em", new Date(Date.now() - CACHE_MS).toISOString());
    }
  }
  return Object.fromEntries(cartoes.map((c) => [c.id, aplicarPermissaoValores(c, out[c.id], a.semDinheiro)]));
}
