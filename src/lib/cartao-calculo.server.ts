/** Cálculo de um cartão no servidor (sem checagem de acesso: quem chama já verificou). */
import type { CartaoGrafico } from "@/lib/graficos";

type Dados = { clienteId: string; de: string; ate: string; filtrosVisao: any[] };

export async function calcularCartaoServidor(db: any, data: Dados, c: CartaoGrafico, a: { semDinheiro: boolean }) {
    const p = { de: data.de, ate: data.ate };
    if (c.painel) {
      const { calcularPainelVisual } = await import("@/lib/painel-visual.server");
      const { separarFiltros } = await import("@/lib/campos-elora");
      const { cartaoDoPainel } = await import("@/lib/graficos");
      const nativos = { canal: { fonte: "atendimento" as const, campo: "canal" }, atendente: { fonte: "atendimento" as const, campo: "atendente" }, origem: { fonte: "contato" as const, campo: "origem" }, etiqueta: { fonte: "contato" as const, campo: "etiquetas" }, campanha: { fonte: "utm" as const, campo: "campaign" } };
      const { diretos, outros } = separarFiltros([...data.filtrosVisao, ...c.filtros], nativos);
      const painel = await calcularPainelVisual(db, data.clienteId, p, diretos, outros);
      return { oculto: false as const, r: { ...cartaoDoPainel(painel, c), cobertura: painel.cobertura } };
    }
    const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
    const cat = await catalogoDoCliente(db, data.clienteId);
    if (c.medida === "indicador") {
      if (!c.indicador) return { oculto: false as const, r: null };
      const { montarMatrizCliente } = await import("@/lib/matriz.server");
      const { cartaoDeIndicador } = await import("@/lib/graficos");
      const { periodoAnterior } = await import("@/lib/painel-visual");
      const campos = [...data.filtrosVisao, ...c.filtros] as any;
      const m = await montarMatrizCliente(db, data.clienteId, p, {}, { campos });
      if (!m.todasColunas.some((x) => x.chave === c.indicador)) return { oculto: false as const, r: null };
      let ant: number | null = null;
      if (c.comparar) {
        const ma = await montarMatrizCliente(db, data.clienteId, periodoAnterior(p), {}, { campos });
        ant = cartaoDeIndicador(ma.linhas as any, c.indicador, c, null).total;
      }
      return { oculto: false as const, r: { ...cartaoDeIndicador(m.linhas as any, c.indicador, c, ant), primeiraLeitura: m.primeiraLeitura, cobertura: Object.values(m.cobertura).some(s => s !== "confirmado") ? "parcial" : "confirmado" } };
    }
    const { agregarCartao, agregarCalendario, diasAguardando } = await import("@/lib/graficos");
    const { estadoCobertura } = await import("@/lib/sync-cobertura");
    const { data: estados, error: erroSync } = await db.from("elora_sync_estado").select("fonte, concluido_em").eq("cliente_id", data.clienteId);
    if (erroSync) throw new Error(erroSync.message);
    const fonte = c.fonte === "card" ? "cards" : c.fonte === "atendimento" ? "atendimentos" : "contatos";
    const contadosPor = async (chaves: string[], per: { de: string; ate: string }) => {
      const { lerConfig } = await import("@/lib/indicadores.server");
      const { lerLeiturasCards } = await import("@/lib/matriz.server");
      const { cardsDoIndicador } = await import("@/lib/indicadores-motor");
      const [cfgs, leituras] = await Promise.all([lerConfig(db, data.clienteId), lerLeiturasCards(db, data.clienteId)]);
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
      const conversas = conversasPorDia(await lerMensagensSemTexto(db, data.clienteId, lim.inicio, lim.fim));
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
