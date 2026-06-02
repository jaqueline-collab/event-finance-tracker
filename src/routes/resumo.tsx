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
      return { cliente: c, plano, parceiro, receita, acomp, sistema, movs: movsCliente, venc };
    });

    const totalSistema = detalhesPorCliente.reduce((s, d) => s + d.sistema, 0);
    const totalAcompanhamento = detalhesPorCliente.reduce((s, d) => s + d.acomp, 0);
    const totalReceita = totalSistema + totalAcompanhamento;
    const totalSetups = setupsNoMes.reduce((s, c) => s + (c.valorSetupPago || 0), 0);

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
    </div>
  );
}