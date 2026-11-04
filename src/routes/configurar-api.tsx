import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CofreChavesAdmin } from "@/components/dados-elora-cliente";
import { listarResumoIntegracoes } from "@/lib/integracao-elora.functions";
import { estadoIntegracao, ROTULO_ESTADO } from "@/lib/dados-elora";

export const Route = createFileRoute("/configurar-api")({
  validateSearch: z.object({ cliente: z.string().optional() }),
  beforeLoad: ({ search }) => {
    // Links antigos /configurar-api?cliente=... vão para a página do cliente.
    if (search.cliente) {
      throw redirect({ to: "/area-do-cliente", search: { como: search.cliente, configurar: "conexao" } as never, replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Configurar API · Elora" },
      { name: "description", content: "Cofre de chaves e visão geral das integrações dos clientes com o app Elora." },
      { property: "og:title", content: "Configurar API · Elora" },
      { property: "og:description", content: "Cofre de chaves e visão geral das integrações dos clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigurarApiPage,
});

type Linha = Awaited<ReturnType<typeof listarResumoIntegracoes>>[number];

function ConfigurarApiPage() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    listarResumoIntegracoes()
      .then(setLinhas)
      .catch((e) => {
        setLinhas([]);
        toast.error(e instanceof Error ? e.message : String(e));
      });
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (linhas ?? []).filter((l) => !q || l.nome.toLowerCase().includes(q));
  }, [linhas, busca]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Configurar API
        </h1>
        <p className="text-sm text-muted-foreground">
          Administração geral. A configuração de cada cliente fica na Área do cliente, no botão “Configurar”.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes com integração</CardTitle>
          <CardDescription>Estado da conexão e canais ligados de cada cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome" aria-label="Buscar cliente" />
          {linhas === null ? (
            <Skeleton className="h-32 w-full" />
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Canais ligados</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l) => {
                    const e = estadoIntegracao(l);
                    return (
                      <tr key={l.clienteId} className="border-t border-border/60">
                        <td className="px-3 py-2 font-medium">{l.nome}</td>
                        <td className="px-3 py-2">
                          <Badge variant={e === "com_erro" ? "destructive" : e === "conectado" ? "secondary" : "outline"}>
                            {ROTULO_ESTADO[e]}
                          </Badge>
                          {!l.ativo && <span className="ml-2 text-xs text-muted-foreground">desligada</span>}
                        </td>
                        <td className="px-3 py-2">{l.canaisLigados}</td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/area-do-cliente" search={{ como: l.clienteId, configurar: "conexao" } as never}>
                              Abrir e configurar
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CofreChavesAdmin />
    </div>
  );
}
