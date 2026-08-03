import { z } from "zod";

export const painelParceiroSchema = z.object({}).passthrough().optional().default({});

export const concederAcessoSchema = z.object({
  parceiroId: z.string().min(1, "Parceiro obrigatório"),
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
});

export const toggleAcessoSchema = z.object({
  id: z.string().min(1),
  ativo: z.boolean().default(true),
  remover: z.boolean().default(false),
});
