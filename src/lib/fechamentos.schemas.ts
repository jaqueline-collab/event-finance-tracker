import { z } from "zod";

const lancamentoRowSchema = z.object({
  id: z.string().min(1).max(100),
  descricao: z.string().min(1).max(500),
  tipo: z.string().min(1).max(50),
  categoria: z.string().max(100).nullable().optional(),
  valor: z.number(),
  vencimento: z.string().nullable().optional(),
  competencia: z.string().max(200).nullable().optional(),
  status: z.string().min(1).max(50),
  nf_emitida: z.boolean(),
  nf_numero: z.string().max(100).nullable().optional(),
  observacao: z.string().nullable().optional(),
});

const fechamentoRowSchema = z.object({
  id: z.string().min(1).max(100),
  competencia: z.string().min(1).max(50),
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(1000).nullable().optional(),
  status: z.string().min(1).max(50),
  total_bruto: z.number(),
  total_desconto: z.number(),
  total_liquido: z.number(),
  observacao: z.string().nullable().optional(),
});

const fechamentoItemRowSchema = z.object({
  id: z.string().min(1).max(100),
  fechamento_id: z.string().min(1).max(100),
  cliente_id: z.string().min(1).max(100),
  plano_id: z.string().max(100).nullable().optional(),
  ciclo_inicio: z.string().nullable().optional(),
  ciclo_fim: z.string().nullable().optional(),
  vencimento: z.string().nullable().optional(),
  valor_bruto: z.number(),
  valor_desconto: z.number(),
  valor_liquido: z.number(),
  lancamento_financeiro_id: z.string().max(100).nullable().optional(),
  payload_snapshot: z.unknown().optional(),
});

export const gerarFechamentoInputSchema = z.object({
  fechamento: fechamentoRowSchema,
  itens: z.array(fechamentoItemRowSchema).max(500),
  lancamentos: z.array(lancamentoRowSchema).max(500),
});