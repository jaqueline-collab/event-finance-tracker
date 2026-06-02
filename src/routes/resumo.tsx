import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useStore, formatBRL, receitaMensalCliente, receitaMensalClienteEm, clienteFaturaEm,
  calcularCustoLiquidoHelena,
  formatDiaVencimento,
  obterVencimentoDaCompetencia,
  clienteSnapshotAt,
} from "@/lib/store";

export const Route = createFileRoute("/resumo")({
  head: () => ({ meta: [{ title: "Resumo Mensal · Elora" }] }),
  component: ResumoPage,
});

function ResumoPage() {
  const { clientes, planos, custos, movimentos, parceiros } = useStore();
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [filtroParceiro, setFiltroParceiro] = useState("todos");
  const [expandedMes, setExpandedMes] = useState<string | null>(null);
  const today = new Date();
  const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [fechamentoMes, setFechamentoMes] = useState<string>(currentKey);
  const [fechamentoOpen, setFechamentoOpen] = useState(false);

  // Clientes filtrados por plano e parceiro
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const matchPlano = filtroPlano === "todos" || c.planoId === filtroPlano;
      const matchParceiro = filtroParceiro === "todos" || c.parceiroId === filtroParceiro;
      return matchPlano && matchParceiro;
    });
  }, [clientes, filtroPlano, filtroParceiro]);

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
      custoHelena: number;
      lucro: number;
      setup: number;
    }[] = [];
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cursor <= now) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const ativos = clientesFiltrados.filter((c) => clienteFaturaEm(c, y, m));
      const novos = clientesFiltrados.filter((c) => {
        const d = new Date(c.dataInicio);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const churns = clientesFiltrados.filter((c) => {
        if (!c.dataChurn) return false;
        const d = new Date(c.dataChurn);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const receita = ativos.reduce((s, c) => s + receitaMensalClienteEm(c, planos, custos, movimentos, y, m), 0);
      // Custo Helena também respeita o snapshot histórico de cada cliente
      const ativosSnapshot = ativos.map((c) => {
        const venc = obterVencimentoDaCompetencia(c, y, m);
        return venc ? clienteSnapshotAt(c, movimentos, venc) : c;
      });
      const custoHelena = calcularCustoLiquidoHelena(ativosSnapshot);
      const setup = clientesFiltrados
        .filter((c) => {
          const vencimento = obterVencimentoDaCompetencia(c, y, m);
          if (!vencimento) return false;
          return vencimento === c.dataVencimento;
        })
        .reduce((s, c) => s + (c.valorSetupPago || 0), 0);
      const servicos = movimentos
        .filter((mv) => { if (mv.tipo !== "servico" || !mv.valorServico) return false; const d = new Date(mv.data); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, mv) => s + (mv.valorServico ?? 0), 0);

      const receitaTotal = receita + setup + servicos;
      out.push({
        mesKey: `${y}-${String(m + 1).padStart(2, "0")}`,
        mesLabel: cursor.toLocaleDateString("pt-BR", { month: "long", year: "2-digit" }),
        ativos,
        novos,
        churns,
        receita: receitaTotal,
        custoHelena,
        lucro: receitaTotal - custoHelena,
        setup: setup + servicos,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out.reverse();
  }, [clientesFiltrados, planos, custos, movimentos]);

  const exportarPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const generatedAt = new Date().toLocaleString("pt-BR");
    const planoSelecionado = filtroPlano === "todos" ? "Todos os planos" : planos.find((p) => p.id === filtroPlano)?.nome ?? "Plano";
    const parceiroSelecionado = filtroParceiro === "todos" ? "Todos os parceiros" : parceiros.find((p) => p.id === filtroParceiro)?.nome ?? "Parceiro";

    pdf.setFontSize(18);
    pdf.text("Resumo Mensal", 40, 42);
    pdf.setFontSize(10);
    pdf.text(`Plano: ${planoSelecionado}  |  Parceiro: ${parceiroSelecionado}`, 40, 62);
    pdf.text(`Gerado em: ${generatedAt}`, 40, 78);

    autoTable(pdf, {
      startY: 96,
      head: [["Mês", "Faturados", "Novos", "Churns", "Receita Total", "Custo Helena", "Lucro Líquido"]],
      body: linhas.map((l) => [
        l.mesLabel,
        String(l.ativos.length),
        String(l.novos),
        String(l.churns),
        formatBRL(l.receita),
        formatBRL(l.custoHelena),
        formatBRL(l.lucro),
      ]),
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
        head: [["Cliente", "Plano", "Parceiro", "Próx. vencimento", "Status", "Receita/mês"]],
        body: linha.ativos.map((c) => {
          const plano = planos.find((p) => p.id === c.planoId);
          const parceiro = parceiros.find((p) => p.id === c.parceiroId);
          return [
            c.nome,
            plano?.nome ?? "—",
            parceiro?.nome ?? "—",
            formatDiaVencimento(obterVencimentoDaCompetencia(c, Number(linha.mesKey.slice(0, 4)), Number(linha.mesKey.slice(5, 7)) - 1)),
            c.dataChurn ? "Churn" : "Ativo",
          formatBRL(receitaMensalClienteEm(c, planos, custos, movimentos, Number(linha.mesKey.slice(0,4)), Number(linha.mesKey.slice(5,7)) - 1)),
          ];
        }),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [28, 63, 170] },
        margin: { left: 40, right: 40 },
      });
    });

    pdf.save(`resumo-mensal-${filtroPlano}-${filtroParceiro}.pdf`);
  };

  // ====== Dados para o Fechamento Mensal ======
  const fechamentoData = useMemo(() => {
    if (!fechamentoMes) return null;
    const [yStr, mStr] = fechamentoMes.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const labelMes = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const ativos = clientesFiltrados.filter((c) => clienteFaturaEm(c, y, m));

    const setupsNoMes = clientesFiltrados.filter((c) => {
      const d = new Date(c.dataInicio);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const churnsNoMes = clientesFiltrados.filter((c) => {
      if (!c.dataChurn) return false;
      const d = new Date(c.dataChurn);
      return d.getFullYear() === y && d.getMonth() === m;
    });

    // Movimentos de upgrade/downgrade do mês para os clientes filtrados
    const clienteIds = new Set(clientesFiltrados.map((c) => c.id));
    const movsMes = movimentos.filter((mv) => {
      if (!clienteIds.has(mv.clienteId)) return false;
      if (mv.tipo !== "upgrade" && mv.tipo !== "downgrade") return false;
      const d = new Date(mv.data);
      return d.getFullYear() === y && d.getMonth() === m;
    });

    // Detalhamento por cliente
    const detalhesPorCliente = ativos.map((c) => {
      const plano = planos.find((p) => p.id === c.planoId);
      const parceiro = parceiros.find((p) => p.id === c.parceiroId);
      const venc = obterVencimentoDaCompetencia(c, y, m);
      const snap = venc ? clienteSnapshotAt(c, movimentos, venc) : c;
      const receita = receitaMensalClienteEm(c, planos, custos, movimentos, y, m);
      const acomp = snap.valorAcompanhamento || 0;
      const sistema = Math.max(0, receita - acomp);
      const movsCliente = movsMes.filter((mv) => mv.clienteId === c.id);
      // LTV em dias: do início até churn (se houver) ou fim da competência
      const inicio = new Date(c.dataInicio);
      const fimCompetencia = new Date(y, m + 1, 0);
      const fim = c.dataChurn ? new Date(c.dataChurn) : fimCompetencia;
      const ltvDias = Math.max(0, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
      return { cliente: c, plano, parceiro, receita, acomp, sistema, movs: movsCliente, venc, ltvDias };
    });

    const totalSistema = detalhesPorCliente.reduce((s, d) => s + d.sistema, 0);
    const totalAcompanhamento = detalhesPorCliente.reduce((s, d) => s + d.acomp, 0);
    const totalReceita = totalSistema + totalAcompanhamento;
    const totalSetups = setupsNoMes.reduce((s, c) => s + (c.valorSetupPago || 0), 0);

    // Métricas adicionais
    const ltvMedioDias = detalhesPorCliente.length > 0
      ? detalhesPorCliente.reduce((s, d) => s + d.ltvDias, 0) / detalhesPorCliente.length
      : 0;
    const ticketMedio = detalhesPorCliente.length > 0
      ? totalReceita / detalhesPorCliente.length
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
      ativos,
      setupsNoMes,
      churnsNoMes,
      totalSetups,
      detalhesPorCliente,
      totalSistema,
      totalAcompanhamento,
      totalReceita,
      movsMes,
      ltvMedioDias,
      ticketMedio,
      calcDeltaReceita,
    };
  }, [fechamentoMes, clientesFiltrados, planos, custos, movimentos, parceiros]);

  const opcoesFechamento = useMemo(() => {
    // Lista os últimos 24 meses + 1 à frente
    const out: { key: string; label: string }[] = [];
    const base = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    for (let i = 0; i < 26; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ key, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
    }
    return out;
  }, [today]);

  const fmtDelta = (label: string, v: number | undefined | null) => {
    if (v === undefined || v === null || v === 0) return null;
    const sign = v > 0 ? "+" : "";
    return `${label} ${sign}${v}`;
  };

  const descreverMov = (mv: typeof movimentos[number]): string => {
    const partes: string[] = [];
    const a = fmtDelta("WhatsApp", mv.canaisWhats); if (a) partes.push(a);
    const b = fmtDelta("Instagram", mv.canaisInsta); if (b) partes.push(b);
    const c = fmtDelta("Messenger", mv.canaisMessenger); if (c) partes.push(c);
    const z = fmtDelta("Z-API", mv.canaisZapi); if (z) partes.push(z);
    const u = fmtDelta("Usuários", mv.usuariosAtivos); if (u) partes.push(u);
    const ct = fmtDelta("Contatos", mv.contatosAtivos); if (ct) partes.push(ct);
    if (mv.planoId) {
      const np = planos.find((p) => p.id === mv.planoId);
      partes.push(`Plano → ${np?.nome ?? mv.planoId}`);
    }
    if (mv.observacao) partes.push(`(${mv.observacao})`);
    return partes.join(" · ") || "Atualização de configuração";
  };

  const exportarFechamentoPdf = () => {
    if (!fechamentoData) return;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const planoSel = filtroPlano === "todos" ? "Todos os planos" : planos.find((p) => p.id === filtroPlano)?.nome ?? "Plano";
    const parceiroSel = filtroParceiro === "todos" ? "Todos os parceiros" : parceiros.find((p) => p.id === filtroParceiro)?.nome ?? "Parceiro";

    pdf.setFillColor(28, 63, 170);
    pdf.rect(0, 0, 595, 70, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.text("Elora", 40, 32);
    pdf.setFontSize(11);
    pdf.text(`Fechamento Mensal · ${fechamentoData.labelMes}`, 40, 54);

    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(9);
    pdf.text(`Plano: ${planoSel}  |  Parceiro: ${parceiroSel}  |  Gerado em: ${new Date().toLocaleString("pt-BR")}`, 40, 90);

    autoTable(pdf, {
      startY: 110,
      head: [["Clientes faturados", "Setups no mês", "Churns", "Receita Sistema", "Acompanhamento", "Receita Total"]],
      body: [[
        String(fechamentoData.ativos.length),
        `${fechamentoData.setupsNoMes.length} (${formatBRL(fechamentoData.totalSetups)})`,
        String(fechamentoData.churnsNoMes.length),
        formatBRL(fechamentoData.totalSistema),
        formatBRL(fechamentoData.totalAcompanhamento),
        formatBRL(fechamentoData.totalReceita),
      ]],
      styles: { fontSize: 9, cellPadding: 6, halign: "center" },
      headStyles: { fillColor: [28, 63, 170] },
    });

    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 16,
      head: [["Cliente", "Plano", "Parceiro", "Sistema", "Acompanh.", "Total"]],
      body: fechamentoData.detalhesPorCliente.map((d) => [
        d.cliente.nome,
        d.plano?.nome ?? "—",
        d.parceiro?.nome ?? "—",
        formatBRL(d.sistema),
        formatBRL(d.acomp),
        formatBRL(d.receita),
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [60, 60, 60] },
    });

    if (fechamentoData.movsMes.length > 0) {
      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 16,
        head: [["Data", "Cliente", "Tipo", "Detalhes"]],
        body: fechamentoData.movsMes
          .slice()
          .sort((a, b) => a.data.localeCompare(b.data))
          .map((mv) => {
            const c = clientes.find((x) => x.id === mv.clienteId);
            return [
              mv.data.split("-").reverse().join("/"),
              c?.nome ?? "—",
              mv.tipo === "upgrade" ? "Upgrade" : "Downgrade",
              descreverMov(mv),
            ];
          }),
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [120, 80, 0] },
      });
    }

    pdf.save(`fechamento-${fechamentoMes}-${filtroPlano}-${filtroParceiro}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Resumo Mensal</h1>
          <p className="text-muted-foreground text-sm">Receita, custo Helena e lucro por mês, considerando o próximo vencimento após o setup</p>
        </div>
        <Button onClick={exportarPdf} disabled={linhas.length === 0} className="gap-2">
          <Download className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border/60 bg-muted/10">
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground">Filtrar por Plano</Label>
          <Select value={filtroPlano} onValueChange={setFiltroPlano}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os planos</SelectItem>
              {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground">Filtrar por Parceiro</Label>
          <Select value={filtroParceiro} onValueChange={setFiltroParceiro}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os parceiros</SelectItem>
              {parceiros.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filtroPlano !== "todos" || filtroParceiro !== "todos") && (
          <div className="flex items-end">
            <button
              onClick={() => { setFiltroPlano("todos"); setFiltroParceiro("todos"); }}
              className="text-xs text-muted-foreground hover:text-foreground underline h-8"
            >
              Limpar filtros
            </button>
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Gerar Fechamento</Label>
          <div className="flex gap-2">
            <Select value={fechamentoMes} onValueChange={setFechamentoMes}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {opcoesFechamento.map((o) => (
                  <SelectItem key={o.key} value={o.key} className="capitalize">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setFechamentoOpen(true)}>
              <FileText className="h-3.5 w-3.5" /> Gerar
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Inclui mensalidades recorrentes, setups e serviços avulsos. Custo baseado na lógica Helena.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead>Mês de Competência</TableHead>
                <TableHead className="text-right">Faturados</TableHead>
                <TableHead className="text-right">Novos</TableHead>
                <TableHead className="text-right">Churns</TableHead>
                <TableHead className="text-right">Receita Total</TableHead>
                <TableHead className="text-right">Custo Helena</TableHead>
                <TableHead className="text-right">Lucro Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const isExpanded = expandedMes === l.mesKey;
                return (
                  <>
                    <TableRow
                      key={l.mesKey}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedMes(isExpanded ? null : l.mesKey)}
                    >
                      <TableCell className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium capitalize">{l.mesLabel}</TableCell>
                      <TableCell className="text-right">{l.ativos.length}</TableCell>
                      <TableCell className="text-right text-accent">+{l.novos}</TableCell>
                      <TableCell className="text-right text-destructive">{l.churns > 0 ? `-${l.churns}` : "—"}</TableCell>
                      <TableCell className="text-right">{formatBRL(l.receita)}</TableCell>
                      <TableCell className="text-right text-yellow-400">{formatBRL(l.custoHelena)}</TableCell>
                      <TableCell className={`text-right font-semibold ${l.lucro >= 0 ? "text-accent" : "text-destructive"}`}>
                        {formatBRL(l.lucro)}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${l.mesKey}-detail`} className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={8} className="py-0">
                          <div className="py-3 px-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Clientes faturados em {l.mesLabel}
                            </p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-muted-foreground border-b border-border/40">
                                  <th className="text-left pb-1 font-medium">Cliente</th>
                                  <th className="text-left pb-1 font-medium">Plano</th>
                                  <th className="text-left pb-1 font-medium">Parceiro</th>
                                  <th className="text-right pb-1 font-medium">Vencimento</th>
                                  <th className="text-right pb-1 font-medium">Status</th>
                                  <th className="text-right pb-1 font-medium">Receita/mês</th>
                                </tr>
                              </thead>
                              <tbody>
                                {l.ativos.map((c) => {
                                  const plano = planos.find((p) => p.id === c.planoId);
                                  const parceiro = parceiros.find((p) => p.id === c.parceiroId);
                                  const rec = receitaMensalClienteEm(c, planos, custos, movimentos, Number(l.mesKey.slice(0,4)), Number(l.mesKey.slice(5,7)) - 1);
                                  return (
                                    <tr key={c.id} className="border-b border-border/20 last:border-0">
                                      <td className="py-1.5 font-medium">{c.nome}</td>
                                      <td className="py-1.5 text-muted-foreground">{plano?.nome ?? "—"}</td>
                                      <td className="py-1.5 text-muted-foreground">{parceiro?.nome ?? "—"}</td>
                                      <td className="py-1.5 text-right text-muted-foreground text-xs">
                                        {(() => {
                                          const vencimento = obterVencimentoDaCompetencia(c, Number(l.mesKey.slice(0, 4)), Number(l.mesKey.slice(5, 7)) - 1);
                                          return vencimento ? `dia ${formatDiaVencimento(vencimento)}` : "—";
                                        })()}
                                      </td>
                                      <td className="py-1.5 text-right">
                                        {c.dataChurn
                                          ? <Badge variant="destructive" className="text-xs">Churn</Badge>
                                          : <Badge className="bg-accent/20 text-accent text-xs">Ativo</Badge>}
                                      </td>
                                      <td className="py-1.5 text-right text-primary font-medium">{formatBRL(rec)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Cadastre clientes para ver o resumo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Prévia do Fechamento */}
      <Dialog open={fechamentoOpen} onOpenChange={setFechamentoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {fechamentoData && (
            <>
              {/* Header com cara de capa de PDF */}
              <div className="bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground p-8 rounded-t-lg">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.3em] opacity-80">Elora · Fechamento Mensal</div>
                      <DialogTitle className="text-3xl font-bold mt-1 capitalize">{fechamentoData.labelMes}</DialogTitle>
                      <p className="text-xs opacity-80 mt-2">
                        {filtroPlano === "todos" ? "Todos os planos" : planos.find((p) => p.id === filtroPlano)?.nome}
                        {" · "}
                        {filtroParceiro === "todos" ? "Todos os parceiros" : parceiros.find((p) => p.id === filtroParceiro)?.nome}
                      </p>
                    </div>
                    <Button onClick={exportarFechamentoPdf} variant="secondary" className="gap-2 shrink-0">
                      <Download className="h-4 w-4" /> Exportar PDF
                    </Button>
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/60 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Clientes faturados</div>
                    <div className="text-2xl font-semibold mt-1">{fechamentoData.ativos.length}</div>
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
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita total</div>
                    <div className="text-2xl font-semibold mt-1 text-primary">{formatBRL(fechamentoData.totalReceita)}</div>
                  </div>
                </div>

                {/* Métricas secundárias: LTV médio, ticket médio, sistema vs acompanhamento (discretos) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">LTV médio</div>
                    <div className="text-sm font-medium mt-0.5">{Math.round(fechamentoData.ltvMedioDias)} dias</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket médio / cliente</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoData.ticketMedio)}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor do Sistema</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoData.totalSistema)}</div>
                  </div>
                  <div className="rounded-md border border-border/40 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor do Acompanhamento</div>
                    <div className="text-sm font-medium mt-0.5">{formatBRL(fechamentoData.totalAcompanhamento)}</div>
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
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={area} fill="url(#areaFill)" />
                        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" />
                            <text x={p.x} y={h - 6} textAnchor="middle" className="fill-muted-foreground" fontSize="9" style={{ textTransform: "capitalize" }}>{p.label}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                {/* Detalhamento por cliente */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Detalhamento por cliente</h3>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="text-xs text-muted-foreground">
                          <th className="text-left p-2 font-medium">Cliente</th>
                          <th className="text-left p-2 font-medium">Plano</th>
                          <th className="text-right p-2 font-medium">LTV</th>
                          <th className="text-right p-2 font-medium">Sistema</th>
                          <th className="text-right p-2 font-medium">Acomp.</th>
                          <th className="text-right p-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fechamentoData.detalhesPorCliente.map((d) => (
                          <tr key={d.cliente.id} className="border-t border-border/30">
                            <td className="p-2 font-medium">{d.cliente.nome}</td>
                            <td className="p-2 text-muted-foreground">{d.plano?.nome ?? "—"}</td>
                            <td className="p-2 text-right text-muted-foreground">{d.ltvDias} d</td>
                            <td className="p-2 text-right">{formatBRL(d.sistema)}</td>
                            <td className="p-2 text-right">{formatBRL(d.acomp)}</td>
                            <td className="p-2 text-right font-semibold text-primary">{formatBRL(d.receita)}</td>
                          </tr>
                        ))}
                        {fechamentoData.detalhesPorCliente.length === 0 && (
                          <tr><td colSpan={6} className="text-center text-muted-foreground py-6 text-sm">Sem clientes faturados nesta competência.</td></tr>
                        )}
                      </tbody>
                    </table>
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
    </div>
  );
}