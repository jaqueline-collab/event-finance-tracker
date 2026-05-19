import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useStore, formatBRL, receitaMensalCliente, custoMensalCliente, clienteAtivoEm,
} from "@/lib/store";

export const Route = createFileRoute("/resumo")({
  head: () => ({ meta: [{ title: "Resumo Mensal · Elora" }] }),
  component: ResumoPage,
});

function ResumoPage() {
  const { clientes, planos, custos, movimentos } = useStore();

  const linhas = useMemo(() => {
    if (clientes.length === 0) return [];
    const datas = clientes.map((c) => new Date(c.dataInicio));
    const minD = new Date(Math.min(...datas.map((d) => d.getTime())));
    const now = new Date();
    const out: { mes: string; ativos: number; novos: number; churns: number; receita: number; custo: number; margem: number; setup: number }[] = [];
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cursor <= now) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const ativos = clientes.filter((c) => clienteAtivoEm(c, y, m));
      const novos = clientes.filter((c) => {
        const d = new Date(c.dataInicio);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const churns = clientes.filter((c) => {
        if (!c.dataChurn) return false;
        const d = new Date(c.dataChurn);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
      const receita = ativos.reduce((s, c) => s + receitaMensalCliente(c, planos, custos), 0);
      const custo = ativos.reduce((s, c) => s + custoMensalCliente(c, planos, custos), 0);
      // setup do mês: planos dos clientes que iniciaram nesse mês
      const setup = clientes
        .filter((c) => {
          const d = new Date(c.dataInicio);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, c) => s + (planos.find((p) => p.id === c.planoId)?.valorSetup ?? 0), 0);
      // serviços avulsos
      const servicos = movimentos
        .filter((mv) => {
          if (mv.tipo !== "servico" || !mv.valorServico) return false;
          const d = new Date(mv.data);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, mv) => s + (mv.valorServico ?? 0), 0);

      out.push({
        mes: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        ativos: ativos.length,
        novos,
        churns,
        receita: receita + setup + servicos,
        custo,
        margem: receita + setup + servicos - custo,
        setup: setup + servicos,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out.reverse();
  }, [clientes, planos, custos, movimentos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Resumo Mensal</h1>
        <p className="text-muted-foreground text-sm">Receita, custo e margem por mês</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Inclui mensalidade recorrente, setups e serviços avulsos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Ativos</TableHead>
                <TableHead className="text-right">Novos</TableHead>
                <TableHead className="text-right">Churns</TableHead>
                <TableHead className="text-right">Setup/Serviços</TableHead>
                <TableHead className="text-right">Receita total</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.mes}>
                  <TableCell className="font-medium capitalize">{l.mes}</TableCell>
                  <TableCell className="text-right">{l.ativos}</TableCell>
                  <TableCell className="text-right text-accent">+{l.novos}</TableCell>
                  <TableCell className="text-right text-destructive">-{l.churns}</TableCell>
                  <TableCell className="text-right">{formatBRL(l.setup)}</TableCell>
                  <TableCell className="text-right">{formatBRL(l.receita)}</TableCell>
                  <TableCell className="text-right">{formatBRL(l.custo)}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">{formatBRL(l.margem)}</TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cadastre clientes para ver o resumo.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}