import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Download, FileText, TrendingUp, TrendingDown, Eraser } from "lucide-react";
import { FileSearch, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FilterBar, type FilterState, type FilterFieldDef } from "@/components/filter-bar";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import { useCurrentUserAccess } from "@/lib/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useStore, formatBRL, receitaCicloCliente, receitaMensalCliente,
  calcularCustoLiquidoHelena,
  formatDiaVencimento,
  obterVencimentoDaCompetencia,
  clienteSnapshotAt,
  getDiaVencimentoEfetivo,
} from "@/lib/store";
import { explicarReceitaCliente } from "@/lib/calc/receita";
import { descontosAplicaveis, calcularDesconto, descreverDesconto } from "@/lib/calc/desconto";
import type { Desconto, Fechamento, FechamentoItem } from "@/lib/types";
import { getCicloCliente } from "@/lib/calc/ciclo";
import { toast } from "sonner";
import { Mail, Send, Tag, Trash2, Plus, Pencil } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getMultiFilterValues(filtros: FilterState, key: string): string[] {
  const value = filtros[key];
  if (!value || value.type !== "multi" || !Array.isArray(value.values)) return [];
  return value.values.filter((v): v is string => typeof v === "string");
}

function getSingleFilterValue(filtros: FilterState, key: string): string {
  const value = filtros[key];
  if (!value || value.type !== "single" || typeof value.value !== "string") return "";
  return value.value;
}

function isValidCompetenciaKey(value: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const [year, month] = value.split("-").map(Number);
  return Number.isInteger(year) && Number.isInteger(month) && year >= 2000 && month >= 1 && month <= 12;
}

function getCompetenciaBase(value?: string | null): string | null {
  const match = value?.match(/^(\d{4}-(0[1-9]|1[0-2]))/);
  return match && isValidCompetenciaKey(match[1]) ? match[1] : null;
}

function isoLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatCompetenciaLabel(y: number, m: number): string {
  const mesNome = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${mesNome.charAt(0).toUpperCase()}${mesNome.slice(1)}/${y}`;
}

export const Route = createFileRoute("/resumo")({
  head: () => ({ meta: [{ title: "Fechamento Mensal · Elora" }] }),
  component: ResumoPage,
});

type FechamentoVisivel = Fechamento & { legacyFinanceiroId?: string };

function ResumoPage() {
  const {
    clientes, planos, custos, movimentos, parceiros, financeiro,
    addLancamento, descontos, addDesconto, removeDesconto,
    fechamentos = [], fechamentoItens = [], addFechamento, removeFechamento, updateFechamento,
  } = useStore();
  const { isAdmin } = useCurrentUserAccess();
  const [filtros, setFiltros] = usePersistentFilters("resumo");
  const filtrosRef = useRef(filtros);
  useEffect(() => { filtrosRef.current = filtros; }, [filtros]);
  const planoSel = getMultiFilterValues(filtros, "plano");
  const parceiroSel = getMultiFilterValues(filtros, "parceiro");
  const vencSel = getMultiFilterValues(filtros, "vencimento");
  const tipoSel = getMultiFilterValues(filtros, "tipo");
  const planoSelKey = planoSel.join("|");
  const parceiroSelKey = parceiroSel.join("|");
  const vencSelKey = vencSel.join("|");
  const tipoSelKey = tipoSel.join("|");
  const rawCompetenciaSel = getSingleFilterValue(filtros, "competencia");
  const competenciaSel = isValidCompetenciaKey(rawCompetenciaSel) ? rawCompetenciaSel : "";
  const labelMulti = (sel: string[], all: string, nameOf: (id: string) => string) =>
    sel.length === 0 ? all : sel.map(nameOf).filter(Boolean).join(", ");
  const slugMulti = (sel: string[]) => sel.length === 0 ? "todos" : sel.length === 1 ? sel[0] : "multi";
  const abreviarPlano = (nome?: string | null) => {
    if (!nome) return "—";
    return nome
      .replace(/Distribox LTDA\s*/i, "Distribox ")
      .replace(/Exclusive/i, "Excl.")
      .replace(/Essencial\s*/i, "Ess. ")
      .replace(/Agency/i, "Ag.")
      .replace(/Consultoria/i, "Cons.")
      .trim();
  };
  const [expandedMes, setExpandedMes] = useState<string | null>(null);
  const [expandedFechamento, setExpandedFechamento] = useState<string | null>(null);
  const [confirmDeleteFech, setConfirmDeleteFech] = useState<string | null>(null);
  const [detalharFechamentoId, setDetalharFechamentoId] = useState<string | null>(null);
  const [autoPrintCompetencia, setAutoPrintCompetencia] = useState<string | null>(null);
  // Estabiliza a data-base: se recriada a cada render, causa loop infinito
  // (React #185) porque os useMemo/useEffect que dependem dela reexecutam.
  const today = useMemo(() => new Date(), []);
  // Default = competência mais recente já encerrada (mês anterior).
  const defaultCompetencia = (() => {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const [competenciaNovoFechamento, setCompetenciaNovoFechamento] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const migrationKey = "elora.filters.resumo.competencia-optional";
    if (window.localStorage.getItem(migrationKey)) return;
    window.localStorage.setItem(migrationKey, "1");
    if (filtros.competencia?.type === "single") {
      const next = { ...filtros };
      delete next.competencia;
      setFiltros(next);
    }
    // roda uma única vez para limpar o chip fixo legado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fechamentoMes = competenciaNovoFechamento || competenciaSel || defaultCompetencia;
  const [fechamentoOpen, setFechamentoOpen] = useState(false);
  const [historicoCliente, setHistoricoCliente] = useState<{ clienteId: string; mesKey: string } | null>(null);
  const [incluirGraficos, setIncluirGraficos] = useState(true);
  const [observacaoPdf, setObservacaoPdf] = useState("");
  const [modoEnvio, setModoEnvio] = useState<"consolidado" | "por_cliente">("consolidado");
  const [emailDestino, setEmailDestino] = useState("");
  // Nome do boleto / descrição que será gravada no Financeiro.
  const [descricaoConsolidada, setDescricaoConsolidada] = useState<string>("");
  const [descricaoConsolidadaTocada, setDescricaoConsolidadaTocada] = useState(false);
  const [descricoesPorCliente, setDescricoesPorCliente] = useState<Record<string, string>>({});
  const [descricoesPorClienteTocadas, setDescricoesPorClienteTocadas] = useState<Record<string, boolean>>({});
  // Nome do fechamento (grava em elora_fechamentos.titulo)
  const [nomeFechamento, setNomeFechamento] = useState<string>("");
  const [nomeFechamentoTocado, setNomeFechamentoTocado] = useState(false);
  // Seleção de clientes para incluir no fechamento (KPIs, PDF, envio ao Financeiro)
  const [selectedClienteIds, setSelectedClienteIds] = useState<Set<string>>(new Set());
  const [selecaoInicializada, setSelecaoInicializada] = useState<string>("");

  // Modal de criação de desconto
  const [descontoModal, setDescontoModal] = useState<null | {
    escopo: "cliente" | "fechamento_inteiro";
    clienteId: string | null;
    clienteNome?: string;
  }>(null);
  const [descTipo, setDescTipo] = useState<"valor" | "percentual" | "isencao_total">("valor");
  const [descValor, setDescValor] = useState<string>("");
  const [descRecorrente, setDescRecorrente] = useState<boolean>(false);
  const [descMotivo, setDescMotivo] = useState<string>("");

  const resetDescontoForm = () => {
    setDescTipo("valor");
    setDescValor("");
    setDescRecorrente(false);
    setDescMotivo("");
  };

  const salvarDesconto = () => {
    if (!descontoModal || !fechamentoData) return;
    const valorNum = descTipo === "isencao_total" ? null : Number(descValor.replace(",", "."));
    if (descTipo !== "isencao_total" && (!Number.isFinite(valorNum!) || valorNum! <= 0)) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (descTipo === "percentual" && (valorNum ?? 0) > 100) {
      toast.error("Percentual não pode passar de 100%.");
      return;
    }
    addDesconto({
      clienteId: descontoModal.clienteId,
      tipo: descTipo,
      escopo: descontoModal.escopo,
      valor: valorNum,
      competenciaInicio: fechamentoData.competenciaKey,
      competenciaFim: null,
      recorrente: descRecorrente,
      motivo: descMotivo.trim() || null,
    });
    toast.success("Desconto aplicado.");
    setDescontoModal(null);
    resetDescontoForm();
  };

  // Dias de vencimento distintos (planos + clientes), para o filtro
  const diasDisponiveis = useMemo(() => {
    const set = new Set<number>();
    for (const p of planos) if (p.diaVencimento) set.add(p.diaVencimento);
    for (const c of clientes) {
      const d = getDiaVencimentoEfetivo(c, planos);
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [planos, clientes]);

  // Clientes filtrados por plano, parceiro e vencimento
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const matchPlano = planoSel.length === 0 || planoSel.includes(c.planoId ?? "");
      const matchParceiro = parceiroSel.length === 0 || parceiroSel.includes(c.parceiroId ?? "");
      const matchVenc = vencSel.length === 0 || vencSel.includes(String(getDiaVencimentoEfetivo(c, planos) ?? ""));
      const planoDoCli = planos.find((p) => p.id === c.planoId);
      const matchTipo = tipoSel.length === 0 || tipoSel.includes(planoDoCli?.categoria ?? "elora");
      return matchPlano && matchParceiro && matchVenc && matchTipo;
    });
  }, [clientes, planos, planoSelKey, parceiroSelKey, vencSelKey, tipoSelKey]);

  // Resolve o ciclo de faturamento do cliente para a competência (y, m).
  // Respeita ciclo personalizado do cliente, ciclo do plano (ex.: Rabbit 5→4)
  // ou default 1→31.
  const cicloDoCliente = (c: typeof clientes[number], y: number, m: number) => {
    const plano = planos.find((p) => p.id === c.planoId);
    return getCicloCliente(c, plano, y, m);
  };

  // Cliente esteve ativo em qualquer dia do ciclo (competência y/m do cliente).
  const clienteAtivoNoCiclo = (c: typeof clientes[number], y: number, m: number) => {
    const ciclo = cicloDoCliente(c, y, m);
    const ini = new Date(c.dataInicio);
    if (ini > ciclo.fim) return false;
    if (c.dataChurn) {
      const churn = new Date(c.dataChurn);
      if (churn < ciclo.inicio) return false;
    }
    return true;
  };

  // Churn dentro do ciclo de faturamento da competência (não do mês calendário).
  const churnNoCiclo = (c: typeof clientes[number], y: number, m: number) => {
    if (!c.dataChurn) return false;
    const ciclo = cicloDoCliente(c, y, m);
    const churn = new Date(`${c.dataChurn}T12:00:00`);
    return churn >= ciclo.inicio && churn <= ciclo.fim;
  };

  // Cliente já churnou até o fim deste ciclo (inclui ciclos posteriores ao churn).
  const clienteJaChurnouNaCompetencia = (c: typeof clientes[number], y: number, m: number) => {
    if (!c.dataChurn) return false;
    const ciclo = cicloDoCliente(c, y, m);
    const churn = new Date(`${c.dataChurn}T12:00:00`);
    return churn <= ciclo.fim;
  };

  // Cliente é elegível ao fechamento de uma competência quando o ciclo já
  // encerrou ou quando hoje é o último dia do ciclo.
  const clienteElegivelParaFechamento = (
    c: typeof clientes[number],
    y: number,
    m: number,
    hoje: Date,
  ) => {
    if (!clienteAtivoNoCiclo(c, y, m)) return false;
    const ciclo = cicloDoCliente(c, y, m);
    const fim = new Date(ciclo.fim.getFullYear(), ciclo.fim.getMonth(), ciclo.fim.getDate());
    return fim <= hoje;
  };

  // Atalho local que evita repetir planos/custos/movimentos em cada chamada.
  const receitaCicloLocal = (c: typeof clientes[number], y: number, m: number): number =>
    receitaCicloCliente(c, planos, custos, movimentos, y, m);

  const fechamentosVisiveis = useMemo<FechamentoVisivel[]>(() => fechamentos, [fechamentos]);
  const fechamentoItensVisiveis = useMemo<FechamentoItem[]>(() => fechamentoItens, [fechamentoItens]);

  const linhas = useMemo(() => {
    if (clientesFiltrados.length === 0) return [];
    const datas = clientesFiltrados.map((c) => new Date(c.dataInicio));
    const minD = new Date(Math.min(...datas.map((d) => d.getTime())));
    const now = new Date();
    const out: {
      mesKey: string;
      mesLabel: string;
      ativos: typeof clientes;
      novos: number;
      churns: number;
      receita: number;
      receitaBruta: number;
      descontoTotal: number;
      custoHelena: number;
      setup: number;
      receitaPorCliente: Map<string, { bruto: number; liquido: number; desconto: number }>;
    }[] = [];
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cursor <= now) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const competenciaKey = `${y}-${String(m + 1).padStart(2, "0")}`;
      if (competenciaSel && competenciaKey !== competenciaSel) {
        cursor.setMonth(cursor.getMonth() + 1);
        continue;
      }
      const ativos = clientesFiltrados.filter((c) => clienteAtivoNoCiclo(c, y, m));
      const novos = clientesFiltrados.filter((c) => {
        const d = new Date(c.dataInicio);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const churns = clientesFiltrados.filter((c) => {
        return churnNoCiclo(c, y, m);
      }).length;
      const receitaPorCliente = new Map<string, { bruto: number; liquido: number; desconto: number }>();
      let receitaBruta = 0;
      let descontoClientes = 0;
      for (const c of ativos) {
        const bruto = receitaCicloLocal(c, y, m);
        const descsCli = descontosAplicaveis(descontos, competenciaKey, "cliente", c.id);
        const res = calcularDesconto(bruto, descsCli);
        receitaPorCliente.set(c.id, { bruto, liquido: res.total, desconto: res.descontoTotal });
        receitaBruta += bruto;
        descontoClientes += res.descontoTotal;
      }
      const subtotalPosClientes = receitaBruta - descontoClientes;
      const descontosGerais = descontosAplicaveis(descontos, competenciaKey, "fechamento_inteiro");
      const resGeral = calcularDesconto(subtotalPosClientes, descontosGerais);
      const receita = resGeral.total;
      const descontoTotal = descontoClientes + resGeral.descontoTotal;
      // Custo sistêmico também respeita o snapshot histórico de cada cliente
      const ativosSnapshot = ativos.map((c) => {
        const venc = obterVencimentoDaCompetencia(c, y, m, planos);
        const ref = venc ?? new Date(y, m + 1, 0).toISOString().slice(0, 10);
        return clienteSnapshotAt(c, movimentos, ref);
      });
      const custoHelena = calcularCustoLiquidoHelena(ativosSnapshot);
      const setup = clientesFiltrados
        .filter((c) => {
          const vencimento = obterVencimentoDaCompetencia(c, y, m, planos);
          if (!vencimento) return false;
          return vencimento === c.dataVencimento;
        })
        .reduce((s, c) => s + (c.valorSetupPago || 0), 0);
      const servicos = movimentos
        .filter((mv) => { if (mv.tipo !== "servico" || !mv.valorServico) return false; const d = new Date(mv.data); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, mv) => s + (mv.valorServico ?? 0), 0);

      const receitaTotal = receita + setup + servicos;
      out.push({
        mesKey: competenciaKey,
        mesLabel: formatCompetenciaLabel(y, m),
        ativos,
        novos,
        churns,
        receita: receitaTotal,
        receitaBruta: receitaBruta + setup + servicos,
        descontoTotal,
        custoHelena,
        setup: setup + servicos,
        receitaPorCliente,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out.reverse();
  }, [clientesFiltrados, planos, custos, movimentos, descontos, competenciaSel]);

  const exportarPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const generatedAt = new Date().toLocaleString("pt-BR");
    const planoSelecionado = labelMulti(planoSel, "Todos os planos", (id) => planos.find((p) => p.id === id)?.nome ?? id);

    pdf.setFontSize(18);
    pdf.text("Fechamento Mensal", 40, 42);
    pdf.setFontSize(10);
    pdf.text(`Plano: ${planoSelecionado}`, 40, 62);
    pdf.text(`Gerado em: ${generatedAt}`, 40, 78);

    autoTable(pdf, {
      startY: 96,
      head: [["Mês de Competência", "Data de vencimento", "Novos", "Churns", "Receita Total", "Custo Sistêmico"]],
      body: linhas.map((l) => {
        const y = Number(l.mesKey.slice(0, 4));
        const m = Number(l.mesKey.slice(5, 7)) - 1;
        const vencs = Array.from(new Set(l.ativos.map((c) => obterVencimentoDaCompetencia(c, y, m, planos)).filter((v): v is string => Boolean(v)))).sort();
        const vencLabel = vencs.length === 0
          ? "—"
          : vencs.length === 1
            ? new Date(`${vencs[0]}T12:00:00`).toLocaleDateString("pt-BR")
            : `${new Date(`${vencs[0]}T12:00:00`).toLocaleDateString("pt-BR")} … ${new Date(`${vencs[vencs.length - 1]}T12:00:00`).toLocaleDateString("pt-BR")}`;
        return [
          l.mesLabel,
          vencLabel,
          String(l.novos),
          String(l.churns),
          formatBRL(l.receita),
          formatBRL(l.custoHelena),
        ];
      }),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [28, 63, 170] },
      margin: { left: 40, right: 40 },
    });

    linhas.forEach((linha) => {
      pdf.addPage();
      pdf.setFontSize(14);
      pdf.text(`Detalhes · ${linha.mesLabel}`, 40, 42);
      pdf.setFontSize(10);
      pdf.text(`Clientes faturados no mês: ${linha.ativos.length}`, 40, 60);

      autoTable(pdf, {
        startY: 76,
        head: [["Cliente", "Plano", "Vencimento", "Status", "Receita/mês"]],
        body: linha.ativos.map((c) => {
          const plano = planos.find((p) => p.id === c.planoId);
          const ly = Number(linha.mesKey.slice(0, 4));
          const lm = Number(linha.mesKey.slice(5, 7)) - 1;
          const vencIso = obterVencimentoDaCompetencia(c, ly, lm, planos);
          const info = linha.receitaPorCliente.get(c.id);
          const rec = info?.liquido ?? receitaCicloCliente(c, planos, custos, movimentos, ly, lm);
          return [
            c.nome,
            abreviarPlano(plano?.nome),
            vencIso ? new Date(`${vencIso}T12:00:00`).toLocaleDateString("pt-BR") : "—",
            c.dataChurn ? "Churn" : "Ativo",
            (info && info.desconto > 0)
              ? `${formatBRL(rec)} (desc. -${formatBRL(info.desconto)})`
              : formatBRL(rec),
          ];
        }),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [28, 63, 170] },
        margin: { left: 40, right: 40 },
      });
    });

    pdf.save(`resumo-mensal-${slugMulti(planoSel)}-${slugMulti(parceiroSel)}.pdf`);
  };

  // ====== Dados para o Fechamento Mensal ======
  const fechamentoData = useMemo(() => {
    if (!fechamentoMes) return null;
    const [yStr, mStr] = fechamentoMes.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const labelMes = formatCompetenciaLabel(y, m);

    // A competência selecionada É o ciclo que está sendo fechado.
    // Ex.: competência Junho/2026 = ciclo 01/06 a 30/06, cobrado em ~05/07.
    const cy = y;
    const cm = m;
    const hoje = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Apenas clientes cujo ciclo da competência já encerrou entram no fechamento.
    const ativosTodos = clientesFiltrados.filter((c) => clienteAtivoNoCiclo(c, cy, cm));
    const ativos = ativosTodos.filter((c) => clienteElegivelParaFechamento(c, cy, cm, hoje));
    const aguardandoCicloFechar = ativosTodos.filter((c) => !clienteElegivelParaFechamento(c, cy, cm, hoje));
    // Faixa de ciclos representativa (pode haver clientes com ciclos diferentes).
    const ciclos = ativos.map((c) => cicloDoCliente(c, cy, cm));
    const cicloLabel = (() => {
      if (ciclos.length === 0) {
        const ini = new Date(cy, cm, 1);
        const fim = new Date(cy, cm + 1, 0);
        return `${ini.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;
      }
      const inis = ciclos.map((c) => c.inicio.getTime());
      const fims = ciclos.map((c) => c.fim.getTime());
      const minIni = new Date(Math.min(...inis));
      const maxIni = new Date(Math.max(...inis));
      const minFim = new Date(Math.min(...fims));
      const maxFim = new Date(Math.max(...fims));
      const sameIni = minIni.getTime() === maxIni.getTime();
      const sameFim = minFim.getTime() === maxFim.getTime();
      if (sameIni && sameFim) {
        return `${minIni.toLocaleDateString("pt-BR")} a ${maxFim.toLocaleDateString("pt-BR")}`;
      }
      return `${minIni.toLocaleDateString("pt-BR")}–${maxIni.toLocaleDateString("pt-BR")} a ${minFim.toLocaleDateString("pt-BR")}–${maxFim.toLocaleDateString("pt-BR")}`;
    })();
    // Data de vencimento média/representativa da competência (apenas informativa)
    const vencimentosCompetencia = ativos
      .map((c) => obterVencimentoDaCompetencia(c, cy, cm, planos))
      .filter((x): x is string => Boolean(x));
    const vencimentoLabel = vencimentosCompetencia.length > 0
      ? (() => {
          // Mostra a(s) data(s) reais de recebimento.
          const unique = Array.from(new Set(vencimentosCompetencia));
          unique.sort();
          if (unique.length === 1) {
            return new Date(`${unique[0]}T12:00:00`).toLocaleDateString("pt-BR");
          }
          const min = new Date(`${unique[0]}T12:00:00`).toLocaleDateString("pt-BR");
          const max = new Date(`${unique[unique.length - 1]}T12:00:00`).toLocaleDateString("pt-BR");
          return `${min} a ${max}`;
        })()
      : "—";

    const setupsNoMes = clientesFiltrados.filter((c) => {
      const d = new Date(c.dataInicio);
      return d.getFullYear() === cy && d.getMonth() === cm;
    });
    const churnsNoMes = clientesFiltrados.filter((c) => churnNoCiclo(c, cy, cm));

    // Movimentos de upgrade/downgrade do CICLO (mês anterior) para os clientes filtrados
    const clienteIds = new Set(clientesFiltrados.map((c) => c.id));
    const movsMes = movimentos.filter((mv) => {
      if (!clienteIds.has(mv.clienteId)) return false;
      if (mv.tipo !== "upgrade" && mv.tipo !== "downgrade") return false;
      const d = new Date(mv.data);
      return d.getFullYear() === cy && d.getMonth() === cm;
    });

    // Detalhamento por cliente
    const competenciaKey = `${cy}-${String(cm + 1).padStart(2, "0")}`;
    const detalhesPorCliente = ativos.map((c) => {
      const plano = planos.find((p) => p.id === c.planoId);
      const venc = obterVencimentoDaCompetencia(c, cy, cm, planos);
      const refSnap = venc ?? new Date(cy, cm + 1, 0).toISOString().slice(0, 10);
      const snap = clienteSnapshotAt(c, movimentos, refSnap);
      const subtotal = receitaCicloLocal(c, cy, cm);
      const acomp = snap.valorAcompanhamento || 0;
      const sistema = Math.max(0, subtotal - acomp);
      const movsCliente = movsMes.filter((mv) => mv.clienteId === c.id);
      // Descontos aplicáveis ao cliente nessa competência
      const descsCliente = descontosAplicaveis(descontos, competenciaKey, "cliente", c.id);
      const resDesc = calcularDesconto(subtotal, descsCliente);
      // LTV em dias: do início até churn (se houver) ou fim do ciclo fechado
      const inicio = new Date(c.dataInicio);
      const fimCompetencia = new Date(cy, cm + 1, 0);
      const fim = c.dataChurn ? new Date(c.dataChurn) : fimCompetencia;
      const ltvDias = Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        cliente: c, plano,
        subtotal,
        descontosCliente: descsCliente,
        descontoCliente: resDesc.descontoTotal,
        receita: resDesc.total,
        acomp, sistema,
        movs: movsCliente, venc, ltvDias,
      };
    });

    const totalSistema = detalhesPorCliente.reduce((s, d) => s + d.sistema, 0);
    const totalAcompanhamento = detalhesPorCliente.reduce((s, d) => s + d.acomp, 0);
    const subtotalBruto = detalhesPorCliente.reduce((s, d) => s + d.subtotal, 0);
    const descontosClientesTotal = detalhesPorCliente.reduce((s, d) => s + d.descontoCliente, 0);
    const totalSetups = setupsNoMes.reduce((s, c) => s + (c.valorSetupPago || 0), 0);

    // Métricas adicionais
    const ltvMedioDias = detalhesPorCliente.length > 0
      ? detalhesPorCliente.reduce((s, d) => s + d.ltvDias, 0) / detalhesPorCliente.length
      : 0;
    const totalReceitaPosDesc = detalhesPorCliente.reduce((s, d) => s + d.receita, 0);
    const ticketMedio = detalhesPorCliente.length > 0
      ? totalReceitaPosDesc / detalhesPorCliente.length
      : 0;

    // Delta de receita por movimento (impacto financeiro)
    const calcDeltaReceita = (mv: typeof movimentos[number]): number => {
      const c = clientes.find((x) => x.id === mv.clienteId);
      if (!c) return 0;
      // Estado logo após o movimento aplicado
      const after = clienteSnapshotAt(c, movimentos, mv.data);
      // Reverte apenas este movimento
      const before: typeof after = { ...after };
      const rev = (cur: number | undefined, val: number | null | undefined) =>
        val === undefined || val === null ? cur : Math.max(0, (cur ?? 0) - val);
      before.canaisWhats = rev(after.canaisWhats, mv.canaisWhats);
      before.canaisInsta = rev(after.canaisInsta, mv.canaisInsta);
      before.canaisMessenger = rev(after.canaisMessenger, mv.canaisMessenger);
      before.canaisZapi = rev(after.canaisZapi, mv.canaisZapi) ?? after.canaisZapi;
      before.usuariosAtivos = rev(after.usuariosAtivos, mv.usuariosAtivos) ?? after.usuariosAtivos;
      before.contatosAtivos = rev(after.contatosAtivos, mv.contatosAtivos) ?? after.contatosAtivos;
      return receitaMensalCliente(after, planos, custos) - receitaMensalCliente(before, planos, custos);
    };

    return {
      y, m, labelMes,
      competenciaKey,
      cicloLabel,
      vencimentoLabel,
      ativos,
      aguardandoCicloFechar,
      setupsNoMes,
      churnsNoMes,
      totalSetups,
      detalhesPorCliente,
      totalSistema,
      totalAcompanhamento,
      subtotalBruto,
      descontosClientesTotal,
      movsMes,
      ltvMedioDias,
      ticketMedio,
      calcDeltaReceita,
    };
  }, [fechamentoMes, clientesFiltrados, planos, custos, movimentos, descontos]);

  // Sempre que a competência ou os clientes do fechamento mudarem, marca todos por padrão
  const fechamentoAtivosIds = useMemo(
    () => fechamentoData?.ativos.map((c) => c.id) ?? [],
    [fechamentoData?.competenciaKey, fechamentoData?.ativos],
  );
  const fechamentoKey = useMemo(() => {
    if (!fechamentoData) return "";
    return `${fechamentoMes}|${fechamentoAtivosIds.join(",")}`;
  }, [fechamentoData?.competenciaKey, fechamentoAtivosIds, fechamentoMes]);
  useEffect(() => {
    if (fechamentoKey && fechamentoKey !== selecaoInicializada) {
      const ids = fechamentoAtivosIds;
      setSelectedClienteIds((prev) => {
        if (prev.size === ids.length && ids.every((id) => prev.has(id))) return prev;
        return new Set(ids);
      });
      setSelecaoInicializada(fechamentoKey);
      // Reseta descrições para os defaults sempre que muda a competência/clientes.
      setDescricaoConsolidadaTocada(false);
      setDescricoesPorClienteTocadas({});
    }
  }, [fechamentoAtivosIds, fechamentoKey, selecaoInicializada]);

  // Defaults de descrição (recalculados quando muda a competência).
  const defaultDescricaoConsolidada = useMemo(() => {
    if (!fechamentoData) return "";
    return `Fechamento ${fechamentoData.labelMes} · ciclo ${fechamentoData.cicloLabel}`;
  }, [fechamentoData?.labelMes, fechamentoData?.cicloLabel]);

  const defaultNomeFechamento = useMemo(() => {
    if (!fechamentoData) return "";
    const planoLabel = planoSel.length > 0
      ? planoSel.map((id) => planos.find((p) => p.id === id)?.nome ?? id).join(" + ")
      : "Fechamento";
    return `${planoLabel} · ${fechamentoData.labelMes}`;
  }, [fechamentoData?.labelMes, planoSelKey, planos]);

  useEffect(() => {
    if (!nomeFechamentoTocado && nomeFechamento !== defaultNomeFechamento) {
      setNomeFechamento(defaultNomeFechamento);
    }
  }, [defaultNomeFechamento, nomeFechamento, nomeFechamentoTocado]);

  const defaultDescricoesPorClienteKey = useMemo(
    () => fechamentoData?.detalhesPorCliente
      .map((d) => `${d.cliente.id}:${d.cliente.nomeFinanceiro || d.cliente.nome}`)
      .join("|") ?? "",
    [fechamentoData?.competenciaKey, fechamentoData?.detalhesPorCliente],
  );
  const defaultDescricoesPorCliente = useMemo(() => {
    if (!fechamentoData) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const d of fechamentoData.detalhesPorCliente) {
      map[d.cliente.id] = d.cliente.nomeFinanceiro || d.cliente.nome;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDescricoesPorClienteKey]);

  // Aplica defaults para campos não tocados pelo usuário.
  useEffect(() => {
    if (!descricaoConsolidadaTocada && descricaoConsolidada !== defaultDescricaoConsolidada) {
      setDescricaoConsolidada(defaultDescricaoConsolidada);
    }
  }, [defaultDescricaoConsolidada, descricaoConsolidada, descricaoConsolidadaTocada]);
  useEffect(() => {
    setDescricoesPorCliente((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, val] of Object.entries(defaultDescricoesPorCliente)) {
        if (!descricoesPorClienteTocadas[id] && next[id] !== val) {
          next[id] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [defaultDescricoesPorCliente, descricoesPorClienteTocadas]);

  const fechamentoSelecionado = useMemo(() => {
    if (!fechamentoData) return null;
    const sel = selectedClienteIds;
    const detalhes = fechamentoData.detalhesPorCliente.filter((d) => sel.has(d.cliente.id));
    const totalSistema = detalhes.reduce((s, d) => s + d.sistema, 0);
    const totalAcompanhamento = detalhes.reduce((s, d) => s + d.acomp, 0);
    const subtotalBruto = detalhes.reduce((s, d) => s + d.subtotal, 0);
    const descontosClientesTotal = detalhes.reduce((s, d) => s + d.descontoCliente, 0);
    const subtotalPosClientes = subtotalBruto - descontosClientesTotal;

    // Descontos do fechamento inteiro (escopo geral)
    const descontosGeraisLista = descontosAplicaveis(descontos, fechamentoData.competenciaKey, "fechamento_inteiro");
    const resGeral = calcularDesconto(subtotalPosClientes, descontosGeraisLista);
    const totalReceita = resGeral.total;
    const descontoTotal = descontosClientesTotal + resGeral.descontoTotal;
    const ticketMedio = detalhes.length > 0 ? totalReceita / detalhes.length : 0;
    const ltvMedioDias = detalhes.length > 0
      ? detalhes.reduce((s, d) => s + d.ltvDias, 0) / detalhes.length
      : 0;
    return {
      detalhes, totalSistema, totalAcompanhamento,
      subtotalBruto, descontosClientesTotal,
      descontosGerais: descontosGeraisLista,
      descontoGeral: resGeral.descontoTotal,
      descontoTotal,
      totalReceita,
      ticketMedio, ltvMedioDias, count: detalhes.length,
    };
  }, [fechamentoData, selectedClienteIds, descontos]);

  const toggleCliente = (id: string) => {
    setSelectedClienteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const abrirNovoFechamento = (mesKey?: string) => {
    // Preferimos a competência clicada; se não for elegível (ciclo em aberto,
    // sem clientes), caímos na competência elegível mais recente.
    const elegiveis = opcoesFechamento.map((o) => o.key);
    let competencia = mesKey && isValidCompetenciaKey(mesKey) ? mesKey : defaultCompetencia;
    if (!elegiveis.includes(competencia) && elegiveis.length > 0) {
      const aviso = mesKey
        ? `Ciclo de ${formatCompetenciaLabel(Number(mesKey.slice(0, 4)), Number(mesKey.slice(5, 7)) - 1)} ainda em aberto — abrindo ${opcoesFechamento[0].label}.`
        : null;
      competencia = elegiveis[0];
      if (aviso) toast.message(aviso);
    }
    setCompetenciaNovoFechamento(competencia);
    setNomeFechamentoTocado(false);
    setFechamentoOpen(true);
  };
  const todosSelecionados = !!fechamentoData && fechamentoData.ativos.length > 0 &&
    fechamentoData.ativos.every((c) => selectedClienteIds.has(c.id));
  const toggleTodos = () => {
    if (!fechamentoData) return;
    if (todosSelecionados) setSelectedClienteIds(new Set());
    else setSelectedClienteIds(new Set(fechamentoData.ativos.map((c) => c.id)));
  };

  const opcoesFechamento = useMemo(() => {
    // Lista competências que tenham pelo menos 1 cliente filtrado com
    // o ciclo já encerrado (cicloFim < hoje). Como diferentes planos têm
    // ciclos diferentes (ex.: Distribox 1→31 fecha 30/06; Rabbit 5→4
    // fecha só em 04/07), o seletor passa a ser por ciclo do cliente.
    const out: { key: string; label: string; elegiveis: number; aguardando: number }[] = [];
    const hoje = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 36; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      let elegiveis = 0;
      let aguardando = 0;
      for (const c of clientesFiltrados) {
        if (!clienteAtivoNoCiclo(c, y, m)) continue;
        if (clienteElegivelParaFechamento(c, y, m, hoje)) elegiveis++;
        else aguardando++;
      }
      if (elegiveis === 0) continue;
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const mesLabel = formatCompetenciaLabel(y, m);
      out.push({ key, label: mesLabel, elegiveis, aguardando });
    }
    return out;
  }, [today, clientesFiltrados, planos]);

  // Chaves estáveis das opções de fechamento — usadas para reagir a mudanças
  // sem recomputar o efeito quando qualquer outro filtro muda.
  const opcoesFechamentoKeys = useMemo(
    () => opcoesFechamento.map((o) => o.key).join("|"),
    [opcoesFechamento],
  );
  useEffect(() => {
    if (!rawCompetenciaSel) return;
    const keys = opcoesFechamentoKeys ? opcoesFechamentoKeys.split("|") : [];
    const invalida = !isValidCompetenciaKey(rawCompetenciaSel);
    const foraDasOpcoes = keys.length > 0 && !keys.includes(rawCompetenciaSel);
    if (invalida || foraDasOpcoes) {
      const next = { ...filtrosRef.current };
      delete next.competencia;
      setFiltros(next);
    }
  }, [rawCompetenciaSel, opcoesFechamentoKeys, setFiltros]);

  const fmtDelta = (label: string, v: number | undefined | null) => {
    if (v === undefined || v === null || v === 0) return null;
    const sign = v > 0 ? "+" : "";
    return `${label} ${sign}${v}`;
  };

  const descreverMov = (mv: typeof movimentos[number]): string => {
    // Setup: os campos guardam o estado inicial absoluto (não deltas).
    // Mostramos apenas o delta em relação ao plano — se houver — para não
    // poluir com "Contatos +500" / "Usuários +3" que só refletem inclusos.
    if (mv.tipo === "setup") {
      const plano = mv.planoId ? planos.find((p) => p.id === mv.planoId) : undefined;
      const partesSetup: string[] = [];
      const uInc = plano?.usuariosInclusos ?? 3;
      const wInc = plano?.canaisWhatsInclusos ?? 0;
      const iInc = plano?.canaisInstaInclusos ?? 0;
      const mInc = plano?.canaisMessengerInclusos ?? 0;
      const uExc = (mv.usuariosAtivos ?? 0) - uInc;
      const wExc = (mv.canaisWhats ?? 0) - wInc;
      const iExc = (mv.canaisInsta ?? 0) - iInc;
      const mExc = (mv.canaisMessenger ?? 0) - mInc;
      const zExc = mv.canaisZapi ?? 0;
      const pushExc = (label: string, v: number) => {
        if (v > 0) partesSetup.push(`${label} +${v}`);
      };
      pushExc("Usuários", uExc);
      pushExc("WhatsApp", wExc);
      pushExc("Instagram", iExc);
      pushExc("Messenger", mExc);
      pushExc("Z-API", zExc);
      return partesSetup.join(" · ");
    }
    if (mv.tipo === "churn") return "Churn";
    const partes: string[] = [];
    const a = fmtDelta("WhatsApp", mv.canaisWhats); if (a) partes.push(a);
    const b = fmtDelta("Instagram", mv.canaisInsta); if (b) partes.push(b);
    const c = fmtDelta("Messenger", mv.canaisMessenger); if (c) partes.push(c);
    const z = fmtDelta("Z-API", mv.canaisZapi); if (z) partes.push(z);
    const u = fmtDelta("Usuários", mv.usuariosAtivos); if (u) partes.push(u);
    const ct = fmtDelta("Contatos", mv.contatosAtivos); if (ct) partes.push(ct);
    if (mv.planoId && mv.tipo !== "upgrade" && mv.tipo !== "downgrade") {
      const np = planos.find((p) => p.id === mv.planoId);
      if (np) partes.push(`Plano: ${np.nome}`);
    }
    return partes.join(" · ");
  };

  const exportarFechamentoPdf = () => {
    if (!fechamentoData || !fechamentoSelecionado) return;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const planoSelLabel = labelMulti(planoSel, "Todos os planos", (id) => planos.find((p) => p.id === id)?.nome ?? id);
    // Cabeçalho preto
    pdf.setFillColor(15, 15, 15);
    pdf.rect(0, 0, pageW, 78, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Elora", 40, 36);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(`Fechamento Mensal · Competência ${fechamentoData.labelMes}`, 40, 58);

    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(10);
    pdf.text(`Plano: ${planoSelLabel}`, 40, 100);
    pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 40, 114);
    pdf.text(`Ciclo: ${fechamentoData.cicloLabel}   |   Vencimento: ${fechamentoData.vencimentoLabel}`, 40, 128);

    autoTable(pdf, {
      startY: 146,
      head: [["Clientes faturados", "Setups no ciclo", "Churns no ciclo", "Sistema", "Acompanhamento", "Fechamento Mensal"]],
      body: [[
        String(fechamentoSelecionado.count),
        `${fechamentoData.setupsNoMes.length} (${formatBRL(fechamentoData.totalSetups)})`,
        String(fechamentoData.churnsNoMes.length),
        formatBRL(fechamentoSelecionado.totalSistema),
        formatBRL(fechamentoSelecionado.totalAcompanhamento),
        formatBRL(fechamentoSelecionado.totalReceita),
      ]],
      styles: { fontSize: 10, cellPadding: 7, halign: "center" },
      headStyles: { fillColor: [15, 15, 15], textColor: 255 },
    });

    // Métricas adicionais (LTV médio e Ticket médio)
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 10,
      head: [["LTV médio (dias)", "Ticket médio / cliente"]],
      body: [[
        String(Math.round(fechamentoSelecionado.ltvMedioDias)),
        formatBRL(fechamentoSelecionado.ticketMedio),
      ]],
      styles: { fontSize: 10, cellPadding: 7, halign: "center" },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
    });

    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 16,
      head: [["Cliente", "Plano", "Vencimento", "LTV (dias)", "Sistema", "Acompanh.", "Desconto", "Total"]],
      body: fechamentoSelecionado.detalhes.map((d) => [
        d.cliente.nomeFinanceiro || d.cliente.nome,
        abreviarPlano(d.plano?.nome),
        d.venc ? new Date(d.venc).toLocaleDateString("pt-BR") : "—",
        String(d.ltvDias),
        formatBRL(d.sistema),
        formatBRL(d.acomp),
        d.descontoCliente > 0 ? `-${formatBRL(d.descontoCliente)}` : "—",
        formatBRL(d.receita),
      ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
    });

    // Linha de totalizador do fechamento (subtotal, desconto geral, total)
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 6,
      head: [["", "Valor"]],
      showHead: "never",
      body: [
        ["Subtotal", formatBRL(fechamentoSelecionado.subtotalBruto)],
        ...(fechamentoSelecionado.descontoTotal > 0
          ? [["Descontos aplicados", `-${formatBRL(fechamentoSelecionado.descontoTotal)}`]]
          : []),
        ["Total do fechamento", formatBRL(fechamentoSelecionado.totalReceita)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: { 0: { halign: "right", fontStyle: "bold" }, 1: { halign: "right" } },
    });

    if (fechamentoData.movsMes.length > 0) {
      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 16,
        head: [["Data", "Cliente", "Tipo", "Detalhes", "Impacto/mês"]],
        body: fechamentoData.movsMes
          .slice()
          .sort((a, b) => b.data.localeCompare(a.data))
          .map((mv) => {
            const c = clientes.find((x) => x.id === mv.clienteId);
            const delta = fechamentoData.calcDeltaReceita(mv);
            const sign = delta > 0 ? "+" : "";
            return [
              mv.data.split("-").reverse().join("/"),
              c?.nome ?? "—",
              mv.tipo === "upgrade" ? "Upgrade" : "Downgrade",
              descreverMov(mv),
              delta !== 0 ? `${sign}${formatBRL(delta)}` : "—",
            ];
          }),
        styles: { fontSize: 9, cellPadding: 6 },
        // Cabeçalho amarelo vivo para as atualizações do ciclo
        headStyles: { fillColor: [253, 224, 71], textColor: [20, 20, 20] },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 2) {
            const isUp = String(data.cell.raw) === "Upgrade";
            // Verde para upgrade, vermelho para downgrade
            data.cell.styles.textColor = isUp ? [21, 128, 61] : [185, 28, 28];
            data.cell.styles.fontStyle = "bold";
          }
          if (data.section === "body" && data.column.index === 4) {
            const raw = String(data.cell.raw ?? "");
            if (raw.startsWith("+")) data.cell.styles.textColor = [21, 128, 61];
            else if (raw.startsWith("-") || raw.startsWith("−") || raw.startsWith("R$ -")) data.cell.styles.textColor = [185, 28, 28];
          }
        },
      });
    }

    // Setups do ciclo (novos clientes que iniciaram na competência)
    if (fechamentoData.setupsNoMes.length > 0) {
      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 16,
        head: [["Data de entrada", "Cliente", "Plano", "Valor do Setup"]],
        body: fechamentoData.setupsNoMes
          .slice()
          .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
          .map((c) => {
            const plano = planos.find((p) => p.id === c.planoId);
            return [
              c.dataInicio.split("-").reverse().join("/"),
              c.nomeFinanceiro || c.nome,
              abreviarPlano(plano?.nome),
              c.valorSetupPago ? formatBRL(c.valorSetupPago) : "—",
            ];
          }),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      });
    }

    // Churns do ciclo (clientes que cancelaram na competência)
    if (fechamentoData.churnsNoMes.length > 0) {
      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 16,
        head: [["Data do churn", "Cliente", "Plano"]],
        body: fechamentoData.churnsNoMes
          .slice()
          .sort((a, b) => (a.dataChurn ?? "").localeCompare(b.dataChurn ?? ""))
          .map((c) => {
            const plano = planos.find((p) => p.id === c.planoId);
            return [
              c.dataChurn ? c.dataChurn.split("-").reverse().join("/") : "—",
              c.nomeFinanceiro || c.nome,
              abreviarPlano(plano?.nome),
            ];
          }),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255 },
      });
    }

    // Gráfico de receita (opcional)
    if (incluirGraficos) {
      const serie = linhas.slice(0, 6).reverse();
      if (serie.length >= 2) {
        let y = (pdf as any).lastAutoTable.finalY + 24;
        if (y > pageH - 200) { pdf.addPage(); y = 60; }
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Receita — últimos ${serie.length} meses`, 40, y);
        const x0 = 40, y0 = y + 12, w = pageW - 80, h = 140;
        pdf.setDrawColor(220);
        pdf.rect(x0, y0, w, h);
        const maxV = Math.max(...serie.map((s) => s.receita), 1);
        const step = w / (serie.length - 1);
        // Área
        pdf.setFillColor(28, 63, 170);
        const pts: { x: number; y: number }[] = serie.map((s, i) => ({
          x: x0 + i * step,
          y: y0 + h - (s.receita / maxV) * (h - 16) - 8,
        }));
        // Linha
        pdf.setDrawColor(28, 63, 170);
        pdf.setLineWidth(1.5);
        for (let i = 1; i < pts.length; i++) {
          pdf.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        }
        // Pontos + labels
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 110);
        pts.forEach((p, i) => {
          pdf.setFillColor(28, 63, 170);
          pdf.circle(p.x, p.y, 2.5, "F");
          const label = serie[i].mesLabel;
          pdf.text(label, p.x, y0 + h + 12, { align: "center" });
        });
      }
    }

    // Observação livre
    if (observacaoPdf.trim()) {
      let y = ((pdf as any).lastAutoTable?.finalY ?? 200) + 30;
      const lines = pdf.splitTextToSize(observacaoPdf.trim(), pageW - 80);
      const blockH = 24 + lines.length * 12;
      if (y + blockH > pageH - 40) { pdf.addPage(); y = 60; }
      pdf.setFontSize(11);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Observações", 40, y);
      pdf.setDrawColor(220);
      pdf.line(40, y + 4, pageW - 40, y + 4);
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text(lines, 40, y + 20);
    }

    pdf.save(`fechamento-${fechamentoMes}-${slugMulti(planoSel)}-${slugMulti(parceiroSel)}.pdf`);
  };

  // ====== Enviar para o módulo Financeiro ======
  const enviarParaFinanceiro = async () => {
    if (!fechamentoData || !fechamentoSelecionado) return;
    const { y, m, labelMes, cicloLabel } = fechamentoData;
    const detalhesPorCliente = fechamentoSelecionado.detalhes;
    const totalReceita = fechamentoSelecionado.totalReceita;
    if (detalhesPorCliente.length === 0) {
      toast.error("Selecione ao menos um cliente para enviar ao Financeiro.");
      return;
    }
    const competenciaKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const exibirFechamentoGerado = (fechamentoId: string) => {
      setFiltros({
        ...filtrosRef.current,
        competencia: { type: "single", value: competenciaKey },
      });
      setExpandedMes(competenciaKey);
      setExpandedFechamento(fechamentoId);
      setFechamentoOpen(false);
      setCompetenciaNovoFechamento(null);
    };
    // Quantidade de fechamentos já existentes nessa competência (para numerar o título)
    const jaExistentes = fechamentosVisiveis.filter((f) => f.competencia === competenciaKey).length;
    const tituloFechamento = (nomeFechamento || "").trim()
      || (descricaoConsolidada || "").trim()
      || `${jaExistentes + 1}º fechamento · ${labelMes}`;
    // Snapshot dos itens para persistência
    const itensSnapshot = detalhesPorCliente.map((d) => ({
      clienteId: d.cliente.id,
      planoId: d.plano?.id ?? null,
      cicloInicio: null as string | null,
      cicloFim: null as string | null,
      vencimento: d.venc ?? null,
      valorBruto: Number(d.subtotal.toFixed(2)),
      valorDesconto: Number(d.descontoCliente.toFixed(2)),
      valorLiquido: Number(d.receita.toFixed(2)),
      lancamentoFinanceiroId: null as string | null,
      payloadSnapshot: {
        clienteNome: d.cliente.nome,
        planoNome: d.plano?.nome ?? null,
        sistema: d.sistema,
        acompanhamento: d.acomp,
        ltvDias: d.ltvDias,
        descontosCliente: d.descontosCliente,
      } as Record<string, unknown>,
    }));
    // Preenche ciclo por item
    for (let i = 0; i < detalhesPorCliente.length; i++) {
      const c = detalhesPorCliente[i].cliente;
      const cic = cicloDoCliente(c, y, m);
      itensSnapshot[i].cicloInicio = cic.inicio.toISOString().slice(0, 10);
      itensSnapshot[i].cicloFim = cic.fim.toISOString().slice(0, 10);
    }

    if (modoEnvio === "consolidado") {
      // Vencimento sugerido: maior dia do grupo (ou hoje se não houver)
      const dias = detalhesPorCliente
        .map((d) => (d.venc ? Number(d.venc.slice(8, 10)) : null))
        .filter((x): x is number => x !== null);
      const dia = dias.length > 0 ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 10;
      const ultimoDia = new Date(y, m + 1, 0).getDate();
      const venc = new Date(y, m, Math.min(dia, ultimoDia)).toISOString().slice(0, 10);
      const descricao = (descricaoConsolidada || "").trim() || `Fechamento ${labelMes} · ciclo ${cicloLabel}`;
      const lancId = addLancamento({
        descricao,
        tipo: "fechamento",
        categoria: "Receita",
        valor: Number(totalReceita.toFixed(2)),
        vencimento: venc,
        competencia: `${competenciaKey}-consolidado-${Date.now()}`,
        status: "pendente",
        nfEmitida: false,
      });
      // Vincula todos os itens ao lançamento consolidado
      for (const it of itensSnapshot) it.lancamentoFinanceiroId = lancId;
      try {
        const fechamentoId = await addFechamento(
          {
            competencia: competenciaKey,
            titulo: tituloFechamento,
            descricao: descricao,
            status: "emitido",
            totalBruto: Number(fechamentoSelecionado.subtotalBruto.toFixed(2)),
            totalDesconto: Number(fechamentoSelecionado.descontoTotal.toFixed(2)),
            totalLiquido: Number(totalReceita.toFixed(2)),
            observacao: observacaoPdf.trim() || null,
          },
          itensSnapshot,
        );
        exibirFechamentoGerado(fechamentoId);
        toast.success("Fechamento gerado e exibido no Resumo.");
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível gerar o fechamento.");
        return;
      }
    } else {
      let n = 0;
      for (const d of detalhesPorCliente) {
        const dia = d.venc ? Number(d.venc.slice(8, 10)) : 10;
        const ultimoDia = new Date(y, m + 1, 0).getDate();
        const venc = new Date(y, m, Math.min(dia, ultimoDia)).toISOString().slice(0, 10);
        const descricaoCli = (descricoesPorCliente[d.cliente.id] || "").trim()
          || d.cliente.nomeFinanceiro || d.cliente.nome;
        const lancId = addLancamento({
          descricao: descricaoCli,
          tipo: "fechamento",
          categoria: "Receita",
          valor: Number(d.receita.toFixed(2)),
          vencimento: venc,
          competencia: `${competenciaKey}-${d.cliente.id}-${Date.now()}`,
          status: "pendente",
          nfEmitida: false,
        });
        const item = itensSnapshot.find((x) => x.clienteId === d.cliente.id);
        if (item) item.lancamentoFinanceiroId = lancId;
        n++;
      }
      try {
        const fechamentoId = await addFechamento(
          {
            competencia: competenciaKey,
            titulo: tituloFechamento,
            descricao: `Fechamento por cliente · ${labelMes}`,
            status: "emitido",
            totalBruto: Number(fechamentoSelecionado.subtotalBruto.toFixed(2)),
            totalDesconto: Number(fechamentoSelecionado.descontoTotal.toFixed(2)),
            totalLiquido: Number(totalReceita.toFixed(2)),
            observacao: observacaoPdf.trim() || null,
          },
          itensSnapshot,
        );
        exibirFechamentoGerado(fechamentoId);
        toast.success(`Fechamento gerado com ${n} lançamento(s) e exibido no Resumo.`);
      } catch (e) {
        console.error(e);
        toast.error("Não foi possível gerar o fechamento.");
        return;
      }
    }
  };

  // ====== Enviar por e-mail (placeholder até configurar domínio) ======
  const enviarPorEmail = () => {
    if (!emailDestino || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    toast.message("Envio por e-mail", {
      description:
        "Para enviar o PDF por e-mail é preciso configurar o domínio de envio em Configurações → Emails. Avise-nos para concluirmos essa etapa.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fechamento Mensal</h1>
          <p className="text-muted-foreground text-sm">Cada competência agrupa os fechamentos gerados. Clientes ficam disponíveis assim que o último dia do ciclo passa.</p>
        </div>
      </div>

      {/* Filtros */}
      <FilterBar
        fields={[
          {
            key: "competencia",
            label: "Competência",
            type: "single",
            options: opcoesFechamento.length > 0
              ? opcoesFechamento.map((o) => ({ value: o.key, label: o.label }))
              : [{
                  value: defaultCompetencia,
                  label: formatCompetenciaLabel(
                    Number(defaultCompetencia.slice(0, 4)),
                    Number(defaultCompetencia.slice(5, 7)) - 1,
                  ),
                }],
          },
          {
            key: "tipo",
            label: "Tipo",
            type: "multi",
            options: [
              { value: "elora", label: "Plano Elora" },
              { value: "consultoria", label: "Consultoria" },
            ],
          },
          { key: "plano", label: "Plano", type: "multi", options: planos.map((p) => ({ value: p.id, label: p.nome })) },
          { key: "parceiro", label: "Parceiro", type: "multi", options: parceiros.map((p) => ({ value: p.id, label: p.nome })) },
          { key: "vencimento", label: "Vencimento", type: "multi", options: diasDisponiveis.map((d) => ({ value: String(d), label: `Dia ${d}` })) },
        ] as FilterFieldDef[]}
        value={filtros}
        onChange={setFiltros}
        action={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => abrirNovoFechamento()}>
            <FileText className="h-3.5 w-3.5" /> Gerar Fechamento
          </Button>
        }
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Fechamentos</CardTitle>
          <CardDescription>
            Cada competência agrupa os fechamentos gerados. Expanda para ver os fechamentos, as contas incluídas e os detalhes de cada conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Mês de Competência</TableHead>
                <TableHead className="text-right">Fechamentos</TableHead>
                <TableHead className="text-right">Novos</TableHead>
                <TableHead className="text-right">Churns</TableHead>
                <TableHead className="text-right">Total faturado</TableHead>
                <TableHead className="text-right w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const isExpanded = expandedMes === l.mesKey;
                const fechDaComp = fechamentosVisiveis
                  .filter((f) => f.competencia === l.mesKey)
                  .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""));
                const totalFechado = fechDaComp.reduce((s, f) => s + f.totalLiquido, 0);
                return (
                  <Fragment key={l.mesKey}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        setExpandedMes(isExpanded ? null : l.mesKey);
                        setExpandedFechamento(null);
                      }}
                    >
                      <TableCell className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{l.mesLabel}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fechDaComp.length}</TableCell>
                      <TableCell className="text-right text-accent">+{l.novos}</TableCell>
                      <TableCell className="text-right text-destructive">{l.churns > 0 ? `-${l.churns}` : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatBRL(totalFechado)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5"
                          onClick={() => abrirNovoFechamento(l.mesKey)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Novo fechamento
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${l.mesKey}-detail`} className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={7} className="py-0">
                          <div className="py-3 pl-6 pr-2 space-y-2">
                            {fechDaComp.length === 0 && (
                              <div className="text-xs text-muted-foreground py-2">
                                Nenhum fechamento criado nesta competência ainda. Use “Novo fechamento” para gerar um.
                              </div>
                            )}
                            {fechDaComp.map((f) => {
                              const isFechExpanded = expandedFechamento === f.id;
                              const itens = fechamentoItensVisiveis.filter((i) => i.fechamentoId === f.id);
                              const criadoEmLabel = f.criadoEm
                                ? new Date(f.criadoEm).toLocaleDateString("pt-BR")
                                : "—";
                              return (
                                <div key={f.id} className="rounded border border-border/50 bg-background/40">
                                  <div
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30"
                                    onClick={() => setExpandedFechamento(isFechExpanded ? null : f.id)}
                                  >
                                    {isFechExpanded
                                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium text-sm">{f.titulo}</span>
                                    <Badge variant="outline" className="text-[10px] ml-1">{itens.length} conta(s)</Badge>
                                    <span className="ml-auto flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">{criadoEmLabel}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1.5 text-xs"
                                        title="Auditoria completa deste fechamento"
                                        onClick={(e) => { e.stopPropagation(); setDetalharFechamentoId(f.id); }}
                                      >
                                        <FileSearch className="h-3.5 w-3.5" /> Detalhar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 w-7 p-0"
                                        title="Baixar relatório do fechamento (PDF)"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCompetenciaNovoFechamento(f.competencia);
                                          setFechamentoOpen(true);
                                          setAutoPrintCompetencia(f.competencia);
                                        }}
                                      >
                                        <Printer className="h-3.5 w-3.5" />
                                      </Button>
                                      <span className="text-sm font-semibold text-primary">{formatBRL(f.totalLiquido)}</span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Renomear fechamento"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const novo = window.prompt("Novo título do fechamento:", f.titulo ?? "");
                                          if (novo === null) return;
                                          const t = novo.trim();
                                          if (!t || t === f.titulo) return;
                                          updateFechamento?.(f.id, { titulo: t })
                                            .then(() => toast.success("Título atualizado."))
                                            .catch(() => toast.error("Falha ao atualizar título."));
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Excluir fechamento"
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteFech(f.id); }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </span>
                                  </div>
                                  {isFechExpanded && (
                                    <div className="border-t border-border/40 px-3 py-2">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="text-xs text-muted-foreground border-b border-border/40">
                                            <th className="text-left pb-1 font-medium">Cliente</th>
                                            <th className="text-left pb-1 font-medium">Plano</th>
                                            <th className="text-right pb-1 font-medium">Ciclo</th>
                                            <th className="text-right pb-1 font-medium">Vencimento</th>
                                            <th className="text-right pb-1 font-medium">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {itens.map((it) => {
                                            const cli = clientes.find((c) => c.id === it.clienteId);
                                            const snap = (it.payloadSnapshot ?? {}) as Record<string, any>;
                                            const nome = cli?.nome ?? snap.clienteNome ?? "—";
                                            const planoNome = planos.find((p) => p.id === it.planoId)?.nome ?? snap.planoNome ?? null;
                                            return (
                                              <tr
                                                key={it.id}
                                                className="border-b border-border/20 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                                                onClick={() => setHistoricoCliente({ clienteId: it.clienteId, mesKey: l.mesKey })}
                                                title="Ver detalhes desta conta"
                                              >
                                                <td className="py-1.5 font-medium text-primary underline-offset-2 hover:underline">{nome}</td>
                                                <td className="py-1.5 text-muted-foreground">{abreviarPlano(planoNome)}</td>
                                                <td className="py-1.5 text-right text-muted-foreground text-xs">
                                                  {it.cicloInicio && it.cicloFim
                                                    ? `${new Date(`${it.cicloInicio}T12:00:00`).toLocaleDateString("pt-BR")} → ${new Date(`${it.cicloFim}T12:00:00`).toLocaleDateString("pt-BR")}`
                                                    : "—"}
                                                </td>
                                                <td className="py-1.5 text-right text-muted-foreground text-xs">
                                                  {it.vencimento
                                                    ? new Date(`${it.vencimento}T12:00:00`).toLocaleDateString("pt-BR")
                                                    : "—"}
                                                </td>
                                                <td className="py-1.5 text-right text-primary font-medium">
                                                  {it.valorDesconto > 0 ? (
                                                    <div className="flex flex-col items-end leading-tight">
                                                      <span className="line-through text-[10px] text-muted-foreground font-normal">{formatBRL(it.valorBruto)}</span>
                                                      <span>{formatBRL(it.valorLiquido)}</span>
                                                    </div>
                                                  ) : (
                                                    formatBRL(it.valorLiquido)
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                          {itens.length === 0 && (
                                            <tr><td colSpan={5} className="py-2 text-center text-xs text-muted-foreground">Fechamento sem contas.</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Cadastre clientes para começar a gerar fechamentos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm delete fechamento (admin only) */}
      <AlertDialog open={!!confirmDeleteFech} onOpenChange={(o) => !o && setConfirmDeleteFech(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fechamento persistido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove apenas o registro do fechamento e seus itens detalhados. Lançamentos financeiros vinculados serão preservados para manter o histórico. Só confirme se isso foi solicitado explicitamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDeleteFech) return;
                try {
                  await removeFechamento(confirmDeleteFech);
                  toast.success("Fechamento removido; lançamentos financeiros preservados.");
                } catch {
                  toast.error("Falha ao excluir fechamento.");
                }
                setConfirmDeleteFech(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Prévia do Fechamento */}
      <Dialog
        open={fechamentoOpen}
        onOpenChange={(open) => {
          setFechamentoOpen(open);
          if (!open) setCompetenciaNovoFechamento(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {fechamentoData && (
            <>
              {/* Header com cara de capa de PDF */}
              <div className="bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground p-8 rounded-t-lg">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] opacity-80">Elora · Fechamento Mensal</div>
                      <DialogTitle className="text-3xl font-bold mt-1 capitalize">Competência {fechamentoData.labelMes}</DialogTitle>
                      <p className="text-xs opacity-80 mt-2">
                        {labelMulti(planoSel, "Todos os planos", (id) => planos.find((p) => p.id === id)?.nome ?? id)}
                      </p>
                      <p className="text-[11px] opacity-90 mt-1">
                        Ciclo de faturamento: {fechamentoData.cicloLabel}  ·  Vencimento: {fechamentoData.vencimentoLabel}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 max-w-xl">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider opacity-80">Competência</label>
                          <Select
                            value={fechamentoMes}
                            onValueChange={(v) => {
                              setCompetenciaNovoFechamento(v);
                              setNomeFechamentoTocado(false);
                              setDescricaoConsolidadaTocada(false);
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9 bg-background/10 border-primary-foreground/30 text-primary-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(opcoesFechamento.length > 0
                                ? opcoesFechamento
                                : [{ key: fechamentoMes, label: fechamentoData.labelMes, elegiveis: fechamentoData.ativos.length, aguardando: 0 }]
                              ).map((o) => (
                                <SelectItem key={o.key} value={o.key}>
                                  {o.label} · {o.elegiveis} elegível(is)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider opacity-80">Nome do fechamento</label>
                          <Input
                            value={nomeFechamento}
                            onChange={(e) => { setNomeFechamento(e.target.value); setNomeFechamentoTocado(true); }}
                            placeholder={defaultNomeFechamento}
                            className="mt-1 h-9 bg-background/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60"
                          />
                        </div>
                      </div>
                      {fechamentoData.aguardandoCicloFechar.length > 0 && (
                        <p className="text-[11px] opacity-90 mt-1">
                          ⏳ {fechamentoData.aguardandoCicloFechar.length} cliente(s) aguardando fim do ciclo (
                          {fechamentoData.aguardandoCicloFechar.map((c) => c.nome).join(", ")}) — entram no próximo fechamento.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => {
                          setSelectedClienteIds(new Set());
                          setDescricaoConsolidada("");
                          setDescricaoConsolidadaTocada(false);
                          setDescricoesPorCliente({});
                          setDescricoesPorClienteTocadas({});
                          setObservacaoPdf("");
                          setEmailDestino("");
                          setNomeFechamento("");
                          setNomeFechamentoTocado(false);
                          toast.message("Seleção e campos limpos.");
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <Eraser className="h-4 w-4" /> Limpar tudo
                      </Button>
                      <Button onClick={exportarFechamentoPdf} variant="secondary" className="gap-2">
                        <Download className="h-4 w-4" /> Gerar relatório (PDF)
                      </Button>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
                {/* Opções de exportação */}
                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="incluir-graficos"
                      checked={incluirGraficos}
                      onCheckedChange={(v) => setIncluirGraficos(Boolean(v))}
                    />
                    <Label htmlFor="incluir-graficos" className="text-sm cursor-pointer">
                      Incluir gráficos no PDF
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="obs-pdf" className="text-xs text-muted-foreground">Observação (impressa no final do PDF)</Label>
                    <Textarea
                      id="obs-pdf"
                      value={observacaoPdf}
                      onChange={(e) => setObservacaoPdf(e.target.value)}
                      placeholder="Notas, contexto do mês, recomendações…"
                      className="mt-1 min-h-[72px] text-sm"
                    />
                  </div>
                </div>

                {/* Enviar para Financeiro */}
                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h4 className="text-sm font-semibold">Enviar para o Financeiro</h4>
                      <p className="text-xs text-muted-foreground">Gera lançamentos a partir deste fechamento.</p>
                    </div>
                    <Button onClick={enviarParaFinanceiro} className="gap-2" size="sm">
                      <Send className="h-3.5 w-3.5" /> Gerar fechamento
                    </Button>
                  </div>
                  <RadioGroup value={modoEnvio} onValueChange={(v) => setModoEnvio(v as "consolidado" | "por_cliente")} className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="consolidado" id="m-consolidado" />
                      <span>1 lançamento consolidado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="por_cliente" id="m-por-cliente" />
                      <span>1 lançamento por cliente</span>
                    </label>
                  </RadioGroup>
                  {modoEnvio === "consolidado" ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="desc-consolidada" className="text-xs text-muted-foreground">
                          Nome do boleto / descrição no Financeiro
                        </Label>
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => {
                            setDescricaoConsolidada(defaultDescricaoConsolidada);
                            setDescricaoConsolidadaTocada(false);
                          }}
                        >
                          Restaurar padrão
                        </button>
                      </div>
                      <Input
                        id="desc-consolidada"
                        value={descricaoConsolidada}
                        onChange={(e) => {
                          setDescricaoConsolidada(e.target.value);
                          setDescricaoConsolidadaTocada(true);
                        }}
                        placeholder={defaultDescricaoConsolidada}
                      />
                    </div>
                  ) : (
                    fechamentoSelecionado && fechamentoSelecionado.detalhes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Nome do boleto por cliente (vai para Descrição no Financeiro)
                          </Label>
                          <button
                            type="button"
                            className="text-[11px] text-primary hover:underline"
                            onClick={() => {
                              setDescricoesPorCliente({ ...defaultDescricoesPorCliente });
                              setDescricoesPorClienteTocadas({});
                            }}
                          >
                            Restaurar padrões
                          </button>
                        </div>
                        <div className="rounded-md border border-border/60 max-h-[260px] overflow-y-auto divide-y divide-border/40">
                          {fechamentoSelecionado.detalhes.map((d) => (
                            <div key={d.cliente.id} className="flex items-center gap-2 p-2">
                              <div className="text-xs text-muted-foreground w-44 shrink-0 truncate" title={d.cliente.nome}>
                                {d.cliente.nome}
                              </div>
                              <Input
                                value={descricoesPorCliente[d.cliente.id] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDescricoesPorCliente((prev) => ({ ...prev, [d.cliente.id]: val }));
                                  setDescricoesPorClienteTocadas((prev) => ({ ...prev, [d.cliente.id]: true }));
                                }}
                                placeholder={defaultDescricoesPorCliente[d.cliente.id] ?? ""}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Enviar por e-mail */}
                <div className="rounded-lg border border-border/60 p-4 space-y-3 bg-muted/10">
                  <div>
                    <h4 className="text-sm font-semibold">Enviar por e-mail</h4>
                    <p className="text-xs text-muted-foreground">Envia o resumo deste fechamento para o e-mail informado.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      type="email"
                      placeholder="destinatario@exemplo.com"
                      value={emailDestino}
                      onChange={(e) => setEmailDestino(e.target.value)}
                      className="flex-1 min-w-[220px]"
                    />
                    <Button onClick={enviarPorEmail} variant="outline" className="gap-2" size="sm">
                      <Mail className="h-3.5 w-3.5" /> Enviar
                    </Button>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Clientes selecionados</div>
                    <div className="text-2xl font-semibold mt-1">
                      {fechamentoSelecionado?.count ?? 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {fechamentoData.ativos.length}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Setups no mês</div>
                    <div className="text-2xl font-semibold mt-1 text-accent">+{fechamentoData.setupsNoMes.length}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatBRL(fechamentoData.totalSetups)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Churns</div>
                    <div className="text-2xl font-semibold mt-1 text-destructive">{fechamentoData.churnsNoMes.length > 0 ? `-${fechamentoData.churnsNoMes.length}` : "0"}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fechamento Mensal</div>
                    <div className="text-2xl font-semibold mt-1 text-primary">{formatBRL(fechamentoSelecionado?.totalReceita ?? 0)}</div>
                  </div>
                </div>

                {/* Métricas secundárias: LTV médio, ticket médio, sistema vs acompanhamento (discretos) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">LTV médio</div>
                    <div className="text-sm font-medium mt-0.5">{Math.round(fechamentoSelecionado?.ltvMedioDias ?? 0)} dias</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket médio / cliente</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoSelecionado?.ticketMedio ?? 0)}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor do Sistema</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoSelecionado?.totalSistema ?? 0)}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor do Acompanhamento</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoSelecionado?.totalAcompanhamento ?? 0)}</div>
                  </div>
                </div>

                {/* Gráfico de área: receita mensal recente */}
                {(() => {
                  const serie = linhas.slice(0, 6).reverse(); // mais antigo -> mais recente
                  if (serie.length < 2) return null;
                  const w = 720, h = 140, pad = 24;
                  const maxV = Math.max(...serie.map((s) => s.receita), 1);
                  const stepX = (w - pad * 2) / (serie.length - 1);
                  const points = serie.map((s, i) => {
                    const x = pad + i * stepX;
                    const y = h - pad - (s.receita / maxV) * (h - pad * 2);
                    return { x, y, label: s.mesLabel, v: s.receita };
                  });
                  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                  const area = `${path} L ${points[points.length - 1].x.toFixed(1)} ${(h - pad).toFixed(1)} L ${points[0].x.toFixed(1)} ${(h - pad).toFixed(1)} Z`;
                  return (
                    <div className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receita — últimos {serie.length} meses</h3>
                        <span className="text-[10px] text-muted-foreground">pico: {formatBRL(maxV)}</span>
                      </div>
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
                        <defs>
                          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={area} fill="url(#areaFill)" />
                        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r={3} fill="var(--primary)" />
                            <text x={p.x} y={h - 6} textAnchor="middle" className="fill-muted-foreground" fontSize="9" style={{ textTransform: "capitalize" }}>{p.label}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                {/* Detalhamento por cliente */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhamento por cliente</h3>
                    <span className="text-[10px] text-muted-foreground">
                      Marque os clientes que entram neste fechamento. Os totais, o PDF e o envio ao Financeiro respeitam a seleção.
                    </span>
                  </div>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="text-xs text-muted-foreground">
                          <th className="p-2 w-8">
                            <Checkbox
                              checked={todosSelecionados}
                              onCheckedChange={toggleTodos}
                              aria-label="Selecionar todos"
                            />
                          </th>
                          <th className="text-left p-2 font-medium">Cliente</th>
                          <th className="text-left p-2 font-medium">Plano</th>
                          <th className="text-left p-2 font-medium">Vencimento</th>
                          <th className="text-right p-2 font-medium">LTV</th>
                          <th className="text-right p-2 font-medium">Sistema</th>
                          <th className="text-right p-2 font-medium">Acomp.</th>
                          <th className="text-right p-2 font-medium">Total</th>
                          <th className="text-right p-2 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fechamentoData.detalhesPorCliente.map((d) => (
                          <tr
                            key={d.cliente.id}
                            className={`border-t border-border/30 cursor-pointer hover:bg-muted/20 ${selectedClienteIds.has(d.cliente.id) ? "" : "opacity-50"}`}
                            onClick={() => toggleCliente(d.cliente.id)}
                          >
                            <td className="p-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedClienteIds.has(d.cliente.id)}
                                onCheckedChange={() => toggleCliente(d.cliente.id)}
                                aria-label={`Selecionar ${d.cliente.nome}`}
                              />
                            </td>
                            <td className="p-2 font-medium">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{d.cliente.nome}</span>
                                {d.descontosCliente.map((dc) => (
                                  <Badge key={dc.id} variant="outline" className="text-[10px] gap-1 border-yellow-500/40 text-yellow-600 bg-yellow-500/10">
                                    <Tag className="h-2.5 w-2.5" />
                                    {descreverDesconto(dc)}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-2 text-muted-foreground">{abreviarPlano(d.plano?.nome)}</td>
                            <td className="p-2 text-muted-foreground">{d.venc ? new Date(d.venc).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="p-2 text-right text-muted-foreground">{d.ltvDias} d</td>
                            <td className="p-2 text-right">{formatBRL(d.sistema)}</td>
                            <td className="p-2 text-right">{formatBRL(d.acomp)}</td>
                            <td className="p-2 text-right font-semibold text-primary">
                              {d.descontoCliente > 0 ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="line-through text-[11px] text-muted-foreground font-normal">{formatBRL(d.subtotal)}</span>
                                  <span>{formatBRL(d.receita)}</span>
                                </div>
                              ) : (
                                formatBRL(d.receita)
                              )}
                            </td>
                            <td className="p-2 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Aplicar desconto a este cliente"
                                onClick={() => setDescontoModal({ escopo: "cliente", clienteId: d.cliente.id, clienteNome: d.cliente.nome })}
                              >
                                <Tag className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {fechamentoData.detalhesPorCliente.length === 0 && (
                          <tr><td colSpan={9} className="text-center text-muted-foreground py-6 text-sm">Sem clientes faturados nesta competência.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo Subtotal/Descontos/Total e ações */}
                  <div className="mt-3 rounded-lg border border-border/60 p-3 bg-muted/10">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-muted-foreground">
                        Aplique descontos por cliente (botão <Tag className="inline h-3 w-3 align-middle" />) ou no fechamento inteiro.
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setDescontoModal({ escopo: "fechamento_inteiro", clienteId: null })}
                      >
                        <Plus className="h-3.5 w-3.5" /> Desconto no fechamento
                      </Button>
                    </div>

                    {(fechamentoSelecionado?.descontosGerais.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1">
                        {fechamentoSelecionado!.descontosGerais.map((dg) => (
                          <div key={dg.id} className="flex items-center justify-between text-xs gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-2 py-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag className="h-3 w-3 text-yellow-600 shrink-0" />
                              <span className="font-medium">Fechamento inteiro · {descreverDesconto(dg)}</span>
                              {dg.motivo && <span className="text-muted-foreground truncate">— {dg.motivo}</span>}
                              {dg.recorrente && <Badge variant="outline" className="text-[9px]">recorrente</Badge>}
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDesconto(dg.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Descontos por cliente listados para gestão (remover) */}
                    {fechamentoData.detalhesPorCliente.some((d) => d.descontosCliente.length > 0) && (
                      <div className="mt-2 space-y-1">
                        {fechamentoData.detalhesPorCliente.flatMap((d) =>
                          d.descontosCliente.map((dc) => (
                            <div key={dc.id} className="flex items-center justify-between text-xs gap-2 rounded border border-yellow-500/30 bg-yellow-500/5 px-2 py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <Tag className="h-3 w-3 text-yellow-600 shrink-0" />
                                <span className="font-medium truncate">{d.cliente.nome} · {descreverDesconto(dc)}</span>
                                {dc.motivo && <span className="text-muted-foreground truncate">— {dc.motivo}</span>}
                                {dc.recorrente && <Badge variant="outline" className="text-[9px]">recorrente</Badge>}
                              </div>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDesconto(dc.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )),
                        )}
                      </div>
                    )}

                    <div className="mt-3 border-t border-border/40 pt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatBRL(fechamentoSelecionado?.subtotalBruto ?? 0)}</span>
                      </div>
                      {(fechamentoSelecionado?.descontoTotal ?? 0) > 0 && (
                        <div className="flex justify-between text-yellow-600 dark:text-yellow-500">
                          <span>Descontos</span>
                          <span>-{formatBRL(fechamentoSelecionado!.descontoTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-primary text-base">
                        <span>Total do fechamento</span>
                        <span>{formatBRL(fechamentoSelecionado?.totalReceita ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrades e Downgrades */}
                {fechamentoData.movsMes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upgrades e Downgrades</h3>
                    <div className="space-y-2">
                      {fechamentoData.movsMes
                        .slice()
                        .sort((a, b) => b.data.localeCompare(a.data))
                        .map((mv) => {
                          const c = clientes.find((x) => x.id === mv.clienteId);
                          const isUp = mv.tipo === "upgrade";
                          const Icon = isUp ? TrendingUp : TrendingDown;
                          const deltaReceita = fechamentoData.calcDeltaReceita(mv);
                          return (
                            <div key={mv.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                              <div className={`mt-0.5 rounded-full p-1.5 ${isUp ? "bg-accent/15 text-accent" : "bg-yellow-500/15 text-yellow-500"}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold">{c?.nome ?? "—"}</span>
                                  <Badge variant="outline" className="text-[10px]">{isUp ? "Upgrade" : "Downgrade"}</Badge>
                                  {deltaReceita !== 0 && (
                                    <span className={`text-xs font-semibold ${deltaReceita > 0 ? "text-accent" : "text-destructive"}`}>
                                      {deltaReceita > 0 ? "+" : ""}{formatBRL(deltaReceita)}/mês
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground ml-auto">{mv.data.split("-").reverse().join("/")}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">{descreverMov(mv)}</div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Histórico do cliente no mês */}
      <Dialog open={!!historicoCliente} onOpenChange={(o) => !o && setHistoricoCliente(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {historicoCliente && (() => {
            const cli = clientes.find((c) => c.id === historicoCliente.clienteId);
            if (!cli) return null;
            const y = Number(historicoCliente.mesKey.slice(0, 4));
            const m = Number(historicoCliente.mesKey.slice(5, 7)) - 1;
            const plano = planos.find((p) => p.id === cli.planoId);
            const inicioMes = new Date(y, m, 0).toISOString().slice(0, 10); // último dia do mês anterior
            const fimMes = new Date(y, m + 1, 0).toISOString().slice(0, 10);
            const snapInicio = clienteSnapshotAt(cli, movimentos, inicioMes);
            const snapFim = clienteSnapshotAt(cli, movimentos, fimMes);
            const mrrInicio = receitaMensalCliente(snapInicio, planos, custos);
            const mrrFim = receitaMensalCliente(snapFim, planos, custos);
            const sistemaFim = Math.max(0, mrrFim - (snapFim.valorAcompanhamento || 0));
            const acompFim = snapFim.valorAcompanhamento || 0;
            const recCiclo = receitaCicloCliente(cli, planos, custos, movimentos, y, m);
            const venc = obterVencimentoDaCompetencia(cli, y, m, planos);
            const labelMes = formatCompetenciaLabel(y, m);
            const competenciaKeyDrawer = `${y}-${String(m + 1).padStart(2, "0")}`;
            const descsClienteDrawer = descontosAplicaveis(descontos, competenciaKeyDrawer, "cliente", cli.id);
            const resDescDrawer = calcularDesconto(recCiclo, descsClienteDrawer);
            const recCicloLiquido = resDescDrawer.total;
            const descontoCicloTotal = resDescDrawer.descontoTotal;

            // Movimentos do cliente no mês (ordenados por data crescente)
            const movsMes = movimentos
              .filter((mv) => mv.clienteId === cli.id)
              .filter((mv) => {
                const d = new Date(mv.data);
                return d.getFullYear() === y && d.getMonth() === m;
              })
              .sort((a, b) => a.data.localeCompare(b.data));

            // delta receita por movimento (snapshot antes vs depois)
            const deltaDe = (mv: typeof movimentos[number]) => {
              const after = clienteSnapshotAt(cli, movimentos, mv.data);
              const before: typeof after = { ...after };
              const rev = (cur: number | undefined, val: number | null | undefined) =>
                val === undefined || val === null ? cur : Math.max(0, (cur ?? 0) - val);
              before.canaisWhats = rev(after.canaisWhats, mv.canaisWhats);
              before.canaisInsta = rev(after.canaisInsta, mv.canaisInsta);
              before.canaisMessenger = rev(after.canaisMessenger, mv.canaisMessenger);
              before.canaisZapi = rev(after.canaisZapi, mv.canaisZapi) ?? after.canaisZapi;
              before.usuariosAtivos = rev(after.usuariosAtivos, mv.usuariosAtivos) ?? after.usuariosAtivos;
              before.contatosAtivos = rev(after.contatosAtivos, mv.contatosAtivos) ?? after.contatosAtivos;
              return receitaMensalCliente(after, planos, custos) - receitaMensalCliente(before, planos, custos);
            };

            const deltaMes = mrrFim - mrrInicio;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{cli.nome}</DialogTitle>
                  <p className="text-sm text-muted-foreground capitalize">
                    {labelMes} · {abreviarPlano(plano?.nome)}
                  </p>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MRR início do mês</div>
                    <div className="text-lg font-semibold mt-1">{formatBRL(mrrInicio)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MRR fim do mês</div>
                    <div className="text-lg font-semibold mt-1 text-primary">{formatBRL(mrrFim)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Variação no mês</div>
                    <div className={`text-lg font-semibold mt-1 ${deltaMes > 0 ? "text-accent" : deltaMes < 0 ? "text-destructive" : ""}`}>
                      {deltaMes > 0 ? "+" : ""}{formatBRL(deltaMes)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita do ciclo</div>
                    {descontoCicloTotal > 0 ? (
                      <div className="flex flex-col leading-tight mt-1">
                        <span className="line-through text-xs text-muted-foreground font-normal">{formatBRL(recCiclo)}</span>
                        <span className="text-lg font-semibold">{formatBRL(recCicloLiquido)}</span>
                      </div>
                    ) : (
                      <div className="text-lg font-semibold mt-1">{formatBRL(recCiclo)}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Venc. {venc ? new Date(`${venc}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema (fim do mês)</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(sistemaFim)}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Acompanhamento (fim do mês)</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(acompFim)}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Linha do tempo · {labelMes}</h4>
                  {movsMes.length === 0 && descsClienteDrawer.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/40 rounded-md">
                      Sem movimentações neste mês.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {movsMes.map((mv) => {
                        const delta = mv.tipo === "upgrade" || mv.tipo === "downgrade" ? deltaDe(mv) : 0;
                        const isUp = mv.tipo === "upgrade";
                        const isDown = mv.tipo === "downgrade";
                        const labelTipo =
                          mv.tipo === "setup" ? "Setup" :
                          mv.tipo === "upgrade" ? "Upgrade" :
                          mv.tipo === "downgrade" ? "Downgrade" :
                          mv.tipo === "churn" ? "Churn" : "Serviço";
                        return (
                          <div key={mv.id} className="flex items-start gap-3 rounded-md border border-border/40 p-3">
                            <div className={`mt-0.5 rounded-full p-1.5 ${isUp ? "bg-accent/20 text-accent" : isDown ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                              {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : isDown ? <TrendingDown className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{labelTipo}</Badge>
                                {delta !== 0 && (
                                  <span className={`text-xs font-semibold ${delta > 0 ? "text-accent" : "text-destructive"}`}>
                                    {delta > 0 ? "+" : ""}{formatBRL(delta)}/mês
                                  </span>
                                )}
                                {mv.tipo === "servico" && mv.valorServico ? (
                                  <span className="text-xs font-semibold">{formatBRL(mv.valorServico)}</span>
                                ) : null}
                                <span className="text-xs text-muted-foreground ml-auto">{mv.data.split("-").reverse().join("/")}</span>
                              </div>
                              {(mv.tipo === "upgrade" || mv.tipo === "downgrade") && (
                                <div className="text-xs text-muted-foreground mt-1">{descreverMov(mv)}</div>
                              )}
                              {mv.observacao && (
                                <div className="text-xs text-muted-foreground mt-1 italic">{mv.observacao}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {descsClienteDrawer.map((dc) => (
                        <div key={dc.id} className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3">
                          <div className="mt-0.5 rounded-full p-1.5 bg-yellow-500/20 text-yellow-600">
                            <Tag className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-700">Desconto</Badge>
                              <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-500">
                                -{formatBRL(calcularDesconto(recCiclo, [dc]).descontoTotal)}
                              </span>
                              <span className="text-xs text-muted-foreground">· {descreverDesconto(dc)}</span>
                              {dc.recorrente && <Badge variant="outline" className="text-[9px]">recorrente</Badge>}
                              <span className="text-xs text-muted-foreground ml-auto">fim do ciclo</span>
                            </div>
                            {dc.motivo && (
                              <div className="text-xs text-muted-foreground mt-1 italic">{dc.motivo}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal: Aplicar Desconto */}
      <Dialog open={!!descontoModal} onOpenChange={(o) => { if (!o) { setDescontoModal(null); resetDescontoForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {descontoModal?.escopo === "cliente"
                ? `Desconto · ${descontoModal?.clienteNome ?? ""}`
                : "Desconto no fechamento inteiro"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Competência {fechamentoData?.labelMes ?? ""}
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <RadioGroup value={descTipo} onValueChange={(v) => setDescTipo(v as any)} className="flex flex-wrap gap-3 mt-1">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <RadioGroupItem value="valor" /> Valor em R$
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <RadioGroupItem value="percentual" /> Percentual
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <RadioGroupItem value="isencao_total" /> Isenção total
                </label>
              </RadioGroup>
            </div>

            {descTipo !== "isencao_total" && (
              <div>
                <Label className="text-xs">{descTipo === "valor" ? "Valor (R$)" : "Percentual (%)"}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={descValor}
                  onChange={(e) => setDescValor(e.target.value)}
                  placeholder={descTipo === "valor" ? "Ex.: 50,00" : "Ex.: 10"}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input value={descMotivo} onChange={(e) => setDescMotivo(e.target.value)} placeholder="Ex.: cortesia, ajuste comercial" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={descRecorrente} onCheckedChange={(v) => setDescRecorrente(Boolean(v))} />
              <span>Aplicar também em competências futuras (recorrente)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setDescontoModal(null); resetDescontoForm(); }}>Cancelar</Button>
            <Button onClick={salvarDesconto}>Aplicar desconto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Auditoria completa do fechamento */}
      <Dialog open={!!detalharFechamentoId} onOpenChange={(o) => !o && setDetalharFechamentoId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {(() => {
            if (!detalharFechamentoId) return null;
            const f = fechamentosVisiveis.find((x) => x.id === detalharFechamentoId);
            if (!f) return <p className="text-sm text-muted-foreground">Fechamento não encontrado.</p>;
            const itens = fechamentoItensVisiveis.filter((i) => i.fechamentoId === detalharFechamentoId);
            const clientesFech = itens
              .map((it) => {
                const cli = clientes.find((c) => c.id === it.clienteId);
                const snap = (it.payloadSnapshot ?? {}) as Record<string, any>;
                return { it, cli, nome: cli?.nome ?? snap.clienteNome ?? "—" };
              })
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

            const deltaMovto = (cli: typeof clientes[number], mv: typeof movimentos[number]) => {
              // Impacto comercial por movimento: cada recurso alterado é cobrado/creditado
              // pelo valor unitário do plano, independentemente dos "inclusos" já consumidos.
              // Isso reflete o contrato ("cada login extra = R$ 29,99", "cada canal extra = R$ 29,99")
              // e é o que o cliente vê como impacto de cada evento.
              const plano = planos.find((p) => p.id === cli.planoId);
              if (!plano) return 0;
              const vWhats = plano.valorCanalWhatsExc ?? plano.valorCanaisExc ?? 59.90;
              const vInsta = plano.valorCanalInstaExc ?? plano.valorCanaisExc ?? 59.90;
              const vMsg = plano.valorCanalMessengerExc ?? plano.valorCanaisExc ?? 59.90;
              const vUsers = plano.valorUsuariosExc ?? 39.90;
              const vCont = plano.valorContatosExc ?? 0.10;
              const vZapi = plano.valorZapi ?? 149.00;
              const vIA = plano.valorIA ?? 99.00;
              const vAsaas = plano.valorAsaas ?? 89.00;
              let d = 0;
              d += (mv.canaisWhats ?? 0) * vWhats;
              d += (mv.canaisInsta ?? 0) * vInsta;
              d += (mv.canaisMessenger ?? 0) * vMsg;
              d += (mv.canaisZapi ?? 0) * vZapi;
              d += (mv.usuariosAtivos ?? 0) * vUsers;
              d += (mv.contatosAtivos ?? 0) * vCont;
              if (mv.agentesIA === true && !plano.incluiIA) d += vIA;
              if (mv.agentesIA === false && !plano.incluiIA) d -= vIA;
              if (mv.asaas === true && !plano.incluiAsaas) d += vAsaas;
              if (mv.asaas === false && !plano.incluiAsaas) d -= vAsaas;
              return d;
            };

            const fmtDate = (iso?: string | null) =>
              iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";

            const exportarAuditoriaPdf = () => {
              const pdf = new jsPDF({ unit: "pt", format: "a4" });
              const pageW = pdf.internal.pageSize.getWidth();
              const pageH = pdf.internal.pageSize.getHeight();

              const validos = clientesFech.filter((x) => x.cli);
              const total = validos.length;

              // ===== PÁGINA 1: RESUMO DO FATURAMENTO =====
              pdf.setFillColor(15, 15, 15);
              pdf.rect(0, 0, pageW, 78, "F");
              pdf.setTextColor(255, 255, 255);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(20);
              pdf.text("Resumo do Faturamento", 40, 36);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.text(f.titulo, 40, 58);
              pdf.setFontSize(9);
              pdf.text(
                `${total} cliente(s) faturado(s)   -   Gerado em ${new Date().toLocaleString("pt-BR")}`,
                40,
                72,
              );

              const resumoBody = validos.map(({ cli, it, nome }, idx) => {
                const planoAtual = planos.find((p) => p.id === cli!.planoId);
                return [
                  String(idx + 1),
                  nome,
                  abreviarPlano(planoAtual?.nome),
                  formatBRL(it.valorBruto || 0),
                  it.valorDesconto > 0 ? `-${formatBRL(it.valorDesconto)}` : "—",
                  formatBRL(it.valorLiquido || 0),
                ];
              });

              autoTable(pdf, {
                startY: 100,
                head: [["#", "Cliente", "Plano", "Bruto", "Desconto", "Líquido"]],
                body: resumoBody,
                foot: [[
                  { content: "TOTAIS", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
                  { content: formatBRL(f.totalBruto || 0), styles: { fontStyle: "bold", halign: "right" } },
                  { content: f.totalDesconto > 0 ? `-${formatBRL(f.totalDesconto)}` : "—", styles: { fontStyle: "bold", halign: "right" } },
                  { content: formatBRL(f.totalLiquido || 0), styles: { fontStyle: "bold", halign: "right" } },
                ]] as any,
                styles: { fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [15, 15, 15], textColor: 255 },
                footStyles: { fillColor: [28, 63, 170], textColor: 255 },
                columnStyles: {
                  0: { cellWidth: 24, halign: "center" },
                  1: { cellWidth: "auto" },
                  2: { cellWidth: 120 },
                  3: { cellWidth: 70, halign: "right" },
                  4: { cellWidth: 70, halign: "right" },
                  5: { cellWidth: 75, halign: "right" },
                },
                margin: { left: 40, right: 40 },
              });

              const ticketMedio = total > 0 ? (f.totalLiquido || 0) / total : 0;
              const resumoY = (pdf as any).lastAutoTable.finalY + 18;
              pdf.setTextColor(90, 90, 90);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              pdf.text(`Ticket médio por cliente: ${formatBRL(ticketMedio)}`, 40, resumoY);

              validos.forEach(({ cli, it, nome }, idx) => {
                if (!cli) return;
                const planoAtual = planos.find((p) => p.id === cli.planoId);
                const exp = explicarReceitaCliente(cli, planos);
                const movs = movimentos
                  .filter((m) => m.clienteId === cli.id)
                  .filter((m) => !it.cicloFim || m.data <= it.cicloFim)
                  .sort((a, b) => a.data.localeCompare(b.data));

                // Consolidar movimentos: mesma data + mesmo tipo + mesmo plano
                // vira uma linha só com deltas somados e observações concatenadas.
                type MvAgg = typeof movs[number] & { _obs: string[] };
                const grupos = new Map<string, MvAgg>();
                for (const mv of movs) {
                  const key = `${mv.data}|${mv.tipo}|${mv.planoId ?? ""}`;
                  const existing = grupos.get(key);
                  if (!existing) {
                    grupos.set(key, { ...mv, _obs: mv.observacao ? [mv.observacao] : [] });
                  } else {
                    existing.canaisWhats = (existing.canaisWhats ?? 0) + (mv.canaisWhats ?? 0);
                    existing.canaisInsta = (existing.canaisInsta ?? 0) + (mv.canaisInsta ?? 0);
                    existing.canaisMessenger = (existing.canaisMessenger ?? 0) + (mv.canaisMessenger ?? 0);
                    existing.canaisZapi = (existing.canaisZapi ?? 0) + (mv.canaisZapi ?? 0);
                    existing.usuariosAtivos = (existing.usuariosAtivos ?? 0) + (mv.usuariosAtivos ?? 0);
                    existing.contatosAtivos = (existing.contatosAtivos ?? 0) + (mv.contatosAtivos ?? 0);
                    if (mv.valorServico) existing.valorServico = (existing.valorServico ?? 0) + mv.valorServico;
                    if (mv.observacao) existing._obs.push(mv.observacao);
                  }
                }
                const movsAgrupados = Array.from(grupos.values()).map((g) => ({
                  ...g,
                  observacao: g._obs.join(", "),
                }));

                // Cada cliente começa em página nova → separação inequívoca
                pdf.addPage();

                // Banner do cliente (faixa colorida)
                const bannerY = 40;
                const bannerH = 46;
                const churned = Boolean(cli.dataChurn);
                if (churned) pdf.setFillColor(190, 30, 45);
                else pdf.setFillColor(28, 63, 170);
                pdf.rect(0, bannerY, pageW, bannerH, "F");
                // Faixa lateral de destaque
                if (churned) pdf.setFillColor(220, 220, 220);
                else pdf.setFillColor(253, 224, 71);
                pdf.rect(0, bannerY, 6, bannerH, "F");

                pdf.setTextColor(255, 255, 255);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text(`${idx + 1}. ${nome}`, 20, bannerY + 20);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9);
                const meta: string[] = [];
                if (planoAtual?.nome) meta.push(`Plano: ${planoAtual.nome}`);
                if (cli.dataChurn) meta.push(`Churn: ${fmtDate(cli.dataChurn)}`);
                pdf.text(meta.join("     "), 20, bannerY + 36);

                // Total do cliente à direita do banner
                const totalTxt = `${formatBRL(exp.total)}/mês`;
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(13);
                pdf.text(totalTxt, pageW - 40, bannerY + 28, { align: "right" });

                let cursorY = bannerY + bannerH + 18;

                const sectionTitle = (label: string, y: number) => {
                  pdf.setTextColor(90, 90, 90);
                  pdf.setFont("helvetica", "bold");
                  pdf.setFontSize(9);
                  pdf.text(label.toUpperCase(), 40, y);
                  pdf.setDrawColor(220);
                  pdf.setLineWidth(0.5);
                  pdf.line(40, y + 3, pageW - 40, y + 3);
                };

                // Setup
                sectionTitle("Setup", cursorY);
                autoTable(pdf, {
                  startY: cursorY + 8,
                  head: [["Início", "Plano no setup", "Churn", "Valor setup"]],
                  body: [[
                    fmtDate(cli.dataInicio),
                    planoAtual?.nome ?? "—",
                    fmtDate(cli.dataChurn),
                    formatBRL(cli.valorSetupPago || 0),
                  ]],
                  styles: { fontSize: 9, cellPadding: 5 },
                  headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                  margin: { left: 40, right: 40 },
                });
                cursorY = (pdf as any).lastAutoTable.finalY + 16;

                // Movimentos
                if (movsAgrupados.length > 0) {
                  if (cursorY > pageH - 120) { pdf.addPage(); cursorY = 60; }
                  sectionTitle("Linha do tempo · movimentos", cursorY);
                  autoTable(pdf, {
                    startY: cursorY + 8,
                    head: [["Data", "Tipo", "Descrição", "Valor"]],
                    body: movsAgrupados.map((mv) => {
                      const delta = mv.tipo === "upgrade" || mv.tipo === "downgrade" ? deltaMovto(cli, mv) : 0;
                      const valor = mv.tipo === "servico" && mv.valorServico
                        ? formatBRL(mv.valorServico)
                        : delta !== 0 ? `${delta > 0 ? "+" : ""}${formatBRL(delta)}/mês` : "—";
                      return [fmtDate(mv.data), mv.tipo, descreverMov(mv), valor];
                    }),
                    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
                    headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                    margin: { left: 40, right: 40 },
                    columnStyles: {
                      0: { cellWidth: 55 },
                      1: { cellWidth: 55 },
                      2: { cellWidth: "auto", overflow: "linebreak" },
                      3: { cellWidth: 75, halign: "right" },
                    },
                    didParseCell: (data) => {
                      if (data.section === "body" && data.column.index === 1) {
                        const raw = String(data.cell.raw);
                        if (raw === "upgrade") data.cell.styles.textColor = [21, 128, 61];
                        else if (raw === "downgrade") data.cell.styles.textColor = [185, 28, 28];
                      }
                      if (data.section === "body" && data.column.index === 3) {
                        const raw = String(data.cell.raw ?? "");
                        if (raw.startsWith("+")) data.cell.styles.textColor = [21, 128, 61];
                        else if (raw.startsWith("-")) data.cell.styles.textColor = [185, 28, 28];
                      }
                    },
                  });
                  cursorY = (pdf as any).lastAutoTable.finalY + 16;
                }

                // Composição
                if (cursorY > pageH - 140) { pdf.addPage(); cursorY = 60; }
                sectionTitle("Composição da mensalidade (hoje)", cursorY);
                autoTable(pdf, {
                  startY: cursorY + 8,
                  head: [["Item de cobrança", "Qtd", "Unit.", "Total"]],
                  body: [
                    ...exp.itens.map((i) => [i.label, String(i.qtd), formatBRL(i.unit), formatBRL(i.total)]),
                    [{ content: "Custo Sistema", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }, { content: "", styles: { fillColor: [240, 240, 240] } }, { content: "", styles: { fillColor: [240, 240, 240] } }, { content: formatBRL(exp.subtotalSistema), styles: { fontStyle: "bold", fillColor: [240, 240, 240], halign: "right" } }],
                    ["Custo Acompanhamento", "", "", { content: formatBRL(exp.acompanhamento), styles: { halign: "right" } }],
                    [{ content: "Custo Mês (total)", styles: { fontStyle: "bold", fillColor: [28, 63, 170], textColor: 255 } }, { content: "", styles: { fillColor: [28, 63, 170] } }, { content: "", styles: { fillColor: [28, 63, 170] } }, { content: formatBRL(exp.total), styles: { fontStyle: "bold", fillColor: [28, 63, 170], textColor: 255, halign: "right" } }],
                  ] as any,
                  styles: { fontSize: 9, cellPadding: 5 },
                  headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                  columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
                  margin: { left: 40, right: 40 },
                });
              });

              // Rodapé com paginação e identificação do cliente
              const totalPages = pdf.getNumberOfPages();
              for (let p = 1; p <= totalPages; p++) {
                pdf.setPage(p);
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(140, 140, 140);
                pdf.text(f.titulo, 40, pageH - 20);
                pdf.text(`Página ${p} de ${totalPages}`, pageW - 40, pageH - 20, { align: "right" });
              }

              pdf.save(`auditoria-${f.titulo.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
            };

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" /> Auditoria · {f.titulo}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientesFech.length} cliente(s) · Total {formatBRL(f.totalLiquido)}
                  </p>
                </DialogHeader>

                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={exportarAuditoriaPdf} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Exportar PDF de auditoria
                  </Button>
                </div>

                <div className="space-y-4 mt-2">
                  {clientesFech.map(({ cli, it, nome }) => {
                    if (!cli) return (
                      <div key={it.id} className="rounded border border-border/40 p-3 text-sm text-muted-foreground">
                        {nome} — cliente removido do cadastro.
                      </div>
                    );
                    const planoAtual = planos.find((p) => p.id === cli.planoId);
                    const exp = explicarReceitaCliente(cli, planos);
                    const cicloFimIso = it.cicloFim ?? undefined;
                    const movs = movimentos
                      .filter((m) => m.clienteId === cli.id)
                      .filter((m) => !cicloFimIso || m.data <= cicloFimIso)
                      .sort((a, b) => a.data.localeCompare(b.data));
                    return (
                      <details key={it.id} className="rounded-lg border border-border/50 bg-background/40 group" open={clientesFech.length <= 3}>
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 rounded-t-lg select-none">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                          <span className="font-medium text-sm">{nome}</span>
                          <Badge variant="outline" className="text-[10px]">{abreviarPlano(planoAtual?.nome)}</Badge>
                          {cli.dataChurn && (
                            <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">churn {fmtDate(cli.dataChurn)}</Badge>
                          )}
                          <span className="ml-auto text-sm font-semibold text-primary">{formatBRL(exp.total)}/mês</span>
                        </summary>

                        <div className="border-t border-border/40 px-3 py-3 space-y-4">
                          {/* Setup */}
                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Setup</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="rounded border border-border/40 px-2 py-1.5">
                                <div className="text-muted-foreground text-[10px]">Data de entrada</div>
                                <div className="font-medium">{fmtDate(cli.dataInicio)}</div>
                              </div>
                              <div className="rounded border border-border/40 px-2 py-1.5">
                                <div className="text-muted-foreground text-[10px]">Plano</div>
                                <div className="font-medium">{planoAtual?.nome ?? "—"}</div>
                              </div>
                              <div className="rounded border border-border/40 px-2 py-1.5">
                                <div className="text-muted-foreground text-[10px]">Valor setup pago</div>
                                <div className="font-medium">{formatBRL(cli.valorSetupPago || 0)}</div>
                              </div>
                              <div className="rounded border border-border/40 px-2 py-1.5">
                                <div className="text-muted-foreground text-[10px]">Ciclo do fechamento</div>
                                <div className="font-medium">
                                  {it.cicloInicio && it.cicloFim ? `${fmtDate(it.cicloInicio)} → ${fmtDate(it.cicloFim)}` : "—"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Linha do tempo · todos os movimentos</h5>
                            {movs.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic px-2 py-2 border border-dashed border-border/40 rounded">
                                Sem movimentos registrados.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border/40">
                                      <th className="text-left pb-1 font-medium">Data</th>
                                      <th className="text-left pb-1 font-medium">Tipo</th>
                                      <th className="text-left pb-1 font-medium">Descrição</th>
                                      <th className="text-right pb-1 font-medium">Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {movs.map((mv) => {
                                      const delta = mv.tipo === "upgrade" || mv.tipo === "downgrade" ? deltaMovto(cli, mv) : 0;
                                      const isUp = mv.tipo === "upgrade";
                                      const isDown = mv.tipo === "downgrade";
                                      return (
                                        <tr key={mv.id} className="border-b border-border/20 last:border-0">
                                          <td className="py-1.5">{fmtDate(mv.data)}</td>
                                          <td className="py-1.5">
                                            <Badge variant="outline" className={`text-[10px] ${isUp ? "border-accent/40 text-accent" : isDown ? "border-destructive/40 text-destructive" : ""}`}>
                                              {mv.tipo}
                                            </Badge>
                                          </td>
                                          <td className="py-1.5 text-muted-foreground">{descreverMov(mv)}</td>
                                          <td className="py-1.5 text-right font-medium">
                                            {mv.tipo === "servico" && mv.valorServico
                                              ? formatBRL(mv.valorServico)
                                              : delta !== 0
                                                ? <span className={delta > 0 ? "text-accent" : "text-destructive"}>{delta > 0 ? "+" : ""}{formatBRL(delta)}/mês</span>
                                                : <span className="text-muted-foreground">—</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Composição atual */}
                          <div>
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Composição da mensalidade (hoje)</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground border-b border-border/40">
                                    <th className="text-left pb-1 font-medium">Item</th>
                                    <th className="text-right pb-1 font-medium">Qtd</th>
                                    <th className="text-right pb-1 font-medium">Unit.</th>
                                    <th className="text-right pb-1 font-medium">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {exp.itens.map((item, idx) => (
                                    <tr key={idx} className="border-b border-border/20">
                                      <td className="py-1.5">
                                        {item.label}
                                        {item.incluso && <span className="text-[10px] text-muted-foreground ml-2">({item.incluso})</span>}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums">{item.qtd}</td>
                                      <td className="py-1.5 text-right tabular-nums">{formatBRL(item.unit)}</td>
                                      <td className="py-1.5 text-right font-medium tabular-nums">{formatBRL(item.total)}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-b border-border/40 bg-muted/20">
                                    <td className="py-1.5 font-semibold">Custo Sistema</td>
                                    <td colSpan={2}></td>
                                    <td className="py-1.5 text-right font-semibold tabular-nums">{formatBRL(exp.subtotalSistema)}</td>
                                  </tr>
                                  <tr className="border-b border-border/20">
                                    <td className="py-1.5">Custo Acompanhamento</td>
                                    <td colSpan={2}></td>
                                    <td className="py-1.5 text-right tabular-nums">{formatBRL(exp.acompanhamento)}</td>
                                  </tr>
                                  <tr className="bg-primary/5">
                                    <td className="py-2 font-semibold">Custo Mês (total)</td>
                                    <td colSpan={2}></td>
                                    <td className="py-2 text-right font-bold text-primary tabular-nums">{formatBRL(exp.total)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}