/**
 * Painel incorporado (link sem login, só leitura, dentro do Elora App). Regras puras:
 * privacidade dos blocos, versão pedida por quem vê e endereço que pode emoldurar o link.
 */
import type { CartaoGrafico, CampoRef } from "./graficos";

/** Único endereço que pode exibir o link numa moldura (iframe). */
export const ORIGEM_MOLDURA = "https://app.eloracrm.com.br";
export const CSP_INCORPORADO = `frame-ancestors ${ORIGEM_MOLDURA}`;
export const PREFIXO_INCORPORADO = "/incorporado";
/** Rota do link: o token vai depois do "#", que o navegador nunca envia ao servidor. */
export const ehRotaIncorporada = (pathname: string) => pathname === PREFIXO_INCORPORADO || pathname.startsWith(`${PREFIXO_INCORPORADO}/`);
/** Mascara qualquer trecho com cara de token (registros de erro nunca levam o link). */
export const mascararToken = (s: string) => s.replace(/([?&]k=)[A-Za-z0-9_-]{20,}/g, "$1[oculto]").replace(/(incorporado[/#])[A-Za-z0-9_-]{20,}/g, "$1[oculto]").replace(/[A-Za-z0-9_-]{40,64}/g, "[oculto]");

const PESSOAIS = new Set(["contato|nome", "contato|telefone", "card|id"]);
const ehPessoal = (r?: CampoRef | null) => Boolean(r && PESSOAIS.has(`${r.fonte}|${r.campo}`));

/** Bloco que mostra nome, telefone ou item a item de paciente/contato (tabela de itens, calendário, agrupado por nome). */
export function cartaoComDadosPessoais(c: CartaoGrafico): boolean {
  if (c.tipo === "tabela_itens" || c.tipo === "calendario") return true;
  return ehPessoal(c.dimensao) || ehPessoal(c.serie) || c.agrupar.some(ehPessoal) || c.camposData.some(ehPessoal);
}

/** Blocos que o link mostra: os mesmos do painel (sem os ocultos da visão); com "ocultar dados de pacientes", sem os de nome/telefone. */
export function cartoesDoLink(cartoes: CartaoGrafico[], ocultos: string[], ocultarPessoais: boolean): CartaoGrafico[] {
  return cartoes.filter((c) => !ocultos.includes(c.id) && !(ocultarPessoais && cartaoComDadosPessoais(c)));
}

const chaveMedida = (x: { fonte: string; medida?: string; campoMedida?: CampoRef | null; serie?: CampoRef | null; painel?: string }) =>
  JSON.stringify([x.fonte, x.medida ?? "contagem", x.campoMedida ?? null, x.serie ?? null, x.painel ?? null]);

/**
 * Versão do bloco usada no cálculo: sempre a gravada; de quem vê só entram as trocas que o próprio
 * bloco oferece (medidas alternáveis e campos de data do calendário). Nada mais vem do navegador.
 */
export function cartaoPedido(gravado: CartaoGrafico, pedido: Partial<CartaoGrafico>): CartaoGrafico {
  let c: CartaoGrafico = { ...gravado };
  const alvo = chaveMedida({ fonte: pedido.fonte ?? gravado.fonte, medida: pedido.medida, campoMedida: pedido.campoMedida, serie: pedido.serie, painel: pedido.painel });
  const alt = gravado.medidasAlternaveis.find((a) => chaveMedida(a) === alvo);
  if (alt) c = { ...c, fonte: alt.fonte, medida: alt.medida, campoMedida: alt.campoMedida ?? null, serie: alt.serie ?? null, painel: alt.painel };
  const d = pedido.dimensao;
  if (d && gravado.tipo === "calendario" && gravado.camposData.some((x) => x.fonte === d.fonte && x.campo === d.campo)) c = { ...c, dimensao: d };
  return c;
}

/** Token longo e aleatório (32 bytes, base64url) e seu hash SHA-256 (só o hash é guardado). */
export function novoToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function hashToken(token: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export const tokenValido = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(t);
