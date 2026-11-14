/** Leitura da visão Matriz (somente servidor). Nunca lê texto de mensagens. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listaDias, type Periodo } from "./painel-visual";
import type { FiltroCampo } from "./campos-elora";
import { calcularIndicadoresCards, COLUNAS_PADRAO, ehCombinadaDeCard, type Leitura, type PorDia } from "./indicadores-motor";
import { calcularCorteCliente, lerConfig } from "./indicadores.server";
import { colunasMatriz, montarMatriz, opcoesDimensoes, somarPadraoPorDia, type ConfigMatriz, type FiltrosMatriz, type LinhaCorteMatriz } from "./matriz";
import { estadoCobertura } from "./sync-cobertura";

async function lerTudo(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export async function lerLeiturasCards(db: SupabaseClient, clienteId: string, ctx?: import("./calculo-contexto.server").Ctx): Promise<Leitura[]> {
  if (ctx) return ctx.memo(`leituras|${clienteId}`, () => lerLeiturasCards(db, clienteId));
  const leituras = await lerTudo(() =>
    db.from("elora_cards_historico").select("card_id, visto_em, estimado, etapa_id, etapa_titulo, status, campos").eq("cliente_id", clienteId).order("id"),
  );
  if (!leituras.length) return [];
  const cards = await lerTudo(() => db.from("elora_cards_espelho").select("externo_id, criado_em").eq("cliente_id", clienteId).order("externo_id"));
  const criados = new Map(cards.map((c: any) => [String(c.externo_id), c.criado_em as string | null]));
  return leituras.map((l: any) => ({ ...l, card_id: String(l.card_id), criado_em: criados.get(String(l.card_id)) ?? null }));
}

/**
 * Linhas padrão por dia/canal/atendente/equipe. Regra única: cliente com espelho
 * usa sempre o motor (com ou sem filtro, o filtro só restringe contatos), para
 * "sem filtro" e "filtro que não exclui ninguém" darem o mesmo número.
 * Cliente sem espelho (fonte antiga) lê o que está gravado.
 */
export async function linhasPadrao(db: SupabaseClient, clienteId: string, p: Periodo, soContatos?: Set<string>, ctx?: import("./calculo-contexto.server").Ctx): Promise<LinhaCorteMatriz[]> {
  const { usaEspelho } = await import("./elora-espelho.server");
  if (soContatos || (await usaEspelho(db, clienteId))) {
    const calc = await calcularCorteCliente(db, clienteId, p, soContatos, ctx);
    // Só exibição: nome do canal = apelido da super admin (ou "Canal sem nome"), nunca o código da instância.
    const { lerMapaCanais } = await import("./nome-canal.server");
    const { exibirCanal } = await import("./nome-canal");
    const mapa = await lerMapaCanais(db, clienteId);
    return (calc.linhas as any[]).map((l) => ({ ...l, canal: l.canal ? exibirCanal(mapa, null, l.canal) : "" })) as any;
  }
  const cols = COLUNAS_PADRAO.map((c) => c.chave).join(", ");
  const gravadas = await lerTudo(() =>
    db.from("elora_relatorio_diario").select(`data, canal, atendente, equipe, ${cols}`).eq("cliente_id", clienteId).gte("data", p.de).lte("data", p.ate).order("id"),
  );
  return gravadas.map((r: any) => ({ ...r, dia: String(r.data), canal: r.canal ?? "", atendente: r.atendente ?? "", equipe: r.equipe ?? "" }));
}

export async function montarMatrizCliente(
  db: SupabaseClient,
  clienteId: string,
  p: Periodo,
  filtros: FiltrosMatriz,
  opcoes: { rascunho?: ConfigMatriz; comCatalogo?: boolean; campos?: FiltroCampo[]; ctx?: import("./calculo-contexto.server").Ctx } = {},
) {
  let filtro: { contatos: Set<string>; cards: Set<string> } | null = null;
  let catalogo: any[] = [];
  if (opcoes.campos?.length || opcoes.comCatalogo) {
    const { catalogoDoCliente } = await import("./campos-elora.server");
    const { aplicarFiltrosCampos, catalogoVisivel } = await import("./campos-elora");
    const cat = await catalogoDoCliente(db, clienteId, opcoes.ctx);
    if (opcoes.campos?.length) filtro = aplicarFiltrosCampos(cat.base, opcoes.campos);
    if (opcoes.comCatalogo)
      catalogo = catalogoVisivel(cat.catalogo, "coluna").map((g) => ({ fonte: g.fonte, nome: g.nome, campos: g.campos.map((c) => ({ campo: c.campo, rotulo: c.rotulo, preenchidos: c.preenchidos })) }));
  }
  const salvas = (await lerConfig(db, clienteId, opcoes.ctx)) as ConfigMatriz[];
  const rascunho = opcoes.rascunho;
  const configs = rascunho ? [...salvas.filter((c) => c.chave !== rascunho.chave), rascunho] : salvas;
  const precisaCards = configs.some((c) => c.ativo && ehCombinadaDeCard(c)) || opcoes.comCatalogo;
  const [linhas, leituras, manuaisRaw] = await Promise.all([
    linhasPadrao(db, clienteId, p, filtro?.contatos, opcoes.ctx),
    precisaCards ? lerLeiturasCards(db, clienteId, opcoes.ctx) : Promise.resolve([] as Leitura[]),
    lerTudo(() => db.from("elora_matriz_manual" as any).select("coluna_chave, data, valor").eq("cliente_id", clienteId).gte("data", p.de).lte("data", p.ate).order("id")),
  ]);
  const m: PorDia = somarPadraoPorDia(linhas, filtros);
  const cardsFiltrados = filtro?.cards;
  calcularIndicadoresCards(configs, cardsFiltrados ? leituras.filter((l) => cardsFiltrados.has(l.card_id)) : leituras, m);
  const manuais = new Map<string, Record<string, number>>();
  for (const r of manuaisRaw as any[]) {
    if (r.valor == null) continue;
    const o = manuais.get(String(r.data)) ?? {};
    o[r.coluna_chave] = Number(r.valor);
    manuais.set(String(r.data), o);
  }
  const todas = colunasMatriz(configs);
  const r = montarMatriz(todas, listaDias(p), m, manuais);
  const etapas = [...new Set(leituras.map((l) => l.etapa_titulo).filter(Boolean) as string[])].sort();
  const { data: sync, error: syncError } = await db.from("elora_sync_estado").select("fonte, concluido_em, cursor").eq("cliente_id", clienteId);
  if (syncError) throw new Error(syncError.message);
  const estados = sync ?? [];
  const fontes = ["contatos", "atendimentos", "mensagens", ...(precisaCards ? ["cards"] : [])];
  const cobertura = Object.fromEntries(listaDias(p).map(d => [d, estadoCobertura(d, fontes, estados)]));
  const primeiraLeitura = leituras.map(l => l.visto_em).filter(Boolean).sort()[0] ?? null;
  return {
    ...r,
    todasColunas: todas,
    opcoes: opcoesDimensoes(linhas),
    temCards: leituras.length > 0,
    cobertura,
    primeiraLeitura,
    etapas: opcoes.comCatalogo ? etapas : [],
    catalogo: catalogo as { fonte: "card" | "contato" | "atendimento" | "utm"; nome: string; campos: { campo: string; rotulo: string; preenchidos: number }[] }[],
  };
}
