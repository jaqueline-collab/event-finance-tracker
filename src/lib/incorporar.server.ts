/** Leitura e cálculo pelo link incorporado (sem login). Só servidor. */
import { cartaoPedido, cartoesDoLink, hashToken } from "@/lib/incorporar";
import { cartoesDaMatriz, cartoesValidos, VISAO_MATRIZ_ID, type CartaoGrafico } from "@/lib/graficos";
import { filtrosFixosValidos } from "@/lib/filtros-fixos";
import { filtrosPadraoValidos, type FiltroCampo } from "@/lib/campos-elora";

export type AbaLink = { id: string; nome: string; matriz: boolean; cartoes: CartaoGrafico[]; fixos: FiltroCampo[]; padrao: FiltroCampo[] };
const NOME_MATRIZ = "Relatório diário";

/**
 * Link válido → cliente e abas (lidas a cada chamada: visão nova visível aparece, oculta some).
 * "Todas as visões" (visao_id vazio) segue a mesma ordem e nomes do painel do cliente, com o Relatório diário.
 * Inválido, revogado ou sem visão visível → null.
 */
export async function abrirLink(db: any, t: string, registrarAcesso: boolean) {
  const { data: l } = await db.from("elora_paineis_incorporados").select("id, cliente_id, visao_id, ocultar_pessoais").eq("token_hash", await hashToken(t)).is("revogado_em", null).maybeSingle();
  if (!l) return null;
  const clienteId = String(l.cliente_id);
  const ocultar = Boolean(l.ocultar_pessoais);
  let q = db.from("elora_dashboard_visoes").select("id, nome, ordem, publicada, filtros").eq("cliente_id", clienteId).eq("publicada", true).order("ordem", { ascending: true });
  if (l.visao_id) q = q.eq("id", l.visao_id);
  const { data: vs } = await q;
  const abas: AbaLink[] = (vs ?? []).map((v: any) => {
    const ocultos = Array.isArray(v.filtros?.cartoesOcultos) ? v.filtros.cartoesOcultos.map(String) : [];
    return {
      id: String(v.id), nome: String(v.nome), matriz: false,
      cartoes: cartoesDoLink(cartoesValidos(v.filtros?.cartoes), ocultos, ocultar),
      fixos: filtrosFixosValidos(v.filtros?.filtrosFixos),
      padrao: filtrosFixosValidos(v.filtros?.filtrosPadrao),
    };
  });
  if (!l.visao_id) {
    const { data: cfg } = await db.from("elora_relatorio_corte_config").select("matriz_nome, matriz_ordem, matriz_cartoes, matriz_filtros_padrao").eq("cliente_id", clienteId).maybeSingle();
    const pos = typeof cfg?.matriz_ordem === "number" ? Math.min(Math.max(cfg.matriz_ordem, 0), abas.length) : abas.length;
    abas.splice(pos, 0, {
      id: VISAO_MATRIZ_ID, nome: (cfg?.matriz_nome as string | null)?.trim() || NOME_MATRIZ, matriz: true,
      cartoes: cartoesDoLink(cartoesDaMatriz(cfg?.matriz_cartoes), [], ocultar), fixos: [], padrao: filtrosPadraoValidos(cfg?.matriz_filtros_padrao),
    });
  }
  if (!abas.length) return null;
  if (registrarAcesso) await db.from("elora_paineis_incorporados").update({ ultimo_acesso_em: new Date().toISOString() }).eq("id", l.id);
  return { clienteId, abas };
}

const INVALIDO = "link-invalido: este link foi revogado ou não existe.";
async function aba(db: any, t: string, abaId: string) {
  const l = await abrirLink(db, t, false);
  if (!l) throw new Error(INVALIDO);
  const a = l.abas.find((x) => x.id === abaId);
  if (!a) throw new Error("aba-indisponivel: esta visão não está mais visível.");
  return { clienteId: l.clienteId, a };
}

/** Mesmo cálculo e cache do painel normal (a chave já inclui o cliente); quem vê é o próprio cliente. */
export async function calcularPeloLink(db: any, t: string, p: { abaId: string; de: string; ate: string; cartoes: CartaoGrafico[]; filtrosVisao: FiltroCampo[] }) {
  const { clienteId, a } = await aba(db, t, p.abaId);
  const { calcularCartoesServidor } = await import("@/lib/cartao-calculo.server");
  const gravados = new Map(a.cartoes.map((c) => [c.id, c]));
  const cartoes = p.cartoes.filter((c) => gravados.has(c.id)).map((c) => cartaoPedido(gravados.get(c.id)!, c));
  if (!cartoes.length) return {};
  return calcularCartoesServidor(db, { clienteId, de: p.de, ate: p.ate, filtrosVisao: [...a.fixos, ...p.filtrosVisao] }, cartoes, { semDinheiro: false }, { usarCache: true });
}

export async function itensDiaPeloLink(db: any, t: string, p: { abaId: string; dia: string; cartao: CartaoGrafico; filtrosVisao: FiltroCampo[] }) {
  const { clienteId, a } = await aba(db, t, p.abaId);
  const gravado = a.cartoes.find((c) => c.id === p.cartao.id);
  if (!gravado || gravado.tipo !== "calendario" || gravado.medida === "indicador") return { itens: [] };
  const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
  const { itensDoDia } = await import("@/lib/graficos");
  const cat = await catalogoDoCliente(db, clienteId);
  return { itens: itensDoDia(cat.base, cartaoPedido(gravado, p.cartao), p.dia, [...a.fixos, ...p.filtrosVisao] as any, false) };
}

/** Relatório diário pelo link: a mesma leitura de quem vê o painel (sem edição), todas as colunas visíveis ao cliente. */
export async function matrizPeloLink(db: any, t: string, p: { de: string; ate: string; filtros: Record<string, unknown>; campos: FiltroCampo[] }) {
  const { clienteId, a } = await aba(db, t, VISAO_MATRIZ_ID);
  const { montarMatrizCliente } = await import("@/lib/matriz.server");
  const { comCacheCalculo } = await import("@/lib/cartao-calculo.server");
  const { criarContexto } = await import("@/lib/calculo-contexto.server");
  const r = await comCacheCalculo(db, clienteId, ["matriz", false, p.de, p.ate, p.filtros, p.campos], () =>
    montarMatrizCliente(db, clienteId, { de: p.de, ate: p.ate }, p.filtros as any, { comCatalogo: false, campos: p.campos as any, ctx: criarContexto() }),
  );
  return {
    podeEditar: false, filtrosPadrao: a.padrao, colunas: r.colunas, todasColunas: r.colunas, linhas: r.linhas, total: r.total, cobertura: r.cobertura,
    semHistoricoAntes: r.semHistoricoAntes, colunasSemHistorico: r.colunasSemHistorico, erros: [], opcoes: r.opcoes, temCards: r.temCards, etapas: r.etapas, catalogo: r.catalogo,
  };
}
