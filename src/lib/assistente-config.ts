/**
 * Assistente de configuração (Elora em modo administrador): propostas e regras puras.
 * Propostas nunca gravam; só "Aplicar" (função de servidor, super admin) grava.
 * Escrita limitada a configuração do cliente aberto.
 */
import { z } from "zod";
import { filtroCampoSchema } from "./campos-elora";
import { cartaoSchema } from "./graficos";
import { coluna } from "./matriz-coluna";

const base = { clienteId: z.string().min(1).max(100), motivo: z.string().max(1500).default("") };
export const propostaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("cartao"), visaoId: z.string().uuid(), cartao: cartaoSchema, ...base }),
  z.object({ tipo: z.literal("layout"), visaoId: z.string().uuid(), cartoes: z.array(cartaoSchema).max(40), ...base }),
  z.object({ tipo: z.literal("filtros_visao"), visaoId: z.string().uuid(), filtros: z.array(filtroCampoSchema).max(20), ...base }),
  z.object({ tipo: z.literal("coluna_matriz"), coluna, ...base }),
  z.object({ tipo: z.literal("ajuste_campo"), fonte: z.enum(["contato", "atendimento", "card", "utm"]), campo: z.string().min(1).max(200), rotulo: z.string().trim().max(80).nullable(), oculto: z.boolean(), ...base }),
]);
export type Proposta = z.infer<typeof propostaSchema>;
export const TIPOS_PROPOSTA = ["cartao", "layout", "filtros_visao", "coluna_matriz", "ajuste_campo"] as const;

/** Únicas tabelas que o assistente pode alterar (todas de configuração). */
export const TABELAS_PERMITIDAS = ["elora_dashboard_visoes", "elora_indicadores_config", "elora_campos_ajustes"] as const;
export type TabelaPermitida = (typeof TABELAS_PERMITIDAS)[number];

export function tabelaDa(p: Proposta): TabelaPermitida {
  switch (p.tipo) {
    case "cartao": case "layout": case "filtros_visao": return "elora_dashboard_visoes";
    case "coluna_matriz": return "elora_indicadores_config";
    case "ajuste_campo": return "elora_campos_ajustes";
  }
}

/** Alvo legível e estável da ação (para registro e desfazer). */
export function alvoDa(p: Proposta): string {
  switch (p.tipo) {
    case "cartao": case "layout": case "filtros_visao": return `visao:${p.visaoId}`;
    case "coluna_matriz": return `indicador:${p.coluna.chave ?? p.coluna.nome}`;
    case "ajuste_campo": return `campo:${p.fonte}|${p.campo}`;
  }
}

export function ehTabelaPermitida(t: string): t is TabelaPermitida {
  return (TABELAS_PERMITIDAS as readonly string[]).includes(t);
}

/** Valida a proposta e garante que é do cliente da sessão de edição. */
export function validarProposta(entrada: unknown, clienteDaSessao: string): Proposta {
  const p = propostaSchema.parse(entrada);
  if (p.clienteId !== clienteDaSessao) throw new Error("acesso-negado: a proposta é de outro cliente.");
  if (!ehTabelaPermitida(tabelaDa(p))) throw new Error("acesso-negado: alvo fora da configuração.");
  return p;
}

/** Nome do campo existe em mais de uma fonte: o assistente pergunta antes de sugerir. */
export function nomesAmbiguos(grupos: { fonte: string; campos: { campo: string; rotulo: string; oculto?: boolean }[] }[]): { nome: string; fontes: string[] }[] {
  const m = new Map<string, Set<string>>();
  for (const g of grupos) for (const c of g.campos) {
    if (c.oculto) continue;
    const k = c.rotulo.trim().toLowerCase();
    if (!k) continue;
    (m.get(k) ?? m.set(k, new Set()).get(k)!).add(g.fonte);
  }
  return [...m.entries()].filter(([, f]) => f.size > 1).map(([nome, f]) => ({ nome, fontes: [...f] }));
}

/** Descrição curta da proposta para o registro. */
export function descreverProposta(p: Proposta): string {
  switch (p.tipo) {
    case "cartao": return `Bloco "${p.cartao.titulo}" (${p.cartao.tipo})`;
    case "layout": return `Layout da visão (${p.cartoes.length} blocos)`;
    case "filtros_visao": return `Filtros padrão da visão (${p.filtros.length})`;
    case "coluna_matriz": return `Coluna da Matriz "${p.coluna.nome}"`;
    case "ajuste_campo": return `Campo ${p.fonte}.${p.campo}: ${p.oculto ? "oculto" : "visível"}${p.rotulo ? `, rótulo "${p.rotulo}"` : ""}`;
  }
}

export const INSTRUCOES_ADMIN = [
  "MODO ASSISTENTE DE CONFIGURAÇÃO (só super admin, só o cliente aberto):",
  "- Você ajuda a mapear campos e montar blocos, colunas da Matriz, indicadores, rótulos/ocultações e filtros padrão.",
  "- Antes de sugerir, leia o catálogo (ler_catalogo) e as definições (ler_definicoes). Explique o motivo e a fonte (Contato, Atendimento, Card, UTM) de cada campo usado.",
  "- Se o mesmo nome existir em mais de uma fonte (campo 'ambiguos' do catálogo), pergunte qual fonte usar antes de propor.",
  "- Use só as ferramentas propor_*. Elas NÃO gravam nada: geram uma proposta com prévia e os botões Aplicar e Descartar. Nunca diga que aplicou ou salvou; diga que a proposta está pronta para a pessoa aplicar.",
  "- Você nunca altera dados do Elora, mensagens, chaves, financeiro nem outros clientes.",
].join("\n");
