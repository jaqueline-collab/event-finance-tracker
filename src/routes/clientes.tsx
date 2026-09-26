import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  aplicarModeloEmClientes,
  listarModelosPainel,
  type ModeloPainel,
} from "@/lib/dashboard-widgets.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IntegracaoElora } from "@/components/integracao-elora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AcessosCliente } from "@/components/acessos-cliente";
import { ChurnDadosDialog } from "@/components/churn-dados-dialog";
import { useStore, formatBRL, receitaMensalCliente, receitaSistemaCliente, custoMensalCliente, calcularCustoExtraUsuariosHelena, calcularCustoExtraContatosHelena, formatDiaVencimento, faturamentoAcumuladoCliente, mensagemErroPersistencia } from "@/lib/store";
import { toast } from "sonner";
import { Plus, Trash2, MoreVertical, Settings2, XCircle, Info, TrendingUp, TrendingDown, DollarSign, Zap, Pencil, Search, FileSearch, Download, Loader2, Handshake } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TipoMovimento, Cliente, Movimento } from "@/lib/types";
import { FilterBar, type FilterState, type FilterFieldDef } from "@/components/filter-bar";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import { aplicarMovimentoNoCliente } from "@/lib/calc/movimento";
import { explicarReceitaCliente } from "@/lib/calc/receita";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes · Elora" }] }),
  component: ClientesPage,
});

/** Valor sentinela do filtro "Parceiro" para clientes sem parceiro vinculado. */
const SEM_PARCEIRO = "__sem_parceiro__";

const tiposMovimento: { value: TipoMovimento; label: string; color: string }[] = [
  { value: "setup", label: "Setup / Ativação", color: "bg-primary/20 text-primary" },
  { value: "upgrade", label: "Upgrade", color: "bg-fin/20 text-fin" },
  { value: "downgrade", label: "Downgrade", color: "bg-primary/15 text-primary" },
  // Troca neutra de plano: nunca contabilizada como upgrade nem como downgrade.
  { value: "alterar_plano", label: "Alterar plano", color: "bg-muted text-muted-foreground" },
  { value: "churn", label: "Churn", color: "bg-destructive/20 text-destructive" },
  { value: "servico", label: "Serviço avulso", color: "bg-primary/20 text-primary" },
  { value: "acompanhamento", label: "Ajustar acompanhamento", color: "bg-fin/20 text-fin" },
  // Gravado apenas pelo diálogo "Atribuir parceiro" (fora da lista de Tipo de Ação).
  { value: "parceiro", label: "Alteração de parceiro", color: "bg-muted text-muted-foreground" },
];

/** Tipos que trocam plano/recursos por diferença (deltas). */
const ehTipoDelta = (t: TipoMovimento) =>
  t === "upgrade" || t === "downgrade" || t === "alterar_plano";

function ClientesPage() {
  const { clientes, planos, custos, movimentos, parceiros, addCliente, updateCliente, removeCliente, addMovimento, removeMovimento } = useStore();
  const [open, setOpen] = useState(false);
  
  // Modal de Ação (Movimento)
  const [acaoClienteId, setAcaoClienteId] = useState<string | null>(null);
  // Troca de plano em massa: lista de clientes selecionados na tabela.
  const [acaoLoteIds, setAcaoLoteIds] = useState<string[] | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [editMovId, setEditMovId] = useState<string | null>(null);
  // Após marcar churn: exportar / apagar os dados da integração
  const [churnDados, setChurnDados] = useState<{ id: string; nome: string } | null>(null);
  // Diálogo "Atribuir parceiro" (troca de parceiro, sem impacto em valores).
  const [parceiroClienteId, setParceiroClienteId] = useState<string | null>(null);
  const [parceiroForm, setParceiroForm] = useState({
    parceiroId: "_",
    data: new Date().toISOString().slice(0, 10),
    observacao: "",
  });
  const [savingParceiro, setSavingParceiro] = useState(false);
  const [detalhamentoHojeOpen, setDetalhamentoHojeOpen] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [savingMovimento, setSavingMovimento] = useState(false);
  
  const [form, setForm] = useState({
    nome: "",
    nomeFinanceiro: "",
    planoId: planos[0]?.id ?? "",
    parceiroId: planos[0]?.parceiroIds?.[0] ?? "",
    dataInicio: new Date().toISOString().slice(0, 10),
    dataVencimento: "",
    statusComercial: "ativo" as "ativo" | "trial",
    cicloPersonalizado: false,
    cicloDiaInicial: "",
    cicloDiaFinal: "",
    canais: 1,
    canaisWhats: 1,
    canaisInsta: 0,
    canaisMessenger: 0,
    canaisZapi: 0,
    usuariosAtivos: 0,
    contatosAtivos: 0,
    agentesIA: false,
    asaas: false,
    zapi: false,
    transcricaoIA: false,
    valorSetupPago: 0,
    valorAcompanhamento: 0,
  });

  const [movForm, setMovForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "upgrade" as TipoMovimento,
    planoId: "",
    vigenciaPlano: "proximo_ciclo" as "este_ciclo" | "proximo_ciclo",
    cobrancaTroca: "proporcional" as "integral" | "proporcional",
    canaisWhats: "",
    canaisInsta: "",
    canaisMessenger: "",
    canaisZapi: "",
    usuariosAtivos: "",
    contatosAtivos: "",
    agentesIA: false,
    asaas: false,
    zapi: false,
    transcricaoIA: false,
    observacao: "",
    valorSetupPago: "",
    valorAcompanhamento: "",
    // Na troca de plano, o que fazer com quem já tem acompanhamento próprio.
    acompanhamentoRegra: "manter" as "manter" | "padrao",
  });

  // Real-time pricing calculations for the chosen form state
  const selectedPlano = useMemo(() => planos.find(p => p.id === form.planoId), [planos, form.planoId]);
  // Plano pode bloquear a ativação de novos módulos opcionais (o que já está ativo permanece).
  const planoPermiteModulos = selectedPlano?.permiteModulosOpcionais !== false;
  // Mesma trava no modal de movimento (setup/upgrade/downgrade).
  const movPermiteModulos = useMemo(() => {
    const clienteAcao = clientes.find((c) => c.id === acaoClienteId);
    const planoMov = planos.find((p) => p.id === (movForm.planoId || clienteAcao?.planoId));
    return planoMov?.permiteModulosOpcionais !== false;
  }, [clientes, planos, acaoClienteId, movForm.planoId]);

  // Ajuste isolado de acompanhamento: o diálogo fica só com data, valor e observação.
  const soAcompanhamento = movForm.tipo === "acompanhamento";
  const clienteAcaoAtual = clientes.find((c) => c.id === acaoClienteId) ?? null;
  const planoNovoMov = planos.find((p) => p.id === movForm.planoId) ?? null;
  // Pergunta de acompanhamento próprio (individual e em lote).
  const perguntaAcompIndividual =
    !acaoLoteIds &&
    !soAcompanhamento &&
    !!movForm.planoId &&
    !!clienteAcaoAtual &&
    movForm.planoId !== clienteAcaoAtual.planoId &&
    (clienteAcaoAtual.valorAcompanhamento || 0) > 0;
  const loteComAcompProprio = (acaoLoteIds ?? [])
    .map((id) => clientes.find((c) => c.id === id))
    .filter((c): c is Cliente => !!c && (c.valorAcompanhamento || 0) > 0);
  const perguntaAcompLote = !!acaoLoteIds && !!movForm.planoId && loteComAcompProprio.length > 0;


  const realTimePricing = useMemo(() => {
    if (!selectedPlano) return { base: 0, extraCanais: 0, extraCanaisQtd: 0, extraUsers: 0, extraContatos: 0, zapi: 0, ia: 0, asaas: 0, transcricao: 0, custoTotal: 0, receitaTotal: 0, lucroTotal: 0, faturamentoBase: 0, faturamentoCanaisExc: 0, faturamentoUsersExc: 0, faturamentoContatosExc: 0, faturamentoZapi: 0, faturamentoIA: 0, faturamentoAsaas: 0, faturamentoTranscricao: 0 };
    
    // Helena cost prices
    const baseLicenceCost = selectedPlano.licencaBase ?? 149.90;
    const precoCanalWhatsExc = selectedPlano.precoCanalWhatsExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoCanalInstaExc = selectedPlano.precoCanalInstaExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoCanalMessengerExc = selectedPlano.precoCanalMessengerExc ?? selectedPlano.precoCanaisExc ?? 29.90;
    const precoUsuariosExc = selectedPlano.precoUsuariosExc ?? 19.90;
    const precoContatosExc = selectedPlano.precoContatosExc ?? 0.045;
    const precoIA = selectedPlano.precoIA ?? 50.00;
    const precoAsaas = selectedPlano.precoAsaas ?? 49.50;
    const precoZapi = selectedPlano.precoZapi ?? 69.00;
    const precoTranscricaoUser = selectedPlano.precoTranscricaoUser ?? 3.99;

    // Commercial sell prices
    const valorCanalWhatsExc = selectedPlano.valorCanalWhatsExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorCanalInstaExc = selectedPlano.valorCanalInstaExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorCanalMessengerExc = selectedPlano.valorCanalMessengerExc ?? selectedPlano.valorCanaisExc ?? 59.90;
    const valorUsuariosExc = selectedPlano.valorUsuariosExc ?? 39.90;
    const valorContatosExc = selectedPlano.valorContatosExc ?? 0.095;
    const valorIA = selectedPlano.valorIA ?? 99.00;
    const valorAsaas = selectedPlano.valorAsaas ?? 89.00;
    const valorZapi = selectedPlano.valorZapi ?? 149.00;
    const valorTranscricaoUser = selectedPlano.valorTranscricaoUser ?? 7.99;

    // Derive channel counts
    const canaisWhats = form.canaisWhats !== undefined ? form.canaisWhats : (form.canaisZapi || (form.zapi ? 1 : 0));
    const canaisInsta = form.canaisInsta || 0;
    const canaisMessenger = form.canaisMessenger || 0;

    // Excedentes por tipo (mesma regra para custo Helena e faturamento)
    const excWhats = Math.max(0, canaisWhats - (selectedPlano.canaisWhatsInclusos ?? 0));
    const excInsta = Math.max(0, canaisInsta - (selectedPlano.canaisInstaInclusos ?? 0));
    const excMessenger = Math.max(0, canaisMessenger - (selectedPlano.canaisMessengerInclusos ?? 0));
    const totalExtraCanais = excWhats + excInsta + excMessenger;

    // Custo Helena por tipo (sem progressão por agora — preço por canal de cada tipo)
    const extraCanais =
      excWhats * precoCanalWhatsExc +
      excInsta * precoCanalInstaExc +
      excMessenger * precoCanalMessengerExc;

    const usersExcQtd = Math.max(0, form.usuariosAtivos - (selectedPlano.usuariosInclusos ?? 0));
    const extraUsers = calcularCustoExtraUsuariosHelena(usersExcQtd);

    const contatosExcQtd = Math.max(0, form.contatosAtivos - (selectedPlano.contatosInclusos ?? 0));
    const extraContatos = calcularCustoExtraContatosHelena(contatosExcQtd, selectedPlano.contatosInclusos ?? 0);

    // Z-API (cobrado por canal configurado como Z-API excedente aos inclusos no plano)
    const zapiInclusos = typeof selectedPlano.incluiZapi === "number" ? selectedPlano.incluiZapi : (selectedPlano.incluiZapi ? 1 : 0);
    const canaisZapiQtd = form.canaisZapi || 0;
    const qtdZapiCliente = canaisZapiQtd > 0 ? Math.max(0, canaisZapiQtd - zapiInclusos) : 0;
    const faturamentoZapi = qtdZapiCliente * valorZapi;
    const zapi = canaisZapiQtd * precoZapi;

    const ia = (form.agentesIA && !selectedPlano.incluiIA) ? precoIA : 0;
    const faturamentoIA = (form.agentesIA && !selectedPlano.incluiIA) ? valorIA : 0;

    const asaas = (form.asaas && !selectedPlano.incluiAsaas) ? precoAsaas : 0;
    const faturamentoAsaas = (form.asaas && !selectedPlano.incluiAsaas) ? valorAsaas : 0;

    const transcricao = (form.transcricaoIA && !selectedPlano.incluiTranscricao) ? (form.usuariosAtivos * precoTranscricaoUser) : 0;
    const faturamentoTranscricao = (form.transcricaoIA && !selectedPlano.incluiTranscricao) ? (form.usuariosAtivos * valorTranscricaoUser) : 0;

    // Faturamento por canal extra usa o mesmo "excedente por tipo" e o preço de cliente por tipo
    const faturamentoCanaisExc =
      excWhats * valorCanalWhatsExc +
      excInsta * valorCanalInstaExc +
      excMessenger * valorCanalMessengerExc;

    const faturamentoUsersExc = usersExcQtd * valorUsuariosExc;
    const faturamentoContatosExc = contatosExcQtd * valorContatosExc;

    const custoTotal = baseLicenceCost + extraCanais + extraUsers + extraContatos + zapi + ia + asaas + transcricao;
    const receitaTotal = (selectedPlano.valorMensal ?? 0) + 
                          faturamentoCanaisExc + 
                          faturamentoUsersExc + 
                          faturamentoContatosExc + 
                          faturamentoZapi + 
                          faturamentoIA + 
                          faturamentoAsaas + 
                          faturamentoTranscricao + 
                          (form.valorAcompanhamento || 0);
    const lucroTotal = receitaTotal - custoTotal;

    return {
      base: baseLicenceCost,
      extraCanais,
      extraCanaisQtd: totalExtraCanais,
      extraUsers,
      extraContatos,
      zapi,
      ia,
      asaas,
      transcricao,
      custoTotal,
      receitaTotal,
      lucroTotal,
      faturamentoBase: selectedPlano.valorMensal ?? 0,
      faturamentoCanaisExc,
      faturamentoUsersExc,
      faturamentoContatosExc,
      faturamentoZapi,
      faturamentoIA,
      faturamentoAsaas,
      faturamentoTranscricao,
    };
  }, [selectedPlano, form]);

  const handlePlanoChange = (planoId: string) => {
    const chosen = planos.find(p => p.id === planoId);
    setForm(prev => {
      const partnerId = (chosen && chosen.parceiroIds && chosen.parceiroIds.length > 0)
        ? chosen.parceiroIds[0]
        : "";
      const zapiInclusos = chosen ? (typeof chosen.incluiZapi === "number" ? chosen.incluiZapi : (chosen.incluiZapi ? 1 : 0)) : 0;
      const permite = chosen?.permiteModulosOpcionais !== false;
      return {
        ...prev,
        planoId,
        parceiroId: partnerId,
        // Auto fill recommended limits
        canais: chosen?.canaisInclusos ?? 1,
        usuariosAtivos: chosen?.usuariosInclusos ?? 0,
        contatosAtivos: chosen?.contatosInclusos ?? 0,
        // Acompanhamento padrão do plano — só preenche quando o cliente ainda não tem valor próprio.
        valorAcompanhamento: prev.valorAcompanhamento > 0 ? prev.valorAcompanhamento : (chosen?.valorAcompanhamento ?? 0),
        // Plano sem módulos opcionais: nada é ativado, mas o que já estava marcado não é removido.
        agentesIA: permite ? (chosen?.incluiIA ?? false) : prev.agentesIA,
        asaas: permite ? (chosen?.incluiAsaas ?? false) : prev.asaas,
        zapi: permite ? zapiInclusos > 0 : prev.zapi,
        canaisZapi: permite && zapiInclusos > 0 ? zapiInclusos : prev.canaisZapi,
        transcricaoIA: permite ? (chosen?.incluiTranscricao ?? false) : prev.transcricaoIA,
      };
    });
  };

  const handleParceiroChange = (parceiroId: string) => {
    setForm(prev => {
      let targetPlanoId = prev.planoId;
      const matchedPlano = planos.find(p => p.parceiroIds && p.parceiroIds.includes(parceiroId));
      if (matchedPlano) {
        targetPlanoId = matchedPlano.id;
      }
      return { ...prev, parceiroId: parceiroId === "_" ? "" : parceiroId, planoId: targetPlanoId };
    });
  };

  const openAcaoModal = (c: Cliente, tipo: TipoMovimento) => {
    setAcaoClienteId(c.id);
    const isDelta = ehTipoDelta(tipo);
    setMovForm({
      data: new Date().toISOString().slice(0, 10),
      tipo,
      planoId: isDelta ? "" : (c.planoId || ""),
      vigenciaPlano: "proximo_ciclo",
      cobrancaTroca: "proporcional",
      // Upgrade/Downgrade: campos começam vazios (entram apenas as diferenças).
      // Setup: pré-preenche com a configuração atual do cliente.
      canaisWhats: isDelta ? "" : String(c.canaisWhats ?? 0),
      canaisInsta: isDelta ? "" : String(c.canaisInsta ?? 0),
      canaisMessenger: isDelta ? "" : String(c.canaisMessenger ?? 0),
      canaisZapi: isDelta ? "" : String(c.canaisZapi || 0),
      usuariosAtivos: isDelta ? "" : String(c.usuariosAtivos ?? ""),
      contatosAtivos: isDelta ? "" : String(c.contatosAtivos ?? ""),
      agentesIA: c.agentesIA || false,
      asaas: c.asaas || false,
      zapi: c.zapi || false,
      transcricaoIA: c.transcricaoIA || false,
      observacao: "",
      valorSetupPago: String(c.valorSetupPago || 0),
      valorAcompanhamento: String(c.valorAcompanhamento || 0),
      acompanhamentoRegra: "manter",
    });
  };

  // Prévia do impacto financeiro do movimento (simulação em memória, nada é gravado).
  /**
   * Valor de acompanhamento que este movimento aplica ao cliente.
   * - Ajuste direto: o valor digitado no campo.
   * - Troca de plano com acompanhamento próprio: depende da escolha "manter/padrão".
   * - Demais casos: undefined (a herança automática do plano continua valendo).
   */
  const acompanhamentoDoMovimento = (cliente: Cliente): number | undefined => {
    if (movForm.tipo === "acompanhamento") {
      const v = Number(movForm.valorAcompanhamento);
      return Number.isFinite(v) && movForm.valorAcompanhamento.trim() !== ""
        ? Math.max(0, v)
        : (cliente.valorAcompanhamento || 0);
    }
    if (movForm.planoId && movForm.planoId !== cliente.planoId && (cliente.valorAcompanhamento || 0) > 0) {
      if (movForm.acompanhamentoRegra === "padrao") {
        return planos.find((p) => p.id === movForm.planoId)?.valorAcompanhamento ?? 0;
      }
      return cliente.valorAcompanhamento || 0;
    }
    return undefined;
  };

  const simularMovimentoCliente = (cliente: Cliente) => {
    const parseNum = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const soAcomp = movForm.tipo === "acompanhamento";
    const movimento: Omit<Movimento, "id"> = {
      clienteId: cliente.id,
      data: movForm.data,
      tipo: movForm.tipo,
      planoId: soAcomp ? undefined : movForm.planoId || undefined,
      canaisWhats: soAcomp ? undefined : parseNum(movForm.canaisWhats),
      canaisInsta: soAcomp ? undefined : parseNum(movForm.canaisInsta),
      canaisMessenger: soAcomp ? undefined : parseNum(movForm.canaisMessenger),
      canaisZapi: soAcomp ? undefined : parseNum(movForm.canaisZapi),
      usuariosAtivos: soAcomp ? undefined : parseNum(movForm.usuariosAtivos),
      contatosAtivos: soAcomp ? undefined : parseNum(movForm.contatosAtivos),
      agentesIA: soAcomp ? undefined : movForm.agentesIA,
      asaas: soAcomp ? undefined : movForm.asaas,
      zapi: soAcomp ? undefined : movForm.zapi,
      transcricaoIA: soAcomp ? undefined : movForm.transcricaoIA,
      valorAcompanhamento: acompanhamentoDoMovimento(cliente),
    };

    const atual = receitaMensalCliente(cliente, planos, custos);
    if (movForm.tipo === "churn") {
      return { churn: true, atual, depois: 0, delta: -atual, mudancas: [] as string[] };
    }

    const simulado = aplicarMovimentoNoCliente(cliente, movimento, planos);
    const depois = receitaMensalCliente(simulado, planos, custos);

    const antes = explicarReceitaCliente(cliente, planos);
    const dep = explicarReceitaCliente(simulado, planos);
    const labels = Array.from(new Set([...antes.itens, ...dep.itens].map((i) => i.label)));
    const mudancas: string[] = [];
    for (const label of labels) {
      const a = antes.itens.find((i) => i.label === label);
      const d = dep.itens.find((i) => i.label === label);
      const va = a?.total ?? 0;
      const vd = d?.total ?? 0;
      if (Math.abs(vd - va) < 0.005) continue;
      const sinal = vd > va ? "+" : "−";
      mudancas.push(`${label}: ${sinal} ${formatBRL(Math.abs(vd - va))}`);
    }
    // Acompanhamento mensal recorrente: mostra sempre que houver troca de plano,
    // inclusive com diferença zero (deixa claro que o valor próprio foi mantido).
    if (movForm.tipo === "acompanhamento" || (movForm.planoId && movForm.planoId !== cliente.planoId)) {
      const diff = dep.acompanhamento - antes.acompanhamento;
      mudancas.push(
        Math.abs(diff) < 0.005
          ? `Acompanhamento: sem alteração (${formatBRL(antes.acompanhamento)})`
          : `Acompanhamento: ${diff > 0 ? "+" : "−"} ${formatBRL(Math.abs(diff))} (${formatBRL(antes.acompanhamento)} → ${formatBRL(dep.acompanhamento)})`,
      );
    }

    return { churn: false, atual, depois, delta: depois - atual, mudancas };
  };

  const previaMovimento = useMemo(() => {
    const cliente = clientes.find((c) => c.id === acaoClienteId);
    if (!cliente) return null;
    const tiposComImpacto: TipoMovimento[] = ["setup", "upgrade", "downgrade", "alterar_plano", "churn", "acompanhamento"];
    if (!tiposComImpacto.includes(movForm.tipo)) return null;
    return simularMovimentoCliente(cliente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acaoClienteId, clientes, planos, custos, movForm]);

  // Prévia por cliente no modo lote (o impacto varia conforme os recursos de cada um).
  const previaLote = useMemo(() => {
    if (!acaoLoteIds || acaoLoteIds.length === 0) return null;
    const linhas = acaoLoteIds
      .map((id) => clientes.find((c) => c.id === id))
      .filter((c): c is Cliente => !!c)
      .map((c) => {
        const p = simularMovimentoCliente(c);
        return { id: c.id, nome: c.nome, atual: p.atual, depois: p.depois, delta: p.delta, mudancas: p.mudancas };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return {
      linhas,
      totalAtual: linhas.reduce((s, l) => s + l.atual, 0),
      totalDepois: linhas.reduce((s, l) => s + l.depois, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acaoLoteIds, clientes, planos, custos, movForm]);


  const handleSaveMovimento = async () => {
    if (!acaoClienteId) {
      toast.error("Selecione um cliente antes de salvar a movimentação.");
      return;
    }
    if (!movForm.data) {
      toast.error("Informe a data da movimentação antes de salvar.");
      return;
    }
    const parseNum = (v: string) => (v.trim() === "" ? undefined : Number(v));
    const clienteAlvo = clientes.find((c) => c.id === acaoClienteId);
    const soAcomp = movForm.tipo === "acompanhamento";
    const acompValor = clienteAlvo ? acompanhamentoDoMovimento(clienteAlvo) : undefined;
    // Editing: remove old (revertendo deltas) e recria com novos valores
    setSavingMovimento(true);
    try {
      if (editMovId) {
        await removeMovimento(editMovId);
      }
      await addMovimento({
      clienteId: acaoClienteId,
      data: movForm.data,
      tipo: movForm.tipo,
      planoId: soAcomp ? undefined : movForm.planoId || undefined,
      // Regra escolhida para a troca de plano (só faz sentido quando há plano novo)
      vigenciaPlano: !soAcomp && movForm.planoId ? movForm.vigenciaPlano : undefined,
      cobrancaTroca:
        !soAcomp && movForm.planoId && movForm.vigenciaPlano === "este_ciclo"
          ? movForm.cobrancaTroca
          : undefined,
      canaisWhats: soAcomp ? undefined : parseNum(movForm.canaisWhats),
      canaisInsta: soAcomp ? undefined : parseNum(movForm.canaisInsta),
      canaisMessenger: soAcomp ? undefined : parseNum(movForm.canaisMessenger),
      canaisZapi: soAcomp ? undefined : parseNum(movForm.canaisZapi),
      usuariosAtivos: soAcomp ? undefined : parseNum(movForm.usuariosAtivos),
      contatosAtivos: soAcomp ? undefined : parseNum(movForm.contatosAtivos),
      agentesIA: soAcomp ? undefined : movForm.agentesIA,
      asaas: soAcomp ? undefined : movForm.asaas,
      zapi: soAcomp ? undefined : movForm.zapi,
      transcricaoIA: soAcomp ? undefined : movForm.transcricaoIA,
      valorAcompanhamento: acompValor,
      observacao: movForm.observacao || undefined,
      });
      toast.success("Movimentação salva com sucesso.");
      if (movForm.tipo === "churn") {
        const alvo = clientes.find((c) => c.id === acaoClienteId);
        if (!alvo?.dataChurn) {
          setChurnDados({ id: acaoClienteId, nome: alvo?.nome ?? acaoClienteId });
        }
      }
    } catch (err) {
      toast.error(mensagemErroPersistencia(err, "Movimentação"));
      return;
    } finally {
      setSavingMovimento(false);
    }
    setAcaoClienteId(null);
    setEditMovId(null);
  };

  // Troca de plano em massa: grava um movimento por cliente, um de cada vez.
  const handleSaveLote = async () => {
    if (!acaoLoteIds || acaoLoteIds.length === 0) return;
    if (!movForm.data) {
      toast.error("Informe a data da movimentação antes de salvar.");
      return;
    }
    if (!movForm.planoId) {
      toast.error("Escolha o plano novo antes de aplicar a troca em massa.");
      return;
    }
    if (!window.confirm(`Confirmar troca de plano para ${acaoLoteIds.length} cliente(s)?`)) return;

    setSavingMovimento(true);
    const falhas: string[] = [];
    let ok = 0;
    for (const id of acaoLoteIds) {
      const alvo = clientes.find((c) => c.id === id);
      try {
        await addMovimento({
          clienteId: id,
          data: movForm.data,
          tipo: movForm.tipo,
          planoId: movForm.planoId,
          vigenciaPlano: movForm.vigenciaPlano,
          cobrancaTroca: movForm.vigenciaPlano === "este_ciclo" ? movForm.cobrancaTroca : undefined,
          valorAcompanhamento: alvo ? acompanhamentoDoMovimento(alvo) : undefined,
          observacao: movForm.observacao || undefined,
        });
        ok += 1;
      } catch {
        falhas.push(alvo?.nome ?? id);
      }
    }
    setSavingMovimento(false);

    if (falhas.length === 0) {
      toast.success(`Plano trocado para ${ok} cliente(s).`);
    } else {
      toast.error(`${ok} cliente(s) atualizados. Falharam: ${falhas.join(", ")}.`);
    }
    setAcaoLoteIds(null);
    setSelecionados([]);
  };

  const openAtribuirParceiro = (c: Cliente) => {
    setParceiroClienteId(c.id);
    setParceiroForm({
      parceiroId: c.parceiroId || "_",
      data: new Date().toISOString().slice(0, 10),
      observacao: "",
    });
  };

  /**
   * Troca de parceiro: grava o movimento no histórico e atualiza o cadastro.
   * Não altera nenhum valor cobrado nem fechamentos já gerados.
   */
  const handleSaveParceiro = async () => {
    const cliente = clientes.find((c) => c.id === parceiroClienteId);
    if (!cliente) return;
    if (!parceiroForm.data) {
      toast.error("Informe a data da alteração de parceiro.");
      return;
    }
    const novo = parceiroForm.parceiroId === "_" ? null : parceiroForm.parceiroId;
    const anterior = cliente.parceiroId || null;
    if (novo === anterior) {
      toast.error("O parceiro escolhido é o mesmo que já está vinculado.");
      return;
    }
    const nomeDe = (id: string | null) =>
      id ? (parceiros.find((p) => p.id === id)?.nome ?? id) : "Sem parceiro";

    setSavingParceiro(true);
    try {
      await addMovimento({
        clienteId: cliente.id,
        data: parceiroForm.data,
        tipo: "parceiro",
        parceiroAnteriorId: anterior,
        parceiroNovoId: novo,
        observacao:
          parceiroForm.observacao ||
          `Parceiro alterado de ${nomeDe(anterior)} para ${nomeDe(novo)}`,
      });
      await updateCliente(cliente.id, { parceiroId: novo });
      toast.success(`Parceiro atualizado para ${nomeDe(novo)}.`);
      setParceiroClienteId(null);
    } catch (err) {
      toast.error(mensagemErroPersistencia(err, "Alteração de parceiro"));
    } finally {
      setSavingParceiro(false);
    }
  };

  const confirmarRemocaoCliente = (c: Cliente) => {
    const texto = `Excluir o cliente ${c.nome}?\n\nEsta ação remove o cadastro e pode esconder lançamentos/histórico ligados a ele. Só confirme se isso foi solicitado explicitamente.`;
    if (window.confirm(texto)) {
      void removeCliente(c.id).catch(() => {});
    }
  };

  const confirmarRemocaoMovimento = (mv: Movimento) => {
    const texto = `Excluir esta movimentação de ${mv.data.split("-").reverse().join("/")}?\n\nSe for upgrade/downgrade, os valores atuais do cliente serão recalculados. Só confirme se isso foi solicitado explicitamente.`;
    if (window.confirm(texto)) {
      void removeMovimento(mv.id).catch(() => {});
    }
  };

  const openEditMovimento = (mv: Movimento) => {
    setAcaoClienteId(mv.clienteId);
    setEditMovId(mv.id);
    setMovForm({
      data: mv.data,
      tipo: mv.tipo,
      planoId: mv.planoId || "",
      vigenciaPlano: mv.vigenciaPlano ?? "proximo_ciclo",
      cobrancaTroca: mv.cobrancaTroca ?? "proporcional",
      canaisWhats: mv.canaisWhats !== undefined && mv.canaisWhats !== null ? String(mv.canaisWhats) : "",
      canaisInsta: mv.canaisInsta !== undefined && mv.canaisInsta !== null ? String(mv.canaisInsta) : "",
      canaisMessenger: mv.canaisMessenger !== undefined && mv.canaisMessenger !== null ? String(mv.canaisMessenger) : "",
      canaisZapi: mv.canaisZapi !== undefined && mv.canaisZapi !== null ? String(mv.canaisZapi) : "",
      usuariosAtivos: mv.usuariosAtivos !== undefined && mv.usuariosAtivos !== null ? String(mv.usuariosAtivos) : "",
      contatosAtivos: mv.contatosAtivos !== undefined && mv.contatosAtivos !== null ? String(mv.contatosAtivos) : "",
      agentesIA: mv.agentesIA ?? false,
      asaas: mv.asaas ?? false,
      zapi: mv.zapi ?? false,
      transcricaoIA: mv.transcricaoIA ?? false,
      observacao: mv.observacao || "",
      valorSetupPago: "",
      valorAcompanhamento:
        mv.valorAcompanhamento !== undefined && mv.valorAcompanhamento !== null
          ? String(mv.valorAcompanhamento)
          : "",
      acompanhamentoRegra: "manter",
    });
  };

  const ordenados = [...movimentos].sort((a, b) => b.data.localeCompare(a.data));

  // Pesquisa
  const [search, setSearch] = useState("");

  // Filtros estilo Monday (compostos)
  const [filtros, setFiltros] = usePersistentFilters("clientes");
  const parceiroSel = (filtros.parceiro?.type === "multi" ? filtros.parceiro.values : []) as string[];
  const planoSel = (filtros.plano?.type === "multi" ? filtros.plano.values : []) as string[];
  const situacaoSel = (filtros.situacao?.type === "multi" ? filtros.situacao.values : []) as string[];
  const setupRange = filtros.setup?.type === "dateRange" ? filtros.setup : null;
  const churnRange = filtros.churn?.type === "dateRange" ? filtros.churn : null;
  const filtrosAtivos = Object.keys(filtros).length > 0;

  // Aplica os filtros (sem ordenação) — base para métricas e lista
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      if (!c.nome.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (parceiroSel.length > 0 && !parceiroSel.includes(c.parceiroId || SEM_PARCEIRO)) return false;
      if (planoSel.length > 0 && !planoSel.includes(c.planoId || "")) return false;
      if (setupRange?.from && (c.dataInicio || "") < setupRange.from) return false;
      if (setupRange?.to && (c.dataInicio || "") > setupRange.to) return false;
      if (churnRange?.from && (!c.dataChurn || c.dataChurn < churnRange.from)) return false;
      if (churnRange?.to && (!c.dataChurn || c.dataChurn > churnRange.to)) return false;
      if (situacaoSel.length > 0) {
        const cancelado = !!c.dataChurn;
        const situacao = cancelado
          ? "cancelado"
          : c.statusComercial === "trial"
            ? "trial"
            : "ativo";
        if (!situacaoSel.includes(situacao)) return false;
      }
      return true;
    });
  }, [clientes, search, parceiroSel, planoSel, situacaoSel, setupRange, churnRange]);

  // Ordena clientes: ativos por data de setup (mais recente primeiro), cancelados ao final
  const clientesOrdenados = useMemo(() => {
    return [...clientesFiltrados].sort((a, b) => {
      const aChurn = !!a.dataChurn;
      const bChurn = !!b.dataChurn;
      if (aChurn !== bChurn) return aChurn ? 1 : -1;
      return (b.dataInicio || "").localeCompare(a.dataInicio || "");
    });
  }, [clientesFiltrados]);

  // Seleção em massa: só vale para o que está visível com os filtros atuais.
  const [modelosPainel, setModelosPainel] = useState<ModeloPainel[]>([]);
  useEffect(() => {
    listarModelosPainel()
      .then((r) => setModelosPainel(r.modelos))
      .catch(() => setModelosPainel([]));
  }, []);

  const selecionadosVisiveis = useMemo(
    () => clientesOrdenados.filter((c) => selecionados.includes(c.id)).map((c) => c.id),
    [clientesOrdenados, selecionados],
  );
  const todosVisiveisSelecionados =
    clientesOrdenados.length > 0 && selecionadosVisiveis.length === clientesOrdenados.length;


  // Faturamento acumulado da carteira (respeita filtros)
  const faturamentoCarteira = useMemo(() => {
    return clientesFiltrados.reduce(
      (s, c) => s + faturamentoAcumuladoCliente(c, planos, custos, movimentos),
      0,
    );
  }, [clientesFiltrados, planos, custos, movimentos]);

  // Margem média de lucro da carteira ativa (respeita filtros)
  const margemMedia = useMemo(() => {
    const ativos = clientesFiltrados.filter((c) => !c.dataChurn);
    if (ativos.length === 0) return 0;
    let receita = 0;
    let custo = 0;
    for (const c of ativos) {
      receita += receitaMensalCliente(c, planos, custos);
      custo += custoMensalCliente(c, planos, custos);
    }
    if (receita <= 0) return 0;
    return ((receita - custo) / receita) * 100;
  }, [clientesFiltrados, planos, custos]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">Situação atual de cada cliente e histórico</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar cliente..." className="pl-8 h-9" />
          </div>
          <Button variant="outline" onClick={() => setDetalhamentoHojeOpen(true)}>
            <FileSearch className="mr-2 h-4 w-4" /> Detalhamento de hoje
          </Button>
          <Button onClick={() => setOpen((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      {/* Filtros (no topo) */}
      <FilterBar
        fields={[
          { key: "plano", label: "Plano", type: "multi", options: planos.map((p) => ({ value: p.id, label: p.nome })) },
          { key: "parceiro", label: "Parceiro", type: "multi", options: [
            ...parceiros.map((p) => ({ value: p.id, label: p.nome })),
            { value: SEM_PARCEIRO, label: "Sem parceiro (N/A)" },
          ] },
          { key: "situacao", label: "Situação", type: "multi", options: [
            { value: "ativo", label: "Ativo" },
            { value: "trial", label: "Trial" },
            { value: "cancelado", label: "Cancelado" },
          ] },
          { key: "setup", label: "Data de setup", type: "dateRange" },
          { key: "churn", label: "Data de churn", type: "dateRange" },
        ] as FilterFieldDef[]}
        value={filtros}
        onChange={setFiltros}
      />

      {/* Resumo da carteira — cards compactos (seguem os filtros) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Faturamento acumulado{filtrosAtivos ? " (filtrado)" : ""}
          </div>
          <div className="text-base font-semibold text-foreground">{formatBRL(faturamentoCarteira)}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Clientes ativos{filtrosAtivos ? " (filtrado)" : ""}
          </div>
          <div className="text-base font-semibold text-foreground">
            {clientesFiltrados.filter((c) => !c.dataChurn).length}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Margem média de lucro{filtrosAtivos ? " (filtrado)" : ""}
          </div>
          <div className={`text-base font-semibold ${margemMedia >= 0 ? "text-primary" : "text-destructive"}`}>
            {margemMedia.toFixed(1)}%
          </div>
        </div>
      </div>

      {open && (
        <Card className="border-border/60 bg-muted/10 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <CardTitle>Novo Cliente</CardTitle>
            <CardDescription>Cadastre as informações da conta e visualize o resumo financeiro simulado</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Formulário Principal */}
              <div className="lg:col-span-2 p-6 space-y-6 border-r border-border/40">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block font-medium">Nome do Cliente</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Acn Corp Ltda" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="mb-1.5 block font-medium">Nome para Financeiro</Label>
                    <Input
                      value={form.nomeFinanceiro}
                      onChange={(e) => setForm({ ...form, nomeFinanceiro: e.target.value })}
                      placeholder="Nome que aparecerá no PDF e nos lançamentos do Financeiro (opcional)"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Plano Contratado</Label>
                    <Select value={form.planoId} onValueChange={handlePlanoChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {planos.filter((p) => p.ativo !== false || p.id === form.planoId).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Parceiro / Agência</Label>
                    <Select value={form.parceiroId || "_"} onValueChange={handleParceiroChange}>
                      <SelectTrigger><SelectValue placeholder="Sem parceiro" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">— Nenhum —</SelectItem>
                        {parceiros.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Data de Início</Label>
                    <Input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Próximo Vencimento (Dia)</Label>
                    <Input type="number" min={1} max={31} placeholder="Ex: 5, 10, 15..." value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block font-medium">Status inicial</Label>
                    <Select value={form.statusComercial} onValueChange={(v) => setForm({ ...form, statusComercial: v === "trial" ? "trial" : "ativo" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="trial">Trial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Personalizar ciclo de faturamento */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="ciclo-pers"
                      checked={form.cicloPersonalizado}
                      onCheckedChange={(v) => setForm({ ...form, cicloPersonalizado: v })}
                    />
                    <Label htmlFor="ciclo-pers" className="text-sm cursor-pointer font-medium">
                      Personalizar ciclo de faturamento
                    </Label>
                    <span className="text-[10px] text-muted-foreground">(sobrescreve o ciclo do plano)</span>
                  </div>
                  {form.cicloPersonalizado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-1.5 block text-xs font-semibold">Dia inicial do ciclo</Label>
                        <Input type="number" min={1} max={31} placeholder="Ex: 1" value={form.cicloDiaInicial} onChange={(e) => setForm({ ...form, cicloDiaInicial: e.target.value })} />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs font-semibold">Dia final do ciclo</Label>
                        <Input type="number" min={1} max={31} placeholder="Ex: 30" value={form.cicloDiaFinal} onChange={(e) => setForm({ ...form, cicloDiaFinal: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">Configuração de Recursos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais WhatsApp</Label>
                      <Input type="number" min={0} value={form.canaisWhats === 0 ? "" : form.canaisWhats} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisWhats: val,
                          canais: val + prev.canaisInsta + prev.canaisMessenger,
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais Instagram</Label>
                      <Input type="number" min={0} value={form.canaisInsta === 0 ? "" : form.canaisInsta} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisInsta: val,
                          canais: prev.canaisWhats + val + prev.canaisMessenger
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Canais Messenger FB</Label>
                      <Input type="number" min={0} value={form.canaisMessenger === 0 ? "" : form.canaisMessenger} onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                        setForm(prev => ({
                          ...prev,
                          canaisMessenger: val,
                          canais: prev.canaisWhats + prev.canaisInsta + val
                        }));
                      }} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Usuários do Painel</Label>
                      <Input type="number" min={1} value={form.usuariosAtivos === 0 ? "" : form.usuariosAtivos} onChange={(e) => setForm({ ...form, usuariosAtivos: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 space-y-4">
                  <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase font-medium">Valores Comerciais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Valor da Taxa de Setup (Cobrado uma vez)</Label>
                      <Input type="number" min={0} value={form.valorSetupPago === 0 ? "" : form.valorSetupPago} onChange={(e) => setForm({ ...form, valorSetupPago: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} placeholder="Ex: 500" />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold">Acompanhamento Mensal Recorrente</Label>
                      <Input type="number" min={0} value={form.valorAcompanhamento === 0 ? "" : form.valorAcompanhamento} onChange={(e) => setForm({ ...form, valorAcompanhamento: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })} placeholder="Ex: 150" />
                    </div>
                  </div>
                </div>

                {/* Switches de Opcionais na mesma linha */}
                <div className="border-t border-border/40 pt-4">
                  <Label className="mb-3 block text-xs font-semibold text-muted-foreground uppercase">Módulos Opcionais Ativados</Label>
                  {!planoPermiteModulos && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      O plano {selectedPlano?.nome} não permite módulos opcionais. Só continuam disponíveis os que já estavam ativos.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-center space-x-2.5">
                      <Switch id="ia" disabled={!planoPermiteModulos && !form.agentesIA} checked={form.agentesIA} onCheckedChange={(v) => setForm({ ...form, agentesIA: v })} />
                      <Label htmlFor="ia" className="text-sm cursor-pointer font-medium">Agentes IA</Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Switch id="asaas" disabled={!planoPermiteModulos && !form.asaas} checked={form.asaas} onCheckedChange={(v) => setForm({ ...form, asaas: v })} />
                      <Label htmlFor="asaas" className="text-sm cursor-pointer font-medium">ASAAS</Label>
                    </div>
                    <div className="flex items-center space-x-2.5 border border-border/40 rounded-lg px-3 py-1.5 bg-muted/5">
                      <Zap className="h-4 w-4 text-fin" />
                      <Label htmlFor="zapi-qtd" className="text-sm cursor-pointer font-medium">Canais Z-API:</Label>
                      <Input
                        id="zapi-qtd"
                        type="number"
                        className="w-16 h-8 text-center"
                        min={0}
                        disabled={!planoPermiteModulos && form.canaisZapi === 0}
                        value={form.canaisZapi === 0 ? "" : form.canaisZapi}
                        onChange={(e) => {
                          const digitado = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                          setForm(prev => {
                            // Plano sem módulos: não permite aumentar além do que já estava contratado.
                            const val = planoPermiteModulos ? digitado : Math.min(digitado, prev.canaisZapi);
                            return { ...prev, canaisZapi: val, zapi: val > 0 };
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <Switch id="trans" disabled={!planoPermiteModulos && !form.transcricaoIA} checked={form.transcricaoIA} onCheckedChange={(v) => setForm({ ...form, transcricaoIA: v })} />
                      <Label htmlFor="trans" className="text-sm cursor-pointer font-medium">Transcrição IA</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Painel do Resumo de Custos e Lucro em Tempo Real */}
              <div className="bg-muted/30 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <DollarSign className="h-5 w-5 text-fin" />
                    <h3 className="font-semibold text-base tracking-tight">Simulação em Tempo Real</h3>
                  </div>

                  {/* Volume Contemplado vs Preço */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Plano base ({selectedPlano?.nome}):</span>
                      <span className="font-medium text-foreground">{formatBRL(realTimePricing.faturamentoBase)}</span>
                    </div>

                    {form.valorAcompanhamento > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Acompanhamento comercial:</span>
                        <span className="font-medium text-foreground">+{formatBRL(form.valorAcompanhamento)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoCanaisExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Canais extras (+{realTimePricing.extraCanaisQtd}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoCanaisExc)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoUsersExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Usuários extras (+{Math.max(0, form.usuariosAtivos - (selectedPlano?.usuariosInclusos ?? 0))}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoUsersExc)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoContatosExc > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Contatos extras:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoContatosExc)}</span>
                      </div>
                    )}

                    {form.canaisZapi > 0 && realTimePricing.faturamentoZapi > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Z-API ({form.canaisZapi} {form.canaisZapi === 1 ? 'canal' : 'canais'}):</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoZapi)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoIA > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Agentes IA Ativo:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoIA)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoAsaas > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>ASAAS Ativo:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoAsaas)}</span>
                      </div>
                    )}

                    {realTimePricing.faturamentoTranscricao > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Transcrição IA Ativa:</span>
                        <span className="font-medium text-foreground">+{formatBRL(realTimePricing.faturamentoTranscricao)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center font-semibold text-sm pt-2 border-t border-border/40 text-fin mt-1">
                      <span>Faturamento Mensal (MRR):</span>
                      <span>{formatBRL(realTimePricing.receitaTotal)}</span>
                    </div>

                    {form.valorSetupPago > 0 && (
                      <div className="flex justify-between items-center text-xs text-primary font-medium py-1">
                        <span>Taxa de Setup única:</span>
                        <span>{formatBRL(form.valorSetupPago)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border mt-2 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Custo da Infraestrutura:</p>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Licença base:</span>
                        <span>{formatBRL(realTimePricing.base)}</span>
                      </div>

                      {realTimePricing.extraCanais > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Canais extra (+{realTimePricing.extraCanaisQtd}):</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.extraCanais)}</span>
                        </div>
                      )}

                      {realTimePricing.extraUsers > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Users extra (+{Math.max(0, form.usuariosAtivos - (selectedPlano?.usuariosInclusos ?? 0))}):</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.extraUsers)}</span>
                        </div>
                      )}

                      {form.canaisZapi > 0 && realTimePricing.zapi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Modulação Z-API ({form.canaisZapi} {form.canaisZapi === 1 ? 'canal' : 'canais'}):</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.zapi)}</span>
                        </div>
                      )}

                      {realTimePricing.ia > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Módulo Inteligência Artificial:</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.ia)}</span>
                        </div>
                      )}

                      {realTimePricing.asaas > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gateway de Pagamento ASAAS:</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.asaas)}</span>
                        </div>
                      )}

                      {realTimePricing.transcricao > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transcrição IA ({form.usuariosAtivos} users):</span>
                          <span className="text-primary">+{formatBRL(realTimePricing.transcricao)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border mt-6">
                  <div className="rounded-lg bg-background/50 p-3 space-y-2 border border-border/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Total Custo mensal:</span>
                      <span className="font-semibold text-primary">{formatBRL(realTimePricing.custoTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1 border-t border-border/20">
                      <span className="font-semibold text-muted-foreground">Resultado Líquido:</span>
                      <span className={`font-bold ${realTimePricing.lucroTotal >= 0 ? "text-fin" : "text-destructive"}`}>
                        {formatBRL(realTimePricing.lucroTotal)}/mês
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11"
                    disabled={savingCliente}
                    onClick={async () => {
                      if (!form.nome || !form.planoId) {
                        toast.error("Preencha o nome e selecione um plano antes de salvar.");
                        return;
                      }
                      setSavingCliente(true);
                      try {
                      await addCliente({
                        nome: form.nome,
                        nomeFinanceiro: form.nomeFinanceiro.trim() || null,
                        planoId: form.planoId,
                        dataInicio: form.dataInicio,
                        dataChurn: null,
                        dataVencimento: form.dataVencimento || null,
                        statusComercial: form.statusComercial,
                        parceiroId: form.parceiroId || null,
                        canais: form.canaisWhats + form.canaisInsta + form.canaisMessenger,
                        canaisZapi: form.canaisZapi,
                        canaisWhats: form.canaisWhats,
                        canaisInsta: form.canaisInsta,
                        canaisMessenger: form.canaisMessenger,
                        usuariosAtivos: form.usuariosAtivos,
                        contatosAtivos: form.contatosAtivos,
                        agentesIA: form.agentesIA,
                        asaas: form.asaas,
                        zapi: form.zapi,
                        transcricaoIA: form.transcricaoIA,
                        valorSetupPago: form.valorSetupPago,
                        valorAcompanhamento: form.valorAcompanhamento,
                        cicloPersonalizado: form.cicloPersonalizado,
                        cicloDiaInicial: form.cicloPersonalizado && form.cicloDiaInicial ? Math.max(1, Math.min(31, Number(form.cicloDiaInicial))) : null,
                        cicloDiaFinal: form.cicloPersonalizado && form.cicloDiaFinal ? Math.max(1, Math.min(31, Number(form.cicloDiaFinal))) : null,
                        extras: {},
                        apps: 1,
                        mau: form.contatosAtivos
                      });
                      toast.success("Cliente salvo com sucesso.");
                      } catch (err) {
                        toast.error(mensagemErroPersistencia(err, "Cadastro do cliente"));
                        return;
                      } finally {
                        setSavingCliente(false);
                      }
                      setForm({
                        nome: "",
                        nomeFinanceiro: "",
                        planoId: planos[0]?.id ?? "",
                        parceiroId: "",
                        dataInicio: new Date().toISOString().slice(0, 10),
                        dataVencimento: "",
                        statusComercial: "ativo",
                        cicloPersonalizado: false,
                        cicloDiaInicial: "",
                        cicloDiaFinal: "",
                        canais: 1,
                        canaisWhats: 1,
                        canaisInsta: 0,
                        canaisMessenger: 0,
                        canaisZapi: 0,
                        usuariosAtivos: 0,
                        contatosAtivos: 0,
                        agentesIA: false,
                        asaas: false,
                        zapi: false,
                        transcricaoIA: false,
                        valorSetupPago: 0,
                        valorAcompanhamento: 0,
                      });
                      setOpen(false);
                    }}
                  >
                    {savingCliente ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : "Salvar Cliente"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de ações em massa */}
      {selecionadosVisiveis.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-card px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold">
            {selecionadosVisiveis.length} cliente(s) selecionado(s)
          </span>
          <Button
            size="sm"
            onClick={() => {
              setEditMovId(null);
              setMovForm({
                data: new Date().toISOString().slice(0, 10),
                tipo: "upgrade",
                planoId: "",
                vigenciaPlano: "proximo_ciclo",
                cobrancaTroca: "proporcional",
                canaisWhats: "",
                canaisInsta: "",
                canaisMessenger: "",
                canaisZapi: "",
                usuariosAtivos: "",
                contatosAtivos: "",
                agentesIA: false,
                asaas: false,
                zapi: false,
                transcricaoIA: false,
                acompanhamentoRegra: "manter",
                observacao: "",
                valorSetupPago: "0",
                valorAcompanhamento: "0",
              });
              setAcaoLoteIds(selecionadosVisiveis);
            }}
          >
            Trocar plano
          </Button>
          <Select
            value=""
            onValueChange={async (modeloId) => {
              const modelo = modelosPainel.find((m) => m.id === modeloId);
              if (!modelo) return;
              const ok = window.confirm(
                `Isso substitui os widgets de ${selecionadosVisiveis.length} cliente(s) selecionado(s), confirmar?`,
              );
              if (!ok) return;
              try {
                await aplicarModeloEmClientes({
                  data: { modeloId, clienteIds: selecionadosVisiveis },
                });
                toast.success(`Modelo "${modelo.nome}" aplicado aos clientes selecionados.`);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Não foi possível aplicar o modelo.");
              }
            }}
          >
            <SelectTrigger className="w-56" aria-label="Aplicar modelo de painel">
              <SelectValue placeholder="Aplicar modelo de painel" />
            </SelectTrigger>
            <SelectContent>
              {modelosPainel.length === 0 ? (
                <SelectItem value="__vazio" disabled>
                  Nenhum modelo salvo
                </SelectItem>
              ) : (
                modelosPainel.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
            Limpar seleção
          </Button>
        </div>
      )}

      {/* Carteira Ativa */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Carteira Ativa</CardTitle>
          <CardDescription>Visualização em tempo real das mensalidades, custos calculados e lucratividade por cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    aria-label="Selecionar todos os clientes visíveis"
                    checked={todosVisiveisSelecionados}
                    onCheckedChange={(v) =>
                      setSelecionados(v === true ? clientesOrdenados.map((c) => c.id) : [])
                    }
                  />
                </TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Data Setup</TableHead>
                <TableHead className="text-right">Tempo de vida</TableHead>
                <TableHead>Data Churn</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Acumulado</TableHead>
                <TableHead className="text-right">Lucro sob o sistema</TableHead>
                <TableHead className="text-right">Margem de lucro</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesOrdenados.map((c) => {
                const plano = planos.find((p) => p.id === c.planoId);
                const receita = receitaMensalCliente(c, planos, custos);
                const custoCalculado = custoMensalCliente(c, planos, custos);
                const lucro = receita - custoCalculado;
                const receitaSist = receitaSistemaCliente(c, planos, custos);
                const lucroSistema = receitaSist - custoCalculado;
                const acumulado = faturamentoAcumuladoCliente(c, planos, custos, movimentos);
                
                const start = new Date(c.dataInicio);
                const end = c.dataChurn ? new Date(c.dataChurn) : new Date();
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diasAtivos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const tempoVidaLabel = `${diasAtivos} ${diasAtivos === 1 ? "dia" : "dias"}`;
                const margem = receita > 0 ? (lucro / receita) * 100 : 0;
                
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${c.nome}`}
                        checked={selecionados.includes(c.id)}
                        onCheckedChange={(v) =>
                          setSelecionados((prev) =>
                            v === true ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span
                          onClick={() => setSelectedClienteId(c.id)}
                          className="cursor-pointer text-primary hover:underline"
                        >
                          {c.nome}
                        </span>
                        {!c.dataChurn && c.statusComercial === "trial" && (
                          <Badge className="w-fit text-[10px] bg-fin/15 text-fin border-none font-semibold">Trial</Badge>
                        )}
                        {c.dataVencimento && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Vencimento: Dia {formatDiaVencimento(c.dataVencimento)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{plano?.nome ?? "—"}</TableCell>
                    <TableCell>{c.dataInicio.split("-").reverse().join("/")}</TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">{tempoVidaLabel}</TableCell>
                    <TableCell className={c.dataChurn ? "text-destructive font-medium" : "text-muted-foreground"}>{c.dataChurn ? c.dataChurn.split("-").reverse().join("/") : "Ativo"}</TableCell>
                    <TableCell className="text-right text-primary font-semibold">
                      {formatBRL(receita)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">
                      {formatBRL(acumulado)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${lucroSistema >= 0 ? "text-fin" : "text-destructive"}`}>
                      {lucroSistema >= 0 ? "+" : ""}{formatBRL(lucroSistema)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={lucro >= 0 ? "bg-fin/20 text-fin font-semibold" : "bg-destructive/20 text-destructive font-semibold"}>
                          {lucro >= 0 ? "+" : ""}{formatBRL(lucro)}
                        </Badge>
                        <span className={`text-[10px] font-medium ${margem >= 0 ? "text-fin" : "text-destructive"}`}>{margem.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Registrar movimento"
                        aria-label={`Registrar movimento de ${c.nome}`}
                        onClick={() => openAcaoModal(c, "upgrade")}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAcaoModal(c, "upgrade")}>
                            <Settings2 className="mr-2 h-4 w-4" /> Mudar Plano / Recursos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAtribuirParceiro(c)}>
                            <Handshake className="mr-2 h-4 w-4" /> Atribuir parceiro
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openAcaoModal(c, "churn")} className="text-destructive focus:text-destructive">
                            <XCircle className="mr-2 h-4 w-4" /> Registrar Cancelamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmarRemocaoCliente(c)} className="text-muted-foreground focus:text-muted-foreground">
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clientes.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Nenhum cliente cadastrado ainda.</TableCell></TableRow>
              )}
              {clientes.length > 0 && clientesOrdenados.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Nenhum cliente corresponde à pesquisa.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {/* Modal de Detalhes do Cliente com Histórico e Linha de Tempo */}
      <Dialog open={!!selectedClienteId} onOpenChange={(isOpen) => !isOpen && setSelectedClienteId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {(() => {
            const cliente = clientes.find((c) => c.id === selectedClienteId);
            if (!cliente) return null;
            const plano = planos.find((p) => p.id === cliente.planoId);
            const parceiro = parceiros.find((p) => p.id === cliente.parceiroId);
            
            // Calculate active days
            const start = new Date(cliente.dataInicio);
            const end = cliente.dataChurn ? new Date(cliente.dataChurn) : new Date();
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Generate timeline events
            const timelineEvents: { data: string; titulo: string; desc: string; icon: any; color: string; movId?: string; canEdit?: boolean }[] = [];
            
            // 1. Setup Event
            timelineEvents.push({
              data: cliente.dataInicio,
              titulo: "Setup Inicial",
              desc: `Conta criada no plano "${plano?.nome ?? 'Rabbit Essencial'}". Canais: ${cliente.canais || 1}, Usuários: ${cliente.usuariosAtivos || 3}, Contatos: ${cliente.contatosAtivos || 500}. Setup pago: ${formatBRL(cliente.valorSetupPago || 0)}.`,
              icon: Plus,
              color: "text-primary border-primary",
            });
            
            // 2. Add custom movement events from store
            const clientMovs = movimentos
              .filter((m) => m.clienteId === cliente.id)
              .sort((a, b) => a.data.localeCompare(b.data));
              
            clientMovs.forEach((m) => {
              const matchedPlano = planos.find((p) => p.id === m.planoId);
              let descParts: string[] = [];
              const isDelta = ehTipoDelta(m.tipo);
              const fmtDelta = (v: number) => (v > 0 ? `+${v}` : `${v}`);
              const fmtNum = (label: string, v: number | undefined) => {
                if (v === undefined || v === null) return;
                if (isDelta) {
                  if (v === 0) return;
                  descParts.push(`${label} ${fmtDelta(v)}`);
                } else {
                  descParts.push(`${label}: ${v}`);
                }
              };
              if (m.planoId) descParts.push(`Plano alterado para "${matchedPlano?.nome ?? m.planoId}"`);
              fmtNum("Canais WhatsApp", m.canaisWhats);
              fmtNum("Canais Instagram", m.canaisInsta);
              fmtNum("Canais Messenger", m.canaisMessenger);
              fmtNum("Canais Z-API", m.canaisZapi);
              fmtNum("Canais", m.canais);
              fmtNum("Usuários", m.usuariosAtivos);
              fmtNum("Contatos/MAU", m.contatosAtivos);
              if (m.observacao) descParts.push(`Obs: ${m.observacao}`);
              
              const mTipoLabel = tiposMovimento.find(t => t.value === m.tipo)?.label || m.tipo;
              
              timelineEvents.push({
                data: m.data,
                titulo: mTipoLabel.charAt(0).toUpperCase() + mTipoLabel.slice(1),
                desc: descParts.join(" | ") || "Recursos da conta atualizados.",
                icon: m.tipo === "upgrade" ? TrendingUp : m.tipo === "downgrade" ? TrendingDown : Settings2,
                color: m.tipo === "upgrade" ? "text-fin border-fin" : m.tipo === "downgrade" ? "text-primary border-primary" : "text-muted-foreground border-muted-foreground",
                movId: m.id,
                canEdit: isDelta,
              });
            });
            
            // 3. Churn Event
            if (cliente.dataChurn) {
              timelineEvents.push({
                data: cliente.dataChurn,
                titulo: "Churn (Cancelamento)",
                desc: `A conta foi desativada e o serviço cancelado.`,
                icon: XCircle,
                color: "text-destructive border-destructive",
              });
            }
            
            // Mais recentes primeiro
            timelineEvents.sort((a, b) => b.data.localeCompare(a.data));

            return (
              <>
                <DialogHeader className="border-b border-border pb-4">
                  <DialogTitle className="text-2xl flex items-center justify-between">
                    <span>{cliente.nome}</span>
                    {cliente.dataChurn ? (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive font-semibold border-none">
                        Inativo / Churn
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-normal text-muted-foreground">Status</span>
                        <Select
                          value={cliente.statusComercial === "trial" ? "trial" : "ativo"}
                          onValueChange={async (v) => {
                            const novo = v === "trial" ? "trial" : "ativo";
                            if (novo === (cliente.statusComercial ?? "ativo")) return;
                            try {
                              await updateCliente(cliente.id, { statusComercial: novo });
                              toast.success(`Status alterado para ${novo === "trial" ? "Trial" : "Ativo"}.`);
                            } catch (err) {
                              toast.error(mensagemErroPersistencia(err, "Atualização do status"));
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-32 text-sm font-normal"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-6">
                  <AcessosCliente clienteId={cliente.id} />
                  <IntegracaoElora clienteId={cliente.id} />

                  {/* Resumo do Cliente */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo do Cliente</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                      <div>
                        <p className="text-xs text-muted-foreground">Nome do Cliente</p>
                        <p className="text-sm font-medium">{cliente.nome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Plano</p>
                        <p className="text-sm font-medium">{plano?.nome ?? "Rabbit Essencial"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parceiro / Agência</p>
                        <p className="text-sm font-medium">{parceiro?.nome ?? "Sem parceiro"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">MRR Total</p>
                        <p className="text-sm font-bold text-primary">{formatBRL(receitaMensalCliente(cliente, planos, custos))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">MRR Sistema</p>
                        <p className="text-sm font-bold text-muted-foreground">{formatBRL(receitaSistemaCliente(cliente, planos, custos))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">MRR Consultoria</p>
                        <p className="text-sm font-bold text-muted-foreground">{formatBRL(cliente.valorAcompanhamento || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Faturamento acumulado</p>
                        <p className="text-sm font-bold text-fin">{formatBRL(faturamentoAcumuladoCliente(cliente, planos, custos, movimentos))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Setup</p>
                        <p className="text-sm font-medium">{cliente.dataInicio.split("-").reverse().join("/")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Data Churn</p>
                        <p className="text-sm font-medium text-destructive">{cliente.dataChurn ? cliente.dataChurn.split("-").reverse().join("/") : "—"}</p>
                      </div>
                      <div className="col-span-2 md:col-span-3 border-t border-border/40 pt-2.5 mt-1 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Tempo de Permanência (Dias Ativos)</span>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 font-semibold">{diffDays} dias ativos</Badge>
                      </div>
                    </div>
                  </div>


                  {/* Pacote Atual */}
                  {(() => {
                    const planoAtual = planos.find((p) => p.id === cliente.planoId);

                    // Reconstruir estado atual:
                    // Os recursos exibidos são sempre o MAIOR entre o que o plano oferece
                    // e o valor absoluto salvo no cliente (que já contém a soma dos upgrades/downgrades).
                    let estadoAtual = {
                      planoId: cliente.planoId,
                      canaisWhats: Math.max(planoAtual?.canaisWhatsInclusos ?? 0, cliente.canaisWhats ?? cliente.canaisZapi ?? 0),
                      canaisInsta: Math.max(planoAtual?.canaisInstaInclusos ?? 0, cliente.canaisInsta ?? 0),
                      canaisMessenger: Math.max(planoAtual?.canaisMessengerInclusos ?? 0, cliente.canaisMessenger ?? 0),
                      usuariosAtivos: Math.max(planoAtual?.usuariosInclusos ?? 0, cliente.usuariosAtivos ?? 0),
                      contatosAtivos: Math.max(planoAtual?.contatosInclusos ?? 0, cliente.contatosAtivos ?? 0),
                      agentesIA: cliente.agentesIA || (planoAtual?.incluiIA ?? false),
                      asaas: cliente.asaas || (planoAtual?.incluiAsaas ?? false),
                      zapi: cliente.zapi || ((planoAtual?.incluiZapi ?? 0) > 0),
                      transcricaoIA: cliente.transcricaoIA || (planoAtual?.incluiTranscricao ?? false),
                    };

                    const mauExibido = estadoAtual.contatosAtivos;

                    return (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pacote Atual de Recursos</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-border/40 p-4 rounded-xl">
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Plano Atual</p>
                            <p className="text-sm font-semibold text-foreground">{planoAtual?.nome ?? plano?.nome ?? "—"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Canais WhatsApp (Z-API)</p>
                            <p className="text-sm font-semibold text-foreground">{estadoAtual.canaisWhats} {estadoAtual.canaisWhats === 1 ? "canal" : "canais"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Outros Canais</p>
                            <p className="text-sm font-semibold text-foreground">{estadoAtual.canaisInsta} Insta | {estadoAtual.canaisMessenger} Msg</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Usuários Ativos</p>
                            <p className="text-sm font-semibold text-foreground">{estadoAtual.usuariosAtivos} {estadoAtual.usuariosAtivos === 1 ? "usuário" : "usuários"}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Contatos / MAU</p>
                            <p className="text-sm font-semibold text-foreground">{mauExibido.toLocaleString("pt-BR")} contatos</p>
                          </div>
                          <div className="space-y-0.5 col-span-2 sm:col-span-1">
                            <p className="text-xs text-muted-foreground">Módulos Extras Ativos</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {estadoAtual.agentesIA && <Badge className="text-[10px] bg-fin/20 text-fin font-semibold border-none">Agentes IA</Badge>}
                              {estadoAtual.asaas && <Badge className="text-[10px] bg-fin/20 text-fin font-semibold border-none">ASAAS</Badge>}
                              {estadoAtual.zapi && <Badge className="text-[10px] bg-fin/20 text-fin font-semibold border-none">Z-API WhatsApp</Badge>}
                              {estadoAtual.transcricaoIA && <Badge className="text-[10px] bg-fin/20 text-fin font-semibold border-none">Transcrição IA</Badge>}
                              {!estadoAtual.agentesIA && !estadoAtual.asaas && !estadoAtual.zapi && !estadoAtual.transcricaoIA && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}


                  {/* Histórico / Linha do Tempo */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linha do Tempo de Movimentações</h3>
                    <div className="relative border-l-2 border-border ml-3.5 pl-6 space-y-6">
                      {timelineEvents.map((evt, idx) => {
                        const EvtIcon = evt.icon;
                        const mv = evt.movId ? movimentos.find((mm) => mm.id === evt.movId) : null;
                        return (
                          <div key={idx} className="relative">
                            <span className={`absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${evt.color}`}>
                              <EvtIcon className="h-3 w-3" />
                            </span>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">{evt.data.split("-").reverse().join("/")}</span>
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{evt.titulo}</span>
                                {evt.canEdit && mv && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => { setSelectedClienteId(null); openEditMovimento(mv); }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      onClick={() => confirmarRemocaoMovimento(mv)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground pr-4 leading-relaxed">{evt.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="border-t border-border pt-4">
                  <Button variant="outline" onClick={() => setSelectedClienteId(null)}>Fechar Detalhes</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


      {/* Modal para Registrar Upgrade/Ajuste/Recursos */}
      <Dialog open={!!acaoClienteId || !!acaoLoteIds} onOpenChange={(isOpen) => { if (!isOpen) { setAcaoClienteId(null); setAcaoLoteIds(null); setEditMovId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {acaoLoteIds
                ? `Trocar plano de ${acaoLoteIds.length} cliente(s)`
                : editMovId
                  ? "Editar Movimento"
                  : "Registrar Movimento"}
            </DialogTitle>
          </DialogHeader>
          {acaoLoteIds && (
            <p className="text-xs text-muted-foreground -mt-2">
              A mesma escolha é aplicada a todos os clientes selecionados. Cada cliente recebe o
              seu próprio registro de movimento e o seu próprio cálculo.
            </p>
          )}
          {!acaoLoteIds && ehTipoDelta(movForm.tipo) && (
            <p className="text-xs text-muted-foreground -mt-2">
              Informe apenas o que <strong>mudou</strong>. Use números positivos para adicionar
              e negativos para reduzir (ex.: <code>-1</code> em Canais WhatsApp). Campos em branco permanecem inalterados.
              Os novos valores passam a valer nos próximos fechamentos.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div>
              <Label className="mb-1 block">Tipo de Ação</Label>
              <Select value={movForm.tipo} onValueChange={(v: TipoMovimento) => setMovForm({ ...movForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposMovimento.filter((t) => t.value !== "parceiro").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Data da Ação</Label>
              <Input type="date" value={movForm.data} onChange={(e) => setMovForm({ ...movForm, data: e.target.value })} />
            </div>
            {!soAcompanhamento && (
            <div>
              <Label className="mb-1 block">Novo Plano</Label>
              <Select value={movForm.planoId} onValueChange={(v) => setMovForm({ ...movForm, planoId: v })}>
                <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
                <SelectContent>
                  {planos.filter((p) => p.ativo !== false || p.id === movForm.planoId).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            {soAcompanhamento && (
              <div>
                <Label className="mb-1 block" htmlFor="mov-acompanhamento">
                  Novo valor de acompanhamento (R$)
                </Label>
                <Input
                  id="mov-acompanhamento"
                  type="number"
                  min={0}
                  step="0.01"
                  value={movForm.valorAcompanhamento}
                  onChange={(e) => setMovForm({ ...movForm, valorAcompanhamento: e.target.value })}
                  placeholder="Ex: 250"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ajusta apenas o acompanhamento mensal recorrente deste cliente. O plano não muda.
                </p>
              </div>
            )}
            {perguntaAcompIndividual && (
              <div className="md:col-span-3">
                <Label className="mb-1 block">
                  Este cliente tem acompanhamento próprio ({formatBRL(clienteAcaoAtual?.valorAcompanhamento || 0)}). O que fazer?
                </Label>
                <Select
                  value={movForm.acompanhamentoRegra}
                  onValueChange={(v: "manter" | "padrao") => setMovForm({ ...movForm, acompanhamentoRegra: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manter">
                      Manter o valor atual ({formatBRL(clienteAcaoAtual?.valorAcompanhamento || 0)})
                    </SelectItem>
                    <SelectItem value="padrao">
                      Atualizar para o padrão do plano novo ({formatBRL(planoNovoMov?.valorAcompanhamento ?? 0)})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {perguntaAcompLote && (
              <div className="md:col-span-3">
                <Label className="mb-1 block">
                  {loteComAcompProprio.length} cliente(s) selecionado(s) têm acompanhamento próprio. O que fazer com esses valores?
                </Label>
                <Select
                  value={movForm.acompanhamentoRegra}
                  onValueChange={(v: "manter" | "padrao") => setMovForm({ ...movForm, acompanhamentoRegra: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manter">Manter o valor de cada cliente</SelectItem>
                    <SelectItem value="padrao">
                      Atualizar todos para o padrão do plano novo ({formatBRL(planoNovoMov?.valorAcompanhamento ?? 0)})
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Quem não tem valor próprio recebe o padrão do plano novo nos dois casos.
                </p>
              </div>
            )}
            {!soAcompanhamento && movForm.planoId && (
              <div>
                <Label className="mb-1 block">Quando a mudança de plano entra em vigor?</Label>
                <Select
                  value={movForm.vigenciaPlano}
                  onValueChange={(v: "este_ciclo" | "proximo_ciclo") => setMovForm({ ...movForm, vigenciaPlano: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="este_ciclo">Este ciclo (o que está em andamento agora)</SelectItem>
                    <SelectItem value="proximo_ciclo">Próximo ciclo (a partir do próximo fechamento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!soAcompanhamento && movForm.planoId && movForm.vigenciaPlano === "este_ciclo" && (
              <div className="md:col-span-2">
                <Label className="mb-1 block">Como cobrar neste ciclo?</Label>
                <Select
                  value={movForm.cobrancaTroca}
                  onValueChange={(v: "integral" | "proporcional") => setMovForm({ ...movForm, cobrancaTroca: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integral">Valor integral do plano novo — ciclo inteiro no preço novo</SelectItem>
                    <SelectItem value="proporcional">Proporcional — dias no plano antigo + dias no plano novo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {movForm.cobrancaTroca === "proporcional"
                    ? "Do início do ciclo até a data da troca no preço antigo; da data da troca até o fim do ciclo no preço novo. Os dois valores são somados."
                    : "O ciclo inteiro é calculado com o preço do plano novo, mesmo que parte do período tenha rodado no plano antigo."}
                </p>
              </div>
            )}
            
            {/* Atualização de Recursos */}
            {!acaoLoteIds && !soAcompanhamento && (<>
            <div>
              <Label className="mb-1 block">Canais WhatsApp</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +1 ou -1" : ""} value={movForm.canaisWhats} onChange={(e) => setMovForm({ ...movForm, canaisWhats: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Instagram</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +1 ou -1" : ""} value={movForm.canaisInsta} onChange={(e) => setMovForm({ ...movForm, canaisInsta: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Messenger</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +1 ou -1" : ""} value={movForm.canaisMessenger} onChange={(e) => setMovForm({ ...movForm, canaisMessenger: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Canais Z-API</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +1 ou -1" : ""} value={movForm.canaisZapi} onChange={(e) => setMovForm({ ...movForm, canaisZapi: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block">Usuários</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +1 ou -1" : ""} value={movForm.usuariosAtivos} onChange={(e) => setMovForm({ ...movForm, usuariosAtivos: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 block font-medium">Contatos / MAU</Label>
              <Input type="number" placeholder={ehTipoDelta(movForm.tipo) ? "Ex.: +500 ou -200" : ""} value={movForm.contatosAtivos} onChange={(e) => setMovForm({ ...movForm, contatosAtivos: e.target.value })} />
            </div>
            </>)}
            {acaoLoteIds && previaLote && (
              <div className="md:col-span-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-sm font-medium mb-2">Impacto na mensalidade por cliente</div>
                <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                  {previaLote.linhas.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                      <span className="truncate font-medium">{l.nome}</span>
                      <span className="whitespace-nowrap text-muted-foreground">
                        {formatBRL(l.atual)} → <span className="font-semibold text-foreground">{formatBRL(l.depois)}</span>
                        {Math.abs(l.delta) >= 0.005 && (
                          <span className={l.delta > 0 ? " text-fin" : " text-destructive"}>
                            {" "}({l.delta > 0 ? "+" : "−"} {formatBRL(Math.abs(l.delta))})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(previaLote.totalAtual)} → {formatBRL(previaLote.totalDepois)}</span>
                </div>
              </div>
            )}
            {!acaoLoteIds && previaMovimento && (
              <div className="md:col-span-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-sm font-medium mb-2">Impacto na mensalidade</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Valor atual</div>
                    <div className="font-semibold">{formatBRL(previaMovimento.atual)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Alteração</div>
                    <div className={`font-semibold ${previaMovimento.delta > 0 ? "text-fin" : previaMovimento.delta < 0 ? "text-destructive" : ""}`}>
                      {Math.abs(previaMovimento.delta) < 0.005
                        ? "Sem alteração de valor"
                        : `${previaMovimento.delta > 0 ? "+" : "−"} ${formatBRL(Math.abs(previaMovimento.delta))}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{previaMovimento.churn ? "Deixa de ser cobrado" : "Valor após"}</div>
                    <div className="font-semibold">{formatBRL(previaMovimento.depois)}</div>
                  </div>
                </div>
                {previaMovimento.mudancas.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    {previaMovimento.mudancas.join(" · ")}
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-3">
              <Label className="mb-1 block">Observação</Label>
              <Input value={movForm.observacao} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} placeholder="Detalhe opcional do movimento" />
            </div>
            
            {!acaoLoteIds && !soAcompanhamento && (
            <div className="grid grid-cols-2 md:col-span-3 gap-4 border-t border-border pt-4 mt-2">
              {!movPermiteModulos && (
                <p className="col-span-2 text-xs text-muted-foreground">
                  Este plano não permite módulos opcionais. Só continuam disponíveis os que já estavam ativos.
                </p>
              )}
              <div className="flex items-center space-x-2 h-10">
                <Switch disabled={!movPermiteModulos && !movForm.agentesIA} checked={movForm.agentesIA} onCheckedChange={(v) => setMovForm({ ...movForm, agentesIA: v })} />
                <Label>Agentes IA</Label>
              </div>
              <div className="flex items-center space-x-2 h-10">
                <Switch disabled={!movPermiteModulos && !movForm.asaas} checked={movForm.asaas} onCheckedChange={(v) => setMovForm({ ...movForm, asaas: v })} />
                <Label>ASAAS</Label>
              </div>
              <div className="flex items-center space-x-2 h-10">
                <Switch disabled={!movPermiteModulos && !movForm.transcricaoIA} checked={movForm.transcricaoIA} onCheckedChange={(v) => setMovForm({ ...movForm, transcricaoIA: v })} />
                <Label>Transcrição IA</Label>
              </div>
            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAcaoClienteId(null); setAcaoLoteIds(null); setEditMovId(null); }}>Cancelar</Button>
            <Button onClick={acaoLoteIds ? handleSaveLote : handleSaveMovimento} disabled={savingMovimento}>
              {savingMovimento
                ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>)
                : acaoLoteIds
                  ? `Aplicar a ${acaoLoteIds.length} cliente(s)`
                  : (editMovId ? "Salvar Alteração" : "Registrar Ação")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Atribuir parceiro (não altera valores cobrados) */}
      <Dialog open={!!parceiroClienteId} onOpenChange={(o) => !o && setParceiroClienteId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atribuir parceiro</DialogTitle>
          </DialogHeader>
          {(() => {
            const cliente = clientes.find((c) => c.id === parceiroClienteId);
            if (!cliente) return null;
            const atual = parceiros.find((p) => p.id === cliente.parceiroId);
            return (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Parceiro atual: <strong className="text-foreground">{atual?.nome ?? "Sem parceiro"}</strong>
                </p>
                <div>
                  <Label htmlFor="parceiro-novo" className="mb-1 block">Novo parceiro</Label>
                  <Select
                    value={parceiroForm.parceiroId}
                    onValueChange={(v) => setParceiroForm({ ...parceiroForm, parceiroId: v })}
                  >
                    <SelectTrigger id="parceiro-novo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Sem parceiro (N/A)</SelectItem>
                      {parceiros.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="parceiro-data" className="mb-1 block">Data</Label>
                  <Input
                    id="parceiro-data"
                    type="date"
                    value={parceiroForm.data}
                    onChange={(e) => setParceiroForm({ ...parceiroForm, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="parceiro-obs" className="mb-1 block">Observação (opcional)</Label>
                  <Input
                    id="parceiro-obs"
                    value={parceiroForm.observacao}
                    onChange={(e) => setParceiroForm({ ...parceiroForm, observacao: e.target.value })}
                    placeholder="Motivo da troca de parceiro"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A troca de parceiro não altera nenhum valor cobrado do cliente. Fechamentos já
                  gerados continuam exatamente como estão.
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setParceiroClienteId(null)}>Cancelar</Button>
            <Button onClick={handleSaveParceiro} disabled={savingParceiro}>
              {savingParceiro
                ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>)
                : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhamento de todos os clientes ativos (data de hoje) */}
      <Dialog open={detalhamentoHojeOpen} onOpenChange={setDetalhamentoHojeOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {(() => {
            const hojeIso = new Date().toISOString().slice(0, 10);
            const ativos = clientes
              .filter((c) => c.dataInicio <= hojeIso && (!c.dataChurn || c.dataChurn > hojeIso))
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

            const totalMrr = ativos.reduce((s, c) => s + receitaMensalCliente(c, planos, custos), 0);
            const totalSistema = ativos.reduce((s, c) => s + receitaSistemaCliente(c, planos, custos), 0);
            const totalConsultoria = ativos.reduce((s, c) => s + (c.valorAcompanhamento || 0), 0);

            const hojeLabel = new Date().toLocaleDateString("pt-BR");

            const exportarPdf = () => {
              const pdf = new jsPDF({ unit: "pt", format: "a4" });
              const pageW = pdf.internal.pageSize.getWidth();
              pdf.setFillColor(15, 15, 15);
              pdf.rect(0, 0, pageW, 70, "F");
              pdf.setTextColor(255, 255, 255);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(18);
              pdf.text("Detalhamento de clientes ativos", 40, 34);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(10);
              pdf.text(`Data: ${hojeLabel} · ${ativos.length} cliente(s) ativo(s)`, 40, 54);

              autoTable(pdf, {
                startY: 90,
                head: [["Cliente", "Plano", "Início", "MRR", "MRR Sistema", "Consultoria", "Acumulado"]],
                body: ativos.map((c) => {
                  const plano = planos.find((p) => p.id === c.planoId);
                  return [
                    c.nome,
                    plano?.nome ?? "—",
                    c.dataInicio.split("-").reverse().join("/"),
                    formatBRL(receitaMensalCliente(c, planos, custos)),
                    formatBRL(receitaSistemaCliente(c, planos, custos)),
                    formatBRL(c.valorAcompanhamento || 0),
                    formatBRL(faturamentoAcumuladoCliente(c, planos, custos, movimentos)),
                  ];
                }),
                foot: [[
                  { content: "TOTAIS", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } },
                  { content: formatBRL(totalMrr), styles: { fontStyle: "bold", halign: "right" } },
                  { content: formatBRL(totalSistema), styles: { fontStyle: "bold", halign: "right" } },
                  { content: formatBRL(totalConsultoria), styles: { fontStyle: "bold", halign: "right" } },
                  { content: "—", styles: { halign: "right" } },
                ]] as any,
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: [15, 15, 15], textColor: 255 },
                footStyles: { fillColor: [28, 63, 170], textColor: 255 },
                columnStyles: {
                  3: { halign: "right" },
                  4: { halign: "right" },
                  5: { halign: "right" },
                  6: { halign: "right" },
                },
                margin: { left: 30, right: 30 },
              });
              pdf.save(`detalhamento-clientes-${hojeIso}.pdf`);
            };

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" /> Detalhamento de clientes · {hojeLabel}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ativos.length} cliente(s) ativo(s) na data de hoje.
                  </p>
                </DialogHeader>

                <div className="flex items-center justify-between gap-3 flex-wrap py-3 border-b border-border/40">
                  <div className="flex gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">MRR Total</div>
                      <div className="font-semibold text-primary">{formatBRL(totalMrr)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">MRR Sistema</div>
                      <div className="font-semibold">{formatBRL(totalSistema)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Consultoria</div>
                      <div className="font-semibold">{formatBRL(totalConsultoria)}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={exportarPdf} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Exportar PDF
                  </Button>
                </div>

                <div className="space-y-3 py-3">
                  {ativos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum cliente ativo na data de hoje.
                    </p>
                  )}
                  {ativos.map((c) => {
                    const plano = planos.find((p) => p.id === c.planoId);
                    const parceiro = parceiros.find((p) => p.id === c.parceiroId);
                    const mrr = receitaMensalCliente(c, planos, custos);
                    const mrrSist = receitaSistemaCliente(c, planos, custos);
                    const consultoria = c.valorAcompanhamento || 0;
                    const acumulado = faturamentoAcumuladoCliente(c, planos, custos, movimentos);
                    const inicio = new Date(c.dataInicio);
                    const diasAtivos = Math.ceil(Math.abs(new Date().getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <details key={c.id} className="rounded-lg border border-border/50 bg-background/40 group">
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30 rounded-t-lg select-none">
                          <span className="font-medium text-sm">{c.nome}</span>
                          <Badge variant="outline" className="text-[10px]">{plano?.nome ?? "—"}</Badge>
                          {parceiro && <Badge variant="outline" className="text-[10px]">{parceiro.nome}</Badge>}
                          <span className="ml-auto text-sm font-semibold text-primary">{formatBRL(mrr)}/mês</span>
                        </summary>
                        <div className="border-t border-border/40 px-3 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">Início</div>
                            <div className="font-medium">{c.dataInicio.split("-").reverse().join("/")} ({diasAtivos}d)</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">MRR Sistema</div>
                            <div className="font-medium">{formatBRL(mrrSist)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Consultoria</div>
                            <div className="font-medium">{formatBRL(consultoria)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Acumulado</div>
                            <div className="font-medium text-fin">{formatBRL(acumulado)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Canais Whats/Insta/Msg</div>
                            <div className="font-medium">{c.canaisWhats ?? 0} / {c.canaisInsta ?? 0} / {c.canaisMessenger ?? 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Usuários</div>
                            <div className="font-medium">{c.usuariosAtivos ?? 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Contatos / MAU</div>
                            <div className="font-medium">{(c.contatosAtivos ?? 0).toLocaleString("pt-BR")}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Módulos extras</div>
                            <div className="font-medium">
                              {[c.agentesIA && "IA", c.asaas && "ASAAS", (c.canaisZapi ?? 0) > 0 && "Z-API", c.transcricaoIA && "Transcrição"].filter(Boolean).join(", ") || "—"}
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

      <ChurnDadosDialog
        clienteId={churnDados?.id ?? null}
        nomeCliente={churnDados?.nome ?? ""}
        aberto={churnDados !== null}
        aoFechar={() => setChurnDados(null)}
      />
    </div>
  );
}