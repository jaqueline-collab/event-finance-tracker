export type TipoCusto = "ferramenta" | "app" | "mau" | "extra";

export interface CustoBase {
  id: string;
  nome: string;
  tipo: TipoCusto;
  custoUnitario: number;
  precoCliente: number;
  unidade?: string; // ex: "por usuário", "por MAU"
}

export interface Plano {
  id: string;
  nome: string;
  valorMensal: number;
  valorSetup: number;
  appsInclusos: number;
  mauInclusos: number;
  observacao?: string;
}

export type TipoMovimento =
  | "setup"
  | "ativacao"
  | "upgrade"
  | "downgrade"
  | "ajuste"
  | "churn"
  | "servico";

export interface Cliente {
  id: string;
  nome: string;
  planoId: string | null;
  dataInicio: string; // ISO date
  dataChurn: string | null;
  apps: number;
  mau: number;
  canais: number;
  usuariosAtivos: number;
  contatosAtivos: number;
  agentesIA: boolean;
  asaas: boolean;
  zapi: boolean;
  transcricaoIA: boolean;
  extras: Record<string, number>; // custoId -> quantidade
  observacao?: string;
}

export interface Movimento {
  id: string;
  clienteId: string;
  data: string; // ISO date
  tipo: TipoMovimento;
  planoId?: string | null;
  apps?: number;
  mau?: number;
  canais?: number;
  usuariosAtivos?: number;
  contatosAtivos?: number;
  agentesIA?: boolean;
  asaas?: boolean;
  zapi?: boolean;
  transcricaoIA?: boolean;
  extras?: Record<string, number>;
  valorServico?: number; // para tipo "servico" (receita avulsa)
  observacao?: string;
}