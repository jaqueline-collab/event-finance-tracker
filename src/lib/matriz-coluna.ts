/** Coluna da Matriz: esquema e linha gravada (compartilhado por Matriz e assistente). */
import { z } from "zod";
import { ehChavePadrao } from "@/lib/matriz";

const campoRef = z.object({ fonte: z.enum(["card", "contato", "atendimento", "utm"]), campo: z.string().min(1).max(200) });
const condicao = z.object({ campo: campoRef, operador: z.enum(["preenchido", "vazio", "igual", "contem"]), valor: z.string().max(300).optional() });
const grupo = z.object({ op: z.enum(["E", "OU"]), itens: z.array(condicao).max(20) });
const evento = z.union([
  z.object({ tipo: z.literal("entrou_etapa"), etapa: z.string().min(1).max(200) }),
  z.object({ tipo: z.literal("virou_ganho") }),
  z.object({ tipo: z.literal("virou_perdido") }),
  z.object({ tipo: z.literal("campo_preenchido"), campo: campoRef }),
  z.object({ tipo: z.literal("foi_criado") }),
]);
export const coluna = z.object({
  chave: z.string().max(60).optional(),
  nome: z.string().trim().min(1).max(60),
  tipo: z.enum(["app", "manual", "combinada", "formula"]),
  formato: z.enum(["numero", "percentual", "moeda"]).default("numero"),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).max(1000).optional(),
  fonte: z.enum(["contatos", "conversas", "cards"]).default("cards"),
  medida: z.enum(["contagem", "soma", "media"]).default("contagem"),
  evento: evento.optional(),
  condicoes: grupo.default({ op: "E", itens: [] }),
  formula: z.object({ op: z.enum(["soma", "diferenca", "razao", "percentual"]), a: z.string().max(60), b: z.string().max(60) }).optional().nullable(),
});
export type Coluna = z.infer<typeof coluna>;

export function paraLinha(clienteId: string, c: Coluna, chave: string, ordem: number) {
  const padrao = ehChavePadrao(chave);
  return {
    cliente_id: clienteId,
    chave,
    nome: c.nome,
    tipo: padrao ? "app" : c.tipo,
    fonte: padrao ? "contatos" : c.fonte,
    medida: c.medida,
    evento: c.tipo === "combinada" && !padrao ? (c.evento ?? {}) : {},
    condicoes: c.tipo === "combinada" && !padrao ? c.condicoes : { op: "E", itens: [] },
    formula: c.tipo === "formula" && !padrao ? (c.formula ?? null) : null,
    formato: c.formato,
    ordem,
    ativo: c.ativo,
    atualizado_em: new Date().toISOString(),
  };
}

