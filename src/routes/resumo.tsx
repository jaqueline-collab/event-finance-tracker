import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  useStore, formatBRL, receitaMensalCliente, clienteAtivoEm,
  calcularCustoLiquidoHelena,
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
      const ativos = clientesFiltrados.filter((c) => clienteAtivoEm(c, y, m));
      const novos = clientesFiltrados.filter((c) => {
        const d = new Date(c.dataInicio);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const churns = clientesFiltrados.filter((c) => {
        if (!c.dataChurn) return false;
        const d = new Date(c.dataChurn);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const receita = ativos.reduce((s, c) => s + receitaMensalCliente(c, planos, custos), 0);
      const custoHelena = calcularCustoLiquidoHelena(ativos);
      const setup = clientesFiltrados
        .filter((c) => { const d = new Date(c.dataInicio); return d.getFullYear() === y && d.getMonth() === m; })
        .reduce((s, c) => s + (planos.find((p) => p.id === c.planoId)?.valorSetup ?? 0), 0);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Resumo Mensal</h1>
        <p className="text-muted-foreground text-sm">Receita, custo Helena e lucro por mês · clique no mês para ver detalhes</p>
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
                <TableHead className="text-right">Ativos</TableHead>
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
                              Clientes ativos em {l.mesLabel}
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
                                  const rec = receitaMensalCliente(c, planos, custos);
                                  return (
                                    <tr key={c.id} className="border-b border-border/20 last:border-0">
                                      <td className="py-1.5 font-medium">{c.nome}</td>
                                      <td className="py-1.5 text-muted-foreground">{plano?.nome ?? "—"}</td>
                                      <td className="py-1.5 text-muted-foreground">{parceiro?.nome ?? "—"}</td>
                                      <td className="py-1.5 text-right text-muted-foreground text-xs">
                                        {c.dataVencimento ? `dia ${c.dataVencimento}` : "—"}
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