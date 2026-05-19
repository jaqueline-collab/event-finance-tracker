import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useStore,
  receitaMensalCliente,
  custoMensalCliente,
  clienteAtivoEm,
  formatBRL,
} from "@/lib/store";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Users, Wallet, DollarSign } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Elora" }] }),
  component: Index,
});

function Index() {
  const { clientes, planos, custos, seedDemo } = useStore();

  const ativos = clientes.filter((c) => !c.dataChurn);
  const mrr = ativos.reduce((s, c) => s + receitaMensalCliente(c, planos, custos), 0);
  const custoTotal = ativos.reduce((s, c) => s + custoMensalCliente(c, planos, custos), 0);
  const margem = mrr - custoTotal;
  const margemPct = mrr > 0 ? (margem / mrr) * 100 : 0;

  const serie = useMemo(() => {
    const now = new Date();
    const out: { mes: string; receita: number; custo: number; margem: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const ativosMes = clientes.filter((c) => clienteAtivoEm(c, y, m));
      const r = ativosMes.reduce((s, c) => s + receitaMensalCliente(c, planos, custos), 0);
      const cu = ativosMes.reduce((s, c) => s + custoMensalCliente(c, planos, custos), 0);
      out.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        receita: Math.round(r),
        custo: Math.round(cu),
        margem: Math.round(r - cu),
      });
    }
    return out;
  }, [clientes, planos, custos]);

  const kpis = [
    { label: "Clientes ativos", value: String(ativos.length), icon: Users, hint: `${clientes.length} no total` },
    { label: "MRR", value: formatBRL(mrr), icon: DollarSign, hint: "Receita recorrente mensal" },
    { label: "Custo mensal", value: formatBRL(custoTotal), icon: Wallet, hint: "Custos de ferramentas + extras" },
    { label: "Margem", value: formatBRL(margem), icon: TrendingUp, hint: `${margemPct.toFixed(1)}% sobre MRR` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral da operação Elora</p>
        </div>
        {clientes.length === 0 && (
          <Button variant="outline" onClick={seedDemo}>
            Carregar cliente de exemplo
          </Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Evolução nos últimos 12 meses</CardTitle>
          <CardDescription>Receita, custo e margem por mês</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="g-receita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-margem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--foreground)",
                }}
                formatter={(v: number) => formatBRL(v)}
              />
              <Area type="monotone" dataKey="receita" stroke="var(--primary)" fill="url(#g-receita)" name="Receita" />
              <Area type="monotone" dataKey="margem" stroke="var(--accent)" fill="url(#g-margem)" name="Margem" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
