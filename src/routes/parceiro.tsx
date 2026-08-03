import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { getPainelParceiro } from "@/lib/parceiro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, ArrowUpRight, ArrowDownRight, Eye, X } from "lucide-react";

const searchSchema = z.object({
  como: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/parceiro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Área do Parceiro · Elora" },
      { name: "description", content: "Acompanhe os clientes vinculados à sua parceria, setups e histórico de movimentos." },
      { property: "og:title", content: "Área do Parceiro · Elora" },
      { property: "og:description", content: "Clientes vinculados, setups e histórico de movimentos da sua carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AreaParceiro,
});

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBr = (v?: string | null) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

type PainelData = Awaited<ReturnType<typeof getPainelParceiro>>;

function AreaParceiro() {
  const { como } = Route.useSearch();
  const modoAdmin = como.trim().length > 0;
  const [dados, setDados] = useState<PainelData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    getPainelParceiro({ data: modoAdmin ? { verComoParceiroId: como.trim() } : {} })
      .then((r) => !cancelado && setDados(r))
      .catch((e) => !cancelado && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [como, modoAdmin]);

  const banner = modoAdmin ? (
    <div className="sticky top-0 z-40 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 backdrop-blur">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        <Eye className="h-4 w-4" />
        Visualizando como: {dados?.parceiro.nome ?? "…"} (modo admin, somente leitura)
      </p>
      <Button asChild variant="outline" size="sm">
        <Link to="/gestao-parceiros">
          <X className="mr-2 h-4 w-4" /> Sair desse modo
        </Link>
      </Button>
    </div>
  ) : null;

  const veValores = Boolean(dados?.veValores);
  const clientes = dados?.clientes ?? [];
  const movimentos = dados?.movimentos ?? [];

  const resumo = useMemo(() => {
    const hoje = new Date();
    const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const ativos = clientes.filter((c) => !c.dataChurn).length;
    const entradas = clientes.filter((c) => (c.dataInicio ?? "").startsWith(mes)).length;
    const saidas = clientes.filter((c) => (c.dataChurn ?? "").startsWith(mes)).length;
    return { ativos, entradas, saidas };
  }, [clientes]);

  if (carregando) {
    return (
      <div className="space-y-4">
        {banner}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-4">
        {banner}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar sua área</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {banner}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{dados?.parceiro.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {modoAdmin ? "Clientes vinculados a este parceiro" : "Clientes vinculados à sua parceria"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Clientes ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{resumo.ativos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" /> Entradas no mês
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{resumo.entradas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" /> Saídas no mês
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{resumo.saidas}</CardContent>
        </Card>
      </div>

      {veValores && "totalCarteira" in (dados ?? {}) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total mensal da carteira
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {brl((dados as any).totalCarteira ?? 0)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Setup</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Churn</TableHead>
                {veValores && <TableHead className="text-right">Mensalidade</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={veValores ? 7 : 6} className="text-sm text-muted-foreground">
                    Nenhum cliente vinculado ainda.
                  </TableCell>
                </TableRow>
              )}
              {clientes.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setAberto(aberto === c.id ? null : c.id)}
                >
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.plano}</TableCell>
                  <TableCell>
                    <Badge variant={c.dataChurn ? "destructive" : "secondary"}>
                      {c.dataChurn ? "Churn" : c.statusComercial === "trial" ? "Trial" : "Ativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>{dataBr(c.dataInicio)}</TableCell>
                  <TableCell>{dataBr(c.dataVencimento)}</TableCell>
                  <TableCell>{dataBr(c.dataChurn)}</TableCell>
                  {veValores && (
                    <TableCell className="text-right">
                      {brl(((c as any).mensalidade as number) ?? 0)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {aberto && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Histórico · {clientes.find((c) => c.id === aberto)?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2 text-sm">
              {movimentos.filter((m) => m.clienteId === aberto).length === 0 && (
                <li className="text-muted-foreground">Sem movimentos registrados.</li>
              )}
              {movimentos
                .filter((m) => m.clienteId === aberto)
                .map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground w-24">{dataBr(m.data)}</span>
                    <Badge variant="outline" className="uppercase">{m.tipo}</Badge>
                    <span className="text-muted-foreground">
                      {[
                        m.plano ? `Plano: ${m.plano}` : null,
                        m.canaisWhats ? `WhatsApp: ${m.canaisWhats}` : null,
                        m.canaisInsta ? `Instagram: ${m.canaisInsta}` : null,
                        m.canaisMessenger ? `Messenger: ${m.canaisMessenger}` : null,
                        m.canaisZapi ? `Z-API: ${m.canaisZapi}` : null,
                        m.usuariosAtivos ? `Usuários: ${m.usuariosAtivos}` : null,
                        m.observacao ?? null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </li>
                ))}
            </ol>

            {veValores && (
              <div className="rounded-md border border-border/60 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Composição cobrada</p>
                <ul className="space-y-1 text-sm">
                  {(((clientes.find((c) => c.id === aberto) as any)?.itens ?? []) as any[]).map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-4">
                      <span>{i.label}</span>
                      <span className="tabular-nums">{brl(i.total)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 border-t border-border/60 pt-1 font-medium">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {brl(((clientes.find((c) => c.id === aberto) as any)?.mensalidade as number) ?? 0)}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
