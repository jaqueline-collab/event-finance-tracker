export type TipoCusto = "ferramenta" | "app" | "mau" | "extra";

export interface CustoBase {
  id: string;
  nome: string;
  tipo: TipoCusto;
  custoUnitario: number;
  precoCliente: number;
  unidade?: string;
}

export interface Plano {
  id: string;
  nome: string;
  // Categoria do produto vendido
  categoria: "elora" | "consultoria";
  // Tipo de cobrança
  cobranca: "recorrente" | "unica";
  // Duração opcional (válido tanto para recorrente quanto única)
  duracaoValor?: number | null;
  duracaoUnidade?: "dias" | "meses" | "anos" | null;
  valorMensal: number;
  valorSetup: number;
  // Dia padrão de vencimento (1-31). Cliente pode sobrescrever via Cliente.dataVencimento.
  diaVencimento?: number | null;
  // Ciclo de faturamento padrão (dias 1-31). Cliente pode sobrescrever.
  cicloDiaInicial?: number | null;
  cicloDiaFinal?: number | null;
  // Quando true, movimentos no meio do ciclo são cobrados proporcionalmente.
  cobrancaProporcional?: boolean;
  // Franquias incluídas no plano
  canaisInclusos: number;
  usuariosInclusos: number;
  contatosInclusos: number;
  // Franquias por tipo de canal (substitui canaisInclusos genérico)
  canaisWhatsInclusos: number;
  canaisInstaInclusos: number;
  canaisMessengerInclusos: number;
  // Módulos opcionais incluídos
  incluiIA: boolean;
  incluiAsaas: boolean;
  incluiZapi: number;
  incluiTranscricao: boolean;
  // Custos Helena configuráveis (permitem override por plano)
  licencaBase: number;       // default 149.90
  precoCanaisExc: number;    // custo por canal excedente (default 29.90)
  precoUsuariosExc: number;  // custo por usuário excedente (default 19.90)
  precoContatosExc: number;  // custo por contato excedente (default 0.045)
  precoIA: number;           // custo módulo IA (default 50.00)
  precoAsaas: number;        // custo módulo ASAAS (default 49.50)
  precoZapi: number;         // custo módulo Z-API (default 69.00)
  precoTranscricaoUser: number; // custo transcrição por usuário (default 3.99)
  // Custo Helena por tipo de canal excedente
  precoCanalWhatsExc: number;
  precoCanalInstaExc: number;
  precoCanalMessengerExc: number;
  // Preços de venda ao cliente (comercialização de excedentes e opcionais)
  valorCanaisExc: number;       // preço cobrado por canal excedente
  valorUsuariosExc: number;     // preço cobrado por usuário excedente
  valorContatosExc: number;     // preço cobrado por contato excedente
  valorIA: number;              // preço cobrado pelo módulo IA
  valorAsaas: number;           // preço cobrado pelo módulo ASAAS
  valorZapi: number;            // preço cobrado pelo módulo Z-API
  valorTranscricaoUser: number; // preço cobrado por transcrição por usuário
  // Preço cobrado ao cliente por tipo de canal excedente
  valorCanalWhatsExc: number;
  valorCanalInstaExc: number;
  valorCanalMessengerExc: number;
  // Parceiros vinculados a este plano
  parceiroIds: string[];
  observacao?: string;
}

export interface Parceiro {
  id: string;
  nome: string;
  email: string;
  celular: string;
  planosVinculados: string[];
  observacao?: string;
  criadoEm: string;
}

export type TipoMovimento =
  | "setup"
  | "upgrade"
  | "downgrade"
  | "churn"
  | "servico";

export interface Cliente {
  id: string;
  nome: string;
  nomeFinanceiro?: string | null;
  planoId: string | null;
  parceiroId?: string | null;
  dataInicio: string;
  dataVencimento: string | null;
  dataChurn: string | null;
  // Ciclo de faturamento personalizado (sobrescreve o do plano quando ciclo_personalizado = true)
  cicloPersonalizado?: boolean;
  cicloDiaInicial?: number | null;
  cicloDiaFinal?: number | null;
  apps: number;
  mau: number;
  canais: number;
  canaisZapi: number;
  canaisWhats?: number;
  canaisInsta?: number;
  canaisMessenger?: number;
  usuariosAtivos: number;
  contatosAtivos: number;
  agentesIA: boolean;
  asaas: boolean;
  zapi: boolean;
  transcricaoIA: boolean;
  valorSetupPago: number;
  valorAcompanhamento: number;
  extras: Record<string, number>;
  observacao?: string;
}

export interface Movimento {
  id: string;
  clienteId: string;
  data: string;
  tipo: TipoMovimento;
  planoId?: string | null;
  apps?: number;
  mau?: number;
  canais?: number;
  canaisWhats?: number;
  canaisInsta?: number;
  canaisMessenger?: number;
  canaisZapi?: number;
  usuariosAtivos?: number;
  contatosAtivos?: number;
  agentesIA?: boolean;
  asaas?: boolean;
  zapi?: boolean;
  transcricaoIA?: boolean;
  extras?: Record<string, number>;
  valorServico?: number;
  observacao?: string;
}

export type StatusFinanceiro = "pago" | "pendente" | "cancelado";
export type TipoFinanceiro = "custo" | "fechamento";

export interface LancamentoFinanceiro {
  id: string;
  descricao: string;
  tipo: TipoFinanceiro;
  categoria?: string;
  valor: number;
  vencimento: string | null;
  competencia?: string | null;
  status: StatusFinanceiro;
  nfEmitida: boolean;
  nfNumero?: string;
  observacao?: string;
  criadoEm?: string;
}

// Descontos aplicados em fechamentos mensais.
// - tipo "valor": abatimento fixo em R$
// - tipo "percentual": abatimento em % sobre o subtotal
// - tipo "isencao_total": zera a fatura
// - escopo "cliente": atinge apenas o cliente_id informado
// - escopo "fechamento_inteiro": atinge o fechamento todo
// - recorrente: se true, vale a partir de competenciaInicio em diante (até competenciaFim opcional);
//   se false, vale apenas em competenciaInicio.
export interface Desconto {
  id: string;
  clienteId: string | null;
  tipo: "valor" | "percentual" | "isencao_total";
  escopo: "cliente" | "fechamento_inteiro";
  valor: number | null;
  competenciaInicio: string; // formato YYYY-MM
  competenciaFim: string | null;
  recorrente: boolean;
  motivo?: string | null;
}