import type { Cliente, Movimento, Plano } from "../types";
import { getCicloCliente } from "./ciclo";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_ONLY_RE = /^\d{1,2}$/;

function toLocalNoonDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clampBillingDay(year: number, month: number, day: number): number {
  return Math.max(1, Math.min(day, new Date(year, month + 1, 0).getDate()));
}

export function parseDiaVencimento(value?: string | null): number | null {
  if (!value) return null;
  if (DAY_ONLY_RE.test(value)) {
    const dia = Number(value);
    return Number.isFinite(dia) ? Math.max(1, Math.min(dia, 31)) : null;
  }
  if (ISO_DATE_RE.test(value)) {
    return Number(value.slice(8, 10));
  }
  return null;
}

export function formatDiaVencimento(value?: string | null): string {
  const dia = parseDiaVencimento(value);
  return dia ? String(dia) : "—";
}

export function getDiaVencimentoEfetivo(
  cliente: Cliente,
  planos: Plano[],
): number | null {
  const doCliente = parseDiaVencimento(cliente.dataVencimento);
  if (doCliente) return doCliente;
  const plano = planos.find((p) => p.id === cliente.planoId);
  if (plano?.diaVencimento) {
    return Math.max(1, Math.min(plano.diaVencimento, 31));
  }
  return null;
}

export function normalizarDataVencimento(dataInicio: string, dataVencimento?: string | null): string | null {
  if (!ISO_DATE_RE.test(dataInicio)) return null;
  if (dataVencimento && ISO_DATE_RE.test(dataVencimento)) return dataVencimento;

  const inicio = toLocalNoonDate(dataInicio);
  const diaReferencia = parseDiaVencimento(dataVencimento) ?? inicio.getDate();

  let year = inicio.getFullYear();
  let month = inicio.getMonth();
  let candidato = new Date(year, month, clampBillingDay(year, month, diaReferencia), 12);

  if (candidato < inicio) {
    month += 1;
    candidato = new Date(year, month, clampBillingDay(year, month, diaReferencia), 12);
  }

  return formatIsoDate(candidato);
}

export function obterVencimentoDaCompetencia(
  cliente: Cliente,
  year: number,
  month: number,
  planos?: Plano[],
): string | null {
  // Competência = mês em que o CICLO começa. Vencimento = primeiro dia após o
  // fim do ciclo no `diaVencimento` configurado (cliente > plano).
  const plano = planos?.find((p) => p.id === cliente.planoId);
  let diaVencimento: number | null = parseDiaVencimento(cliente.dataVencimento);
  if (!diaVencimento && plano?.diaVencimento) {
    diaVencimento = Math.max(1, Math.min(plano.diaVencimento, 31));
  }
  if (!diaVencimento) {
    // Sem dia configurado: usa o dia inicial do ciclo seguinte como fallback
    diaVencimento = plano?.cicloDiaInicial ?? 1;
  }

  const ciclo = getCicloCliente(cliente, plano, year, month);

  // Candidato: `diaVencimento` no mês do fim do ciclo
  const fim = ciclo.fim;
  let vy = fim.getFullYear();
  let vm = fim.getMonth();
  let candidato = new Date(vy, vm, clampBillingDay(vy, vm, diaVencimento), 12);
  // Garante que o vencimento cai estritamente após o fim do ciclo
  if (candidato <= fim) {
    vm += 1;
    candidato = new Date(vy, vm, clampBillingDay(vy, vm, diaVencimento), 12);
  }

  // Cliente só fatura nesta competência se esteve ativo em algum dia do ciclo
  const inicioCliente = toLocalNoonDate(cliente.dataInicio);
  if (inicioCliente > ciclo.fim) return null;
  if (cliente.dataChurn && ISO_DATE_RE.test(cliente.dataChurn)) {
    const churn = toLocalNoonDate(cliente.dataChurn);
    if (churn < ciclo.inicio) return null;
  }

  return formatIsoDate(candidato);
}

export function clienteAtivoEm(cliente: Cliente, year: number, month: number): boolean {
  // Aceita ativo no MÊS calendário (uso legado em métricas não-ciclo).
  const fimMes = new Date(year, month + 1, 0);
  const inicioMes = new Date(year, month, 1);
  const inicio = new Date(cliente.dataInicio);
  if (inicio > fimMes) return false;
  if (cliente.dataChurn) {
    const churn = new Date(cliente.dataChurn);
    if (churn < inicioMes) return false;
  }
  return true;
}

// Reconstrói o estado do cliente como ele estava em uma data específica,
// revertendo movimentos posteriores (upgrade/downgrade são deltas numéricos).
export function clienteSnapshotAt(
  cliente: Cliente,
  movimentos: Movimento[],
  atIso: string,
): Cliente {
  const snap: Cliente = { ...cliente };
  const future = movimentos
    .filter((m) => m.clienteId === cliente.id && m.data > atIso)
    .sort((a, b) => b.data.localeCompare(a.data));

  for (const m of future) {
    if (m.tipo === "upgrade" || m.tipo === "downgrade") {
      const rev = (cur: number | undefined, val: number | null | undefined) => {
        if (val === undefined || val === null) return cur;
        return Math.max(0, (cur ?? 0) - val);
      };
      snap.canais = rev(snap.canais, m.canais) ?? snap.canais;
      snap.canaisWhats = rev(snap.canaisWhats, m.canaisWhats);
      snap.canaisInsta = rev(snap.canaisInsta, m.canaisInsta);
      snap.canaisMessenger = rev(snap.canaisMessenger, m.canaisMessenger);
      snap.canaisZapi = rev(snap.canaisZapi, m.canaisZapi) ?? snap.canaisZapi;
      snap.usuariosAtivos = rev(snap.usuariosAtivos, m.usuariosAtivos) ?? snap.usuariosAtivos;
      snap.contatosAtivos = rev(snap.contatosAtivos, m.contatosAtivos) ?? snap.contatosAtivos;
      snap.apps = rev(snap.apps, m.apps) ?? snap.apps;
      snap.mau = rev(snap.mau, m.mau) ?? snap.mau;
    } else if (m.tipo === "churn") {
      snap.dataChurn = null;
    }
  }
  return snap;
}