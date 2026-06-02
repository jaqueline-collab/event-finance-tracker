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
  valorMensal: number;
  valorSetup: number;
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
  planoId: string | null;
  parceiroId?: string | null;
  dataInicio: string;
  dataVencimento: string | null;
  dataChurn: string | null;
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