/**
 * Ferramentas do modo administrador da Elora. Só leitura e propostas:
 * nenhuma grava. Registradas apenas para super admin com o cliente aberto.
 */
import { tool } from "ai";
import { z } from "zod";
import { filtroCampoSchema } from "./campos-elora";
import { embrulharDado } from "./elora-ia";
import { cartaoSchema } from "./graficos";
import { coluna } from "./matriz-coluna";
import { descreverProposta, nomesAmbiguos, validarProposta, type Proposta } from "./assistente-config";

export type GrupoIa = { fonte: string; nome: string; campos: { campo: string; rotulo: string; tipo: string; preenchidos: number; oculto?: boolean }[] };
export type DepsAdmin = {
  catalogo: (clienteId: string) => Promise<GrupoIa[]>;
  definicoes: (clienteId: string) => Promise<{ etapas: { painel: string; etapa: string }[]; campanhas: string[]; etiquetas: string[]; canais: string[] }>;
  visoes: (clienteId: string) => Promise<{ id: string; nome: string; blocos: { id: string; titulo: string; tipo: string }[] }[]>;
};

export const NOMES_FERRAMENTAS_ADMIN = ["ler_catalogo", "ler_definicoes", "listar_visoes", "propor_bloco", "propor_layout", "propor_filtros_visao", "propor_coluna_matriz", "propor_ajuste_campo"] as const;

export function criarFerramentasAdmin(clienteId: string, deps: DepsAdmin) {
  const propor = (bruto: Record<string, unknown>) => {
    try {
      const proposta: Proposta = validarProposta({ ...bruto, clienteId }, clienteId);
      return { proposta, descricao: descreverProposta(proposta), aplicada: false, observacao: "Proposta pronta. Nada foi gravado; a pessoa decide em Aplicar ou Descartar." };
    } catch (e) {
      return { erro: e instanceof Error ? e.message.slice(0, 500) : "proposta inválida" };
    }
  };
  const motivo = z.string().max(1500).describe("Por que esta sugestão e de qual fonte vem cada campo");
  const visaoId = z.string().uuid().describe("id da visão (use listar_visoes)");
  return {
    ler_catalogo: tool({
      description: "Catálogo Campos do Elora do cliente aberto, por fonte, com nomes ambíguos (mesmo nome em mais de uma fonte).",
      inputSchema: z.object({}),
      execute: async () => {
        const g = await deps.catalogo(clienteId);
        return embrulharDado("catálogo", { grupos: g.map((x) => ({ fonte: x.fonte, campos: x.campos.filter((c) => !c.oculto && c.preenchidos > 0).map((c) => ({ campo: c.campo, rotulo: c.rotulo, tipo: c.tipo, preenchidos: c.preenchidos })) })), ambiguos: nomesAmbiguos(g) }, 200);
      },
    }),
    ler_definicoes: tool({
      description: "Etapas de funil (painel/etapa), campanhas, etiquetas e canais do cliente aberto.",
      inputSchema: z.object({}),
      execute: async () => embrulharDado("definições", await deps.definicoes(clienteId), 200),
    }),
    listar_visoes: tool({
      description: "Visões (abas) do painel do cliente e seus blocos.",
      inputSchema: z.object({}),
      execute: async () => embrulharDado("visões", await deps.visoes(clienteId), 200),
    }),
    propor_bloco: tool({
      description: "Propõe um bloco (gráfico, número, tabela, funil, calendário...) para uma visão. Não grava.",
      inputSchema: z.object({ visaoId, cartao: cartaoSchema, motivo }),
      execute: async (i) => propor({ tipo: "cartao", ...i }),
    }),
    propor_layout: tool({
      description: "Propõe a lista completa de blocos de uma visão com largura (3-12) e altura. Não grava.",
      inputSchema: z.object({ visaoId, cartoes: z.array(cartaoSchema).max(40), motivo }),
      execute: async (i) => propor({ tipo: "layout", ...i }),
    }),
    propor_filtros_visao: tool({
      description: "Propõe os filtros padrão de uma visão. Não grava.",
      inputSchema: z.object({ visaoId, filtros: z.array(filtroCampoSchema).max(20), motivo }),
      execute: async (i) => propor({ tipo: "filtros_visao", ...i }),
    }),
    propor_coluna_matriz: tool({
      description: "Propõe uma coluna/indicador da Matriz (ex.: Consulta agendada = card que entrou na etapa X com o campo Y preenchido). Não grava.",
      inputSchema: z.object({ coluna, motivo }),
      execute: async (i) => propor({ tipo: "coluna_matriz", ...i }),
    }),
    propor_ajuste_campo: tool({
      description: "Propõe rótulo ou ocultação de um campo do catálogo. Não grava.",
      inputSchema: z.object({ fonte: z.enum(["contato", "atendimento", "card", "utm"]), campo: z.string().min(1).max(200), rotulo: z.string().max(80).nullable(), oculto: z.boolean(), motivo }),
      execute: async (i) => propor({ tipo: "ajuste_campo", ...i }),
    }),
  };
}
