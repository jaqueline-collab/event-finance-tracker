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
import {
  TrendingUp,
  Users,
  Wallet,
  DollarSign,
  Trophy,
  Handshake,
  Percent,
  LifeBuoy,
  AlertTriangle,
  UserMinus,
  LineChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RankingTable, type RankingColumn } from "@/components/dashboard/ranking-table";

interface ClienteRanking {
  id: string;
  nome: string;
  plano: string;
  parceiro: string;
  dias: number;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
  acumulado: number;
}

interface ParceiroRanking {
  id: string;
  nome: string;
  clientes: number;
  receita: number;
  custo: number;
  lucro: number;
  margem: number;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Elora" }] }),
  component: Index,
});

function Index() {
  const { clientes, planos, custos, movimentos, parceiros } = useStore();

  const ativos = clientes.filter((c) => !c.dataChurn);
  const mrr = receitaMensalTotal(ativos, planos, custos);
  const receitaSistema = receitaSistemaTotal(ativos, planos, custos);
  const custoOperacional = calcularCustoLiquidoHelena(ativos, planos, custos);

  const lucroSistema = receitaSistema - custoOperacional;
  const lucroTotal = mrr - custoOperacional;

  const acompanhamentoTotal = ativos.reduce((acc, c) => acc + (c.valorAcompanhamento || 0), 0);
  const clientesComAcompanhamento = ativos.filter((c) => (c.valorAcompanhamento || 0) > 0).length;
  const margemMedia = mrr > 0 ? (lucroTotal / mrr) * 100 : 0;
  const custoWtsPct = mrr > 0 ? (custoOperacional / mrr) * 100 : 0;

  const serie = useMemo(() => {
    const now = new Date();
    const out: { mes: string; mrr: number; lucroTotal: number; lucroSistema: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const ativosMes = clientes.filter((c) => clienteAtivoEm(c, y, m));
      
      const r = receitaMensalTotal(ativosMes, planos, custos);
      const rSistema = receitaSistemaTotal(ativosMes, planos, custos);
      const c = calcularCustoLiquidoHelena(ativosMes, planos, custos);

      out.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        mrr: Math.round(r),
        lucroTotal: Math.round(r - c),
        lucroSistema: Math.round(rSistema - c),
      });
    }
    return out;
  }, [clientes, planos, custos]);

  const crescimento = useMemo(() => {
    if (serie.length < 2) return { abs: 0, pct: 0 };
    const atual = serie[serie.length - 1]!.mrr;
    const anterior = serie[serie.length - 2]!.mrr;
    const abs = atual - anterior;
    return { abs, pct: anterior > 0 ? (abs / anterior) * 100 : 0 };
  }, [serie]);

  const projecao = useMemo(() => {
    const now = new Date();
    return [1, 2, 3].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        mes: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
        mrr: Math.round(mrr),
      };
    });
  }, [mrr]);

  const churnMes = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const saidas = clientes.filter((c) => {
      if (!c.dataChurn) return false;
      const d = new Date(c.dataChurn);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const baseInicio = clientes.filter((c) => clienteAtivoEm(c, y, m)).length + saidas.length;
    return {
      qtd: saidas.length,
      taxa: baseInicio > 0 ? (saidas.length / baseInicio) * 100 : 0,
      nomes: saidas.map((c) => c.nome),
    };
  }, [clientes]);

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

  // Ranking unificado de clientes ativos
  const rankingClientes = useMemo<ClienteRanking[]>(() => {
    return ativos.map((c) => {
      const start = new Date(c.dataInicio);
      const dias = Math.max(
        0,
        Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const receita = receitaMensalCliente(c, planos, custos);
      const custo = custoMensalCliente(c, planos, custos);
      const lucro = receita - custo;
      return {
        id: c.id,
        nome: c.nome,
        plano: planos.find((p) => p.id === c.planoId)?.nome ?? "Sem plano",
        parceiro: parceiros.find((p) => p.id === c.parceiroId)?.nome ?? "Sem parceiro",
        dias,
        receita,
        custo,
        lucro,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
        acumulado: faturamentoAcumuladoCliente(c, planos, custos, movimentos),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, planos, custos, movimentos, parceiros]);

  const rankingParceiros = useMemo<ParceiroRanking[]>(() => {
    const mapa = new Map<string, ParceiroRanking>();
    for (const r of rankingClientes) {
      const atual = mapa.get(r.parceiro) ?? {
        id: r.parceiro,
        nome: r.parceiro,
        clientes: 0,
        receita: 0,
        custo: 0,
        lucro: 0,
        margem: 0,
      };
      atual.clientes += 1;
      atual.receita += r.receita;
      atual.custo += r.custo;
      atual.lucro += r.lucro;
      mapa.set(r.parceiro, atual);
    }
    return [...mapa.values()].map((p) => ({
      ...p,
      margem: p.receita > 0 ? (p.lucro / p.receita) * 100 : 0,
    }));
  }, [rankingClientes]);

  const ticketPorPlano = useMemo(() => {
    const mapa = new Map<string, { nome: string; qtd: number; receita: number }>();
    for (const r of rankingClientes) {
      const atual = mapa.get(r.plano) ?? { nome: r.plano, qtd: 0, receita: 0 };
      atual.qtd += 1;
      atual.receita += r.receita;
      mapa.set(r.plano, atual);
    }
    return [...mapa.values()]
      .map((p) => ({ ...p, ticket: p.qtd > 0 ? p.receita / p.qtd : 0 }))
      .sort((a, b) => b.ticket - a.ticket);
  }, [rankingClientes]);

  const margemBaixa = useMemo(
    () => rankingClientes.filter((r) => r.margem < 20).sort((a, b) => a.margem - b.margem),
    [rankingClientes],
  );

  const colunasClientes: RankingColumn<ClienteRanking>[] = [
    { key: "nome", label: "Cliente", value: (r) => r.nome, align: "left" },
    { key: "plano", label: "Plano", value: (r) => r.plano, align: "left" },
    { key: "parceiro", label: "Parceiro", value: (r) => r.parceiro, align: "left" },
    { key: "dias", label: "Dias", value: (r) => r.dias, align: "right", render: (r) => `${r.dias} d` },
    { key: "receita", label: "Receita", value: (r) => r.receita, align: "right", render: (r) => formatBRL(r.receita) },
    { key: "custo", label: "Custo WTS", value: (r) => r.custo, align: "right", render: (r) => formatBRL(r.custo) },
    {
      key: "lucro",
      label: "Lucro",
      value: (r) => r.lucro,
      align: "right",
      render: (r) => (
        <span className={r.lucro >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
          {formatBRL(r.lucro)}
        </span>
      ),
    },
    {
      key: "margem",
      label: "Margem",
      value: (r) => r.margem,
      align: "right",
      render: (r) => `${r.margem.toFixed(1)}%`,
    },
  ];

  const colunasParceiros: RankingColumn<ParceiroRanking>[] = [
    { key: "nome", label: "Parceiro", value: (r) => r.nome, align: "left" },
    { key: "clientes", label: "Clientes", value: (r) => r.clientes, align: "right" },
    { key: "receita", label: "Receita", value: (r) => r.receita, align: "right", render: (r) => formatBRL(r.receita) },
    { key: "custo", label: "Custo WTS", value: (r) => r.custo, align: "right", render: (r) => formatBRL(r.custo) },
    {
      key: "lucro",
      label: "Lucro",
      value: (r) => r.lucro,
      align: "right",
      render: (r) => (
        <span className={r.lucro >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"}>
          {formatBRL(r.lucro)}
        </span>
      ),
    },
    { key: "margem", label: "Margem", value: (r) => r.margem, align: "right", render: (r) => `${r.margem.toFixed(1)}%` },
  ];

  const kpis = [
    { label: "Clientes ativos", value: String(ativos.length), icon: Users },
    { label: "MRR", value: formatBRL(mrr), icon: DollarSign, hint: "Receita recorrente mensal" },
    { label: "Lucro sobre o Sistema", value: formatBRL(lucroSistema), icon: Wallet, hint: `Receita do sistema (${formatBRL(receitaSistema)}) − custo operacional` },
    { label: "Lucro Total", value: formatBRL(lucroTotal), icon: TrendingUp, hint: `MRR − custo operacional (${formatBRL(custoOperacional)})` },
  ];

  const kpisSecundarios = [
    {
      label: "Custo WTS / Receita",
      value: `${custoWtsPct.toFixed(1)}%`,
      icon: Percent,
      hint: `${formatBRL(custoOperacional)} de custo operacional sobre ${formatBRL(mrr)}`,
    },
    {
      label: "Margem média",
      value: `${margemMedia.toFixed(1)}%`,
      icon: TrendingUp,
      hint: "Lucro total ÷ MRR (inclui acompanhamento)",
    },
    {
      label: "Acompanhamento",
      value: formatBRL(acompanhamentoTotal),
      icon: LifeBuoy,
      hint: `${clientesComAcompanhamento} cliente(s) com acompanhamento ativo`,
    },
    {
      label: "Crescimento MRR",
      value: `${crescimento.abs >= 0 ? "+" : ""}${formatBRL(crescimento.abs)}`,
      icon: LineChart,
      hint: `${crescimento.pct >= 0 ? "+" : ""}${crescimento.pct.toFixed(1)}% vs. mês anterior`,
    },
    {
      label: "Churn do mês",
      value: String(churnMes.qtd),
      icon: UserMinus,
      hint: `${churnMes.taxa.toFixed(1)}% da base${churnMes.nomes.length ? ` · ${churnMes.nomes.join(", ")}` : ""}`,
    },
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {kpisSecundarios.map((k) => (
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

      {margemBaixa.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Alerta de margem baixa
            </CardTitle>
            <CardDescription>Clientes ativos com margem abaixo de 20%.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {margemBaixa.map((r) => (
              <Badge key={r.id} variant="outline" className="border-destructive/50">
                {r.nome} · {r.margem.toFixed(1)}% · {formatBRL(r.lucro)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

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

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" /> Projeção de MRR — próximos 3 meses
            </CardTitle>
            <CardDescription>Continuidade dos contratos ativos hoje.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {projecao.map((p) => (
                <div key={p.mes} className="rounded-lg border border-border/40 px-3 py-3 text-center">
                  <div className="text-xs uppercase text-muted-foreground">{p.mes}</div>
                  <div className="text-lg font-semibold">{formatBRL(p.mrr)}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/40 px-3 py-2 text-sm">
              Total projetado em 3 meses:{" "}
              <span className="font-semibold">{formatBRL(mrr * 3)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Projeção baseada na base atual — não prevê novos clientes ou cancelamentos.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-accent" /> Ranking de parceiros
            </CardTitle>
            <CardDescription>Receita e lucro dos clientes vinculados. Clique nas colunas para ordenar.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankingTable
              rows={rankingParceiros}
              columns={colunasParceiros}
              rowKey={(r) => r.id}
              defaultSort="lucro"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" /> Ticket médio por plano
          </CardTitle>
          <CardDescription>Receita média mensal por cliente em cada plano.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {ticketPorPlano.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
          {ticketPorPlano.map((p) => (
            <div key={p.nome} className="rounded-lg border border-border/40 px-3 py-2">
              <div className="text-sm font-medium truncate">{p.nome}</div>
              <div className="text-lg font-semibold">{formatBRL(p.ticket)}</div>
              <div className="text-[11px] text-muted-foreground">
                {p.qtd} cliente(s) · {formatBRL(p.receita)} no total
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Ranking de clientes
          </CardTitle>
          <CardDescription>Clique em qualquer coluna para ordenar a carteira ativa.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankingTable
            rows={rankingClientes}
            columns={colunasClientes}
            rowKey={(r) => r.id}
            defaultSort="lucro"
          />
        </CardContent>
      </Card>
    </div>
  );
}
