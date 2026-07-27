/**
 * Fonte única dos custos unitários da WTS (tabela `elora_custos_wts`).
 *
 * Toda a lógica de custo do sistema (Dashboard, fechamento mensal, resumo do
 * cliente e rankings) lê os preços daqui. Nada de valor hardcoded espalhado
 * pelos cálculos: as constantes abaixo existem apenas como fallback offline
 * (primeiro render antes do sync, e SSR) e espelham exatamente o seed da tabela.
 */

export interface CustoWtsRow {
  itemKey: string;
  descricao: string;
  faixaMin: number;
  faixaMax: number | null;
  precoUnit: number;
  unidade?: string | null;
  ativo: boolean;
}

export type ItemCustoKey =
  | "licenca_base"
  | "canal_whats_exc"
  | "canal_insta_exc"
  | "canal_messenger_exc"
  | "usuario_exc"
  | "contato_exc"
  | "ia"
  | "asaas"
  | "zapi"
  | "transcricao_user"
  | "desconto_escala";

const FALLBACK: CustoWtsRow[] = [
  { itemKey: "licenca_base", descricao: "Licença base Helena", faixaMin: 0, faixaMax: null, precoUnit: 149.9, unidade: "mês", ativo: true },
  { itemKey: "canal_whats_exc", descricao: "Canal WhatsApp excedente (1º ao 4º)", faixaMin: 1, faixaMax: 4, precoUnit: 29.9, unidade: "canal", ativo: true },
  { itemKey: "canal_whats_exc", descricao: "Canal WhatsApp excedente (5º+)", faixaMin: 5, faixaMax: null, precoUnit: 19.9, unidade: "canal", ativo: true },
  { itemKey: "canal_insta_exc", descricao: "Canal Instagram excedente (1º ao 4º)", faixaMin: 1, faixaMax: 4, precoUnit: 29.9, unidade: "canal", ativo: true },
  { itemKey: "canal_insta_exc", descricao: "Canal Instagram excedente (5º+)", faixaMin: 5, faixaMax: null, precoUnit: 19.9, unidade: "canal", ativo: true },
  { itemKey: "canal_messenger_exc", descricao: "Canal Messenger excedente (1º ao 4º)", faixaMin: 1, faixaMax: 4, precoUnit: 29.9, unidade: "canal", ativo: true },
  { itemKey: "canal_messenger_exc", descricao: "Canal Messenger excedente (5º+)", faixaMin: 5, faixaMax: null, precoUnit: 19.9, unidade: "canal", ativo: true },
  { itemKey: "usuario_exc", descricao: "Usuário excedente (1º ao 17º)", faixaMin: 1, faixaMax: 17, precoUnit: 19.9, unidade: "usuário", ativo: true },
  { itemKey: "usuario_exc", descricao: "Usuário excedente (18º ao 97º)", faixaMin: 18, faixaMax: 97, precoUnit: 14.9, unidade: "usuário", ativo: true },
  { itemKey: "usuario_exc", descricao: "Usuário excedente (98º+)", faixaMin: 98, faixaMax: null, precoUnit: 12.9, unidade: "usuário", ativo: true },
  { itemKey: "contato_exc", descricao: "Contato ativo (5.000 a 20.000)", faixaMin: 5000, faixaMax: 20000, precoUnit: 0.045, unidade: "contato", ativo: true },
  { itemKey: "contato_exc", descricao: "Contato ativo (20.000 a 100.000)", faixaMin: 20000, faixaMax: 100000, precoUnit: 0.035, unidade: "contato", ativo: true },
  { itemKey: "contato_exc", descricao: "Contato ativo (100.000+)", faixaMin: 100000, faixaMax: null, precoUnit: 0.025, unidade: "contato", ativo: true },
  { itemKey: "ia", descricao: "Módulo Agentes de IA", faixaMin: 0, faixaMax: null, precoUnit: 50, unidade: "mês", ativo: true },
  { itemKey: "asaas", descricao: "Módulo ASAAS", faixaMin: 0, faixaMax: null, precoUnit: 49.5, unidade: "mês", ativo: true },
  { itemKey: "zapi", descricao: "Canal Z-API", faixaMin: 0, faixaMax: null, precoUnit: 69, unidade: "canal", ativo: true },
  { itemKey: "transcricao_user", descricao: "Transcrição de áudio por usuário", faixaMin: 0, faixaMax: null, precoUnit: 3.99, unidade: "usuário/mês", ativo: true },
  { itemKey: "desconto_escala", descricao: "Desconto de escala WTS 10%", faixaMin: 10000, faixaMax: 25000, precoUnit: 0.1, unidade: "percentual", ativo: true },
  { itemKey: "desconto_escala", descricao: "Desconto de escala WTS 15%", faixaMin: 25000, faixaMax: 50000, precoUnit: 0.15, unidade: "percentual", ativo: true },
  { itemKey: "desconto_escala", descricao: "Desconto de escala WTS 20%", faixaMin: 50000, faixaMax: 100000, precoUnit: 0.2, unidade: "percentual", ativo: true },
  { itemKey: "desconto_escala", descricao: "Desconto de escala WTS 25%", faixaMin: 100000, faixaMax: null, precoUnit: 0.25, unidade: "percentual", ativo: true },
];

let tabela: CustoWtsRow[] = FALLBACK;

/** Substitui a tabela em memória (chamado pelo sync do store). */
export function setTabelaCustosWts(rows: CustoWtsRow[]) {
  const ativos = rows.filter((r) => r.ativo);
  tabela = ativos.length > 0 ? ativos : FALLBACK;
}

export function getTabelaCustosWts(): CustoWtsRow[] {
  return tabela;
}

function faixas(itemKey: ItemCustoKey): CustoWtsRow[] {
  const rows = tabela.filter((r) => r.itemKey === itemKey);
  const base = rows.length > 0 ? rows : FALLBACK.filter((r) => r.itemKey === itemKey);
  return [...base].sort((a, b) => a.faixaMin - b.faixaMin);
}

/** Preço unitário simples (itens sem faixa: licença, IA, Asaas, Z-API, transcrição). */
export function precoUnitario(itemKey: ItemCustoKey): number {
  return faixas(itemKey)[0]?.precoUnit ?? 0;
}

/**
 * Custo escalonado por posição ordinal: cobra a unidade nº i pelo preço da
 * faixa que contém i. Usado para canais e usuários excedentes.
 */
export function custoEscalonadoPorQuantidade(itemKey: ItemCustoKey, quantidade: number): number {
  const qtd = Math.max(0, Math.floor(quantidade));
  if (qtd === 0) return 0;
  const fx = faixas(itemKey);
  let total = 0;
  for (const f of fx) {
    const inicio = Math.max(f.faixaMin, 1);
    const fim = f.faixaMax ?? Infinity;
    const de = Math.max(inicio, 1);
    const ate = Math.min(fim, qtd);
    if (ate >= de) total += (ate - de + 1) * f.precoUnit;
  }
  return total;
}

/**
 * Custo escalonado por volume absoluto: cada unidade é cobrada pelo preço da
 * faixa onde a posição absoluta dela cai. Usado para contatos ativos, onde a
 * cobrança só começa a partir da franquia do plano.
 */
export function custoEscalonadoPorVolume(
  itemKey: ItemCustoKey,
  posicaoInicial: number,
  quantidade: number,
): number {
  const qtd = Math.max(0, quantidade);
  if (qtd === 0) return 0;
  const inicio = Math.max(0, posicaoInicial);
  const fim = inicio + qtd;
  let total = 0;
  for (const f of faixas(itemKey)) {
    const de = Math.max(inicio, f.faixaMin);
    const ate = Math.min(fim, f.faixaMax ?? Infinity);
    if (ate > de) total += (ate - de) * f.precoUnit;
  }
  return total;
}

/** Desconto de escala da WTS aplicado sobre o custo bruto agregado da operação. */
export function calcularDescontoEscala(custoBruto: number): number {
  if (custoBruto <= 0) return 0;
  let desconto = 0;
  for (const f of faixas("desconto_escala")) {
    const de = Math.max(0, f.faixaMin);
    const ate = Math.min(custoBruto, f.faixaMax ?? Infinity);
    if (ate > de) desconto += (ate - de) * f.precoUnit;
  }
  return desconto;
}
