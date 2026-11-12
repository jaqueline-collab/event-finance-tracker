/** Leitura da visão Matriz (somente servidor). Nunca lê texto de mensagens. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listaDias, type Periodo } from "./painel-visual";
import type { FiltroCampo } from "./campos-elora";
import { calcularIndicadoresCards, COLUNAS_PADRAO, ehCombinadaDeCard, type Leitura, type PorDia } from "./indicadores-motor";
import { calcularCorteCliente, lerConfig } from "./indicadores.server";
import { colunasMatriz, montarMatriz, opcoesDimensoes, somarPadraoPorDia, type ConfigMatriz, type FiltrosMatriz, type LinhaCorteMatriz } from "./matriz";

async function lerTudo(q: () => any): Promise<any[]> {
  const out: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export async function lerLeiturasCards(db: SupabaseClient, clienteId: string): Promise<Leitura[]> {
  const leituras = await lerTudo(() =>
    db.from("elora_cards_historico").select("card_id, visto_em, estimado, etapa_id, etapa_titulo, status, campos").eq("cliente_id", clienteId).order("id"),
  );
  if (!leituras.length) return [];
  const cards = await lerTudo(() => db.from("elora_cards_espelho").select("externo_id, criado_em").eq("cliente_id", clienteId).order("externo_id"));
  const criados = new Map(cards.map((c: any) => [String(c.externo_id), c.criado_em as string | null]));
  return leituras.map((l: any) => ({ ...l, card_id: String(l.card_id), criado_em: criados.get(String(l.card_id)) ?? null }));
}

/** Linhas padrão por dia/canal/atendente/equipe: gravadas quando o dia existe, senão calculadas. */
export async function linhasPadrao(db: SupabaseClient, clienteId: string, p: Periodo, soContatos?: Set<string>): Promise<LinhaCorteMatriz[]> {
  if (soContatos) {
    // com filtro por campo, tudo vem do motor restrito ao conjunto de contatos
    const calc = await calcularCorteCliente(db, clienteId, p, soContatos);
    return calc.linhas as any;
  }
  const cols = COLUNAS_PADRAO.map((c) => c.chave).join(", ");
  const gravadas = await lerTudo(() =>
    db.from("elora_relatorio_diario").select(`data, canal, atendente, equipe, ${cols}`).eq("cliente_id", clienteId).gte("data", p.de).lte("data", p.ate).order("id"),
  );
  const out: LinhaCorteMatriz[] = gravadas.map((r: any) => ({ ...r, dia: String(r.data), canal: r.canal ?? "", atendente: r.atendente ?? "", equipe: r.equipe ?? "" }));
  const comDado = new Set(out.map((l) => l.dia));
  const faltam = listaDias(p).filter((d) => !comDado.has(d));
  if (faltam.length) {
    const calc = await calcularCorteCliente(db, clienteId, { de: faltam[0], ate: faltam[faltam.length - 1] });
    const set = new Set(faltam);
    for (const l of calc.linhas) if (set.has(l.dia)) out.push(l as any);
  }
  return out;
}

export async function montarMatrizCliente(
  db: SupabaseClient,
  clienteId: string,
  p: Periodo,
  filtros: FiltrosMatriz,
  opcoes: { rascunho?: ConfigMatriz; comCatalogo?: boolean; campos?: FiltroCampo[] } = {},
) {
  let filtro: { contatos: Set<string>; cards: Set<string> } | null = null;
  let catalogo: any[] = [];
  if (opcoes.campos?.length || opcoes.comCatalogo) {
    const { catalogoDoCliente } = await import("./campos-elora.server");
    const { aplicarFiltrosCampos, catalogoVisivel } = await import("./campos-elora");
    const cat = await catalogoDoCliente(db, clienteId);
    if (opcoes.campos?.length) filtro = aplicarFiltrosCampos(cat.base, opcoes.campos);
    if (opcoes.comCatalogo)
      catalogo = catalogoVisivel(cat.catalogo, "coluna").map((g) => ({ fonte: g.fonte, nome: g.nome, campos: g.campos.map((c) => ({ campo: c.campo, rotulo: c.rotulo, preenchidos: c.preenchidos })) }));
  }
  const salvas = (await lerConfig(db, clienteId)) as ConfigMatriz[];
  const configs = opcoes.rascunho ? [...salvas.filter((c) => c.chave !== opcoes.rascunho!.chave), opcoes.rascunho] : salvas;
  const precisaCards = configs.some((c) => c.ativo && ehCombinadaDeCard(c)) || opcoes.comCatalogo;
  const [linhas, leituras, manuaisRaw] = await Promise.all([
    linhasPadrao(db, clienteId, p, filtro?.contatos),
    precisaCards ? lerLeiturasCards(db, clienteId) : Promise.resolve([] as Leitura[]),
    lerTudo(() => db.from("elora_matriz_manual" as any).select("coluna_chave, data, valor").eq("cliente_id", clienteId).gte("data", p.de).lte("data", p.ate).order("id")),
  ]);
  const m: PorDia = somarPadraoPorDia(linhas, filtros);
  calcularIndicadoresCards(configs, filtro ? leituras.filter((l) => filtro!.cards.has(l.card_id)) : leituras, m);
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
  return {
    ...r,
    todasColunas: todas,
    opcoes: opcoesDimensoes(linhas),
    temCards: leituras.length > 0,
    etapas: opcoes.comCatalogo ? etapas : [],
    catalogo: catalogo as { fonte: "card" | "contato" | "atendimento" | "utm"; nome: string; campos: { campo: string; rotulo: string; preenchidos: number }[] }[],
  };
}
