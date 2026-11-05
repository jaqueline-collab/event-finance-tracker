import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { validarRelatorioDiario } from "@/lib/indicadores.functions";
import { periodoDe } from "@/lib/painel-visual";

export const Route = createFileRoute("/relatorio-validacao")({
  validateSearch: z.object({ cliente: z.string().default("") }),
  head: () => ({
    meta: [
      { title: "Validação do relatório diário · Elora" },
      { name: "description", content: "Conferência do relatório diário calculado pelo motor, só para a super admin." },
      { property: "og:title", content: "Validação do relatório diário · Elora" },
      { property: "og:description", content: "Conferência do relatório diário calculado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValidacaoPage,
});

type Resultado = Awaited<ReturnType<typeof validarRelatorioDiario>>;

function Valor({ c }: { c?: { valor: number; estimado: number } }) {
  if (!c) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {c.valor}
      {c.estimado > 0 && (
        <span className="ml-1 text-xs text-warning" title={`${c.estimado} estimado(s)`}>
          *
        </span>
      )}
    </span>
  );
}

function ValidacaoPage() {
  const { cliente } = Route.useSearch();
  const [r, setR] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!cliente) return;
    const p = periodoDe("30d", new Date().toISOString());
    validarRelatorioDiario({ data: { clienteId: cliente, de: p.de, ate: p.ate } })
      .then(setR)
      .catch((e) => setErro(String(e?.message ?? e)));
  }, [cliente]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Validação do relatório diário</CardTitle>
          <CardDescription>
            Últimos 30 dias calculados pelo motor. <span className="text-warning">*</span> = valor estimado (antes da primeira leitura
            do card). Entre parênteses, o que já está gravado.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!cliente && <p className="text-sm text-muted-foreground">Abra com ?cliente=ID.</p>}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          {cliente && !r && !erro && <Skeleton className="h-64 w-full" />}
          {r && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Dia</th>
                  {r.colunas.map((c) => (
                    <th key={c.chave} className="p-2">
                      {c.nome}
                      {c.tipo === "manual" && <Badge variant="outline" className="ml-1">manual</Badge>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...r.linhas].reverse().map((l) => (
                  <tr key={l.dia} className="border-b">
                    <td className="p-2 tabular-nums">{l.dia.split("-").reverse().join("/")}</td>
                    {r.colunas.map((c) => (
                      <td key={c.chave} className="p-2">
                        {c.tipo === "manual" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <>
                            <Valor c={l.valores[c.chave]} />
                            {r.existente[l.dia]?.[c.chave] !== undefined && (
                              <span className="ml-1 text-xs text-muted-foreground">({r.existente[l.dia][c.chave]})</span>
                            )}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="p-2">Total</td>
                  {r.colunas.map((c) => (
                    <td key={c.chave} className="p-2">
                      {c.tipo === "manual" ? "—" : <Valor c={r.total[c.chave]} />}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
