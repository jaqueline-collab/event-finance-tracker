/** Leitura e cálculo pelo link incorporado (sem login). Só servidor. */
import { cartaoPedido, cartoesDoLink, hashToken } from "@/lib/incorporar";
import { cartoesValidos, type CartaoGrafico } from "@/lib/graficos";
import { filtrosFixosValidos } from "@/lib/filtros-fixos";
import type { FiltroCampo } from "@/lib/campos-elora";

/** Link válido → cliente, visão e blocos que o link pode mostrar. Inválido ou revogado → null. */
export async function abrirLink(db: any, t: string, registrarAcesso: boolean) {
  const { data: l } = await db.from("elora_paineis_incorporados").select("id, cliente_id, visao_id, dados_pessoais").eq("token_hash", await hashToken(t)).is("revogado_em", null).maybeSingle();
  if (!l) return null;
  const { data: v } = await db.from("elora_dashboard_visoes").select("id, nome, publicada, filtros").eq("id", l.visao_id).eq("cliente_id", l.cliente_id).maybeSingle();
  if (!v?.publicada) return null;
  if (registrarAcesso) await db.from("elora_paineis_incorporados").update({ ultimo_acesso_em: new Date().toISOString() }).eq("id", l.id);
  const ocultos = Array.isArray(v.filtros?.cartoesOcultos) ? v.filtros.cartoesOcultos.map(String) : [];
  return {
    clienteId: String(l.cliente_id),
    visaoNome: String(v.nome),
    cartoes: cartoesDoLink(cartoesValidos(v.filtros?.cartoes), ocultos, Boolean(l.dados_pessoais)),
    fixos: filtrosFixosValidos(v.filtros?.filtrosFixos),
    padrao: filtrosFixosValidos(v.filtros?.filtrosPadrao),
  };
}


/** Mesmo cálculo e cache do painel normal (a chave já inclui o cliente); quem vê é o próprio cliente. */
export async function calcularPeloLink(db: any, t: string, p: { de: string; ate: string; cartoes: CartaoGrafico[]; filtrosVisao: FiltroCampo[] }) {
  const l = await abrirLink(db, t, false);
  if (!l) throw new Error("link-invalido: este link foi revogado ou não existe.");
  const { calcularCartoesServidor } = await import("@/lib/cartao-calculo.server");
  const gravados = new Map(l.cartoes.map((c) => [c.id, c]));
  const cartoes = p.cartoes.filter((c) => gravados.has(c.id)).map((c) => cartaoPedido(gravados.get(c.id)!, c));
  if (!cartoes.length) return {};
  return calcularCartoesServidor(db, { clienteId: l.clienteId, de: p.de, ate: p.ate, filtrosVisao: [...l.fixos, ...p.filtrosVisao] }, cartoes, { semDinheiro: false }, { usarCache: true });
}

export async function itensDiaPeloLink(db: any, t: string, p: { dia: string; cartao: CartaoGrafico; filtrosVisao: FiltroCampo[] }) {
  const l = await abrirLink(db, t, false);
  if (!l) throw new Error("link-invalido: este link foi revogado ou não existe.");
  const gravado = l.cartoes.find((c) => c.id === p.cartao.id);
  // Calendário só existe no link quando a super admin liberou dados pessoais.
  if (!gravado || gravado.tipo !== "calendario" || gravado.medida === "indicador") return { itens: [] };
  const { catalogoDoCliente } = await import("@/lib/campos-elora.server");
  const { itensDoDia } = await import("@/lib/graficos");
  const cat = await catalogoDoCliente(db, l.clienteId);
  return { itens: itensDoDia(cat.base, cartaoPedido(gravado, p.cartao), p.dia, [...l.fixos, ...p.filtrosVisao] as any, false) };
}
