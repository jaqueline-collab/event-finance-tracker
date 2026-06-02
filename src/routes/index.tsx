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
  calcularCustoLiquidoHelena,
  receitaMensalTotal,
  receitaSistemaTotal,
  faturamentoAcumuladoCliente,
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
import { TrendingUp, Users, Wallet, DollarSign, Trophy, Crown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard · Elora" }] }),
  component: Index,
});

function Index() {
  const { clientes, planos, custos, movimentos } = useStore();

  const ativos = clientes.filter((c) => !c.dataChurn);
  const mrr = receitaMensalTotal(ativos, planos, custos);
  const receitaSistema = receitaSistemaTotal(ativos, planos, custos);
  const custoOperacional = calcularCustoLiquidoHelena(ativos);

  const lucroSistema = receitaSistema - custoOperacional;
  const lucroTotal = mrr - custoOperacional;

  const serie = useMemo(() => {
    const now = new Date();
    const out: { mes: string; mrr: number; lucroLiquido: number; lucroSistema: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const ativosMes = clientes.filter((c) => clienteAtivoEm(c, y, m));
      
      const r = receitaMensalTotal(ativosMes, planos, custos);
      const rSistema = receitaSistemaTotal(ativosMes, planos, custos);
      const c = calcularCustoLiquidoHelena(ativosMes);

      out.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        mrr: Math.round(r),
        lucroTotal: Math.round(r - c),
        lucroSistema: Math.round(rSistema - c),
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

  // Rankings de clientes
  const rankings = useMemo(() => {
    const enriched = clientes.map((c) => {
      const start = new Date(c.dataInicio);
      const end = c.dataChurn ? new Date(c.dataChurn) : new Date();
      const ltv = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const receita = receitaMensalCliente(c, planos, custos);
      const custo = custoMensalCliente(c, planos, custos);
      const lucroMensal = receita - custo;
      const acumulado = faturamentoAcumuladoCliente(c, planos, custos, movimentos);
      return { c, ltv, lucroMensal, acumulado };
    });
    return {
      topLtv: [...enriched].sort((a, b) => b.ltv - a.ltv).slice(0, 5),
      topLucro: [...enriched].sort((a, b) => b.lucroMensal - a.lucroMensal).slice(0, 5),
    };
  }, [clientes, planos, custos, movimentos]);

  const kpis = [
    { label: "Clientes ativos", value: String(ativos.length), icon: Users, hint: `${clientes.length} no total` },
    { label: "MRR", value: formatBRL(mrr), icon: DollarSign, hint: "Receita recorrente mensal" },
    { label: "Lucro sobre o Sistema", value: formatBRL(lucroSistema), icon: Wallet, hint: `Receita do sistema (${formatBRL(receitaSistema)}) − custo operacional` },
    { label: "Lucro Total", value: formatBRL(lucroTotal), icon: TrendingUp, hint: `MRR − custo operacional (${formatBRL(custoOperacional)})` },
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
            <CardDescription>Lucro sobre o sistema vs lucro total</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="g-lucro-total" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="lucroSistema" stroke="var(--accent)" fill="url(#g-lucro-sistema)" name="Lucro sobre o Sistema" />
                <Area type="monotone" dataKey="lucroTotal" stroke="var(--primary)" fill="url(#g-lucro-total)" name="Lucro Total" />
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

      {/* Rankings */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-accent" /> Top Clientes por Tempo de Vida</CardTitle>
            <CardDescription>Os clientes mais fiéis da carteira (dias ativos).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankings.topLtv.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            {rankings.topLtv.map((r, idx) => (
              <div key={r.c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground w-5">#{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.c.nome}</div>
                    <div className="text-[10px] text-muted-foreground">Acumulado {formatBRL(r.acumulado)}</div>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">{r.ltv} d</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Top Clientes por Lucro</CardTitle>
            <CardDescription>Clientes com maior lucro líquido mensal atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankings.topLucro.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            {rankings.topLucro.map((r, idx) => (
              <div key={r.c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground w-5">#{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.c.nome}</div>
                    <div className="text-[10px] text-muted-foreground">{r.ltv} dias · MRR líquido</div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${r.lucroMensal >= 0 ? "text-primary" : "text-destructive"}`}>{formatBRL(r.lucroMensal)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
