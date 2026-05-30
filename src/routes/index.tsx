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
  clienteAtivoEm,
  formatBRL,
  calcularCustoLiquidoHelena,
  calcularCustoBrutoHelena,
  receitaMensalTotal,
} from "@/lib/store";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, Users, Wallet, DollarSign } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Elora" }] }),
  component: Index,
});

function Index() {
  const { clientes, planos, custos, seedDemo } = useStore();

  const ativos = clientes.filter((c) => !c.dataChurn);
  const mrr = receitaMensalTotal(ativos, planos, custos);
  
  const custoHelenaBruto = calcularCustoBrutoHelena(ativos);
  const custoHelenaLiquido = calcularCustoLiquidoHelena(ativos);
  
  const lucroLiquido = mrr - custoHelenaLiquido;
  const lucroSistema = mrr - custoHelenaBruto;

  const serie = useMemo(() => {
    const now = new Date();
    const out: { mes: string; mrr: number; lucroLiquido: number; lucroSistema: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const ativosMes = clientes.filter((c) => clienteAtivoEm(c, y, m));
      
      const r = receitaMensalTotal(ativosMes, planos, custos);
      const cBruto = calcularCustoBrutoHelena(ativosMes);
      const cLiquido = calcularCustoLiquidoHelena(ativosMes);
      
      out.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        mrr: Math.round(r),
        lucroLiquido: Math.round(r - cLiquido),
        lucroSistema: Math.round(r - cBruto),
      });
    }
    return out;
  }, [clientes, planos, custos]);

  const clientesPorPlano = useMemo(() => {
    const planosContagem: Record<string, number> = {};
    ativos.forEach((c) => {
      if (c.planoId) {
        const p = planos.find((x) => x.id === c.planoId);
        const nome = p ? p.nome : "Sem Plano";
        planosContagem[nome] = (planosContagem[nome] || 0) + 1;
      }
    });
    return Object.entries(planosContagem).map(([name, value]) => ({ name, value }));
  }, [ativos, planos]);
  const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const kpis = [
    { label: "Clientes ativos", value: String(ativos.length), icon: Users, hint: `${clientes.length} no total` },
    { label: "MRR", value: formatBRL(mrr), icon: DollarSign, hint: "Receita recorrente mensal" },
    { label: "Custo Sistema (Helena)", value: formatBRL(custoHelenaLiquido), icon: Wallet, hint: `S/ Desconto Escala: ${formatBRL(custoHelenaBruto)}` },
    { label: "Lucro Total", value: formatBRL(lucroLiquido), icon: TrendingUp, hint: `Lucro Sistema: ${formatBRL(lucroSistema)}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral da operação Elora</p>
        </div>
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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução nos últimos 12 meses</CardTitle>
            <CardDescription>Evolução do lucro líquido vs lucro sistema</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="g-lucro-liquido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-lucro-sistema" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(v) => formatBRL(Number(v ?? 0))}
                />
                <Area type="monotone" dataKey="lucroLiquido" stroke="var(--primary)" fill="url(#g-lucro-liquido)" name="Lucro Líquido" />
                <Area type="monotone" dataKey="lucroSistema" stroke="var(--accent)" fill="url(#g-lucro-sistema)" name="Lucro Sistema" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Clientes por Plano</CardTitle>
            <CardDescription>Distribuição de clientes ativos</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {clientesPorPlano.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientesPorPlano}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {clientesPorPlano.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
