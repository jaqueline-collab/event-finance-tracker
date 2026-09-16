import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, ChevronLeft, ChevronRight, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { getResultadosCliente } from "@/lib/integracao-elora.functions";

type Resultados = Awaited<ReturnType<typeof getResultadosCliente>>;

const POR_PAGINA = 20;

const hojeIso = () => new Date().toISOString().slice(0, 10);
const diasAtrasIso = (n: number) =>
  new Date(Date.now() - (n - 1) * 86_400_000).toISOString().slice(0, 10);

const dataHoraBr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const dataBrFlex = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
};

/** Painel "Resultados" da área do cliente, alimentado pelos contatos do app Elora. */
export function ResultadosCliente({ clienteId }: { clienteId: string }) {
  const [modo, setModo] = useState<"7" | "30" | "custom">("30");
  const [deCustom, setDeCustom] = useState(diasAtrasIso(30));
  const [ateCustom, setAteCustom] = useState(hojeIso());
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Resultados | null>(null);
  const [carregando, setCarregando] = useState(true);

  const de = modo === "custom" ? deCustom : diasAtrasIso(modo === "7" ? 7 : 30);
  const ate = modo === "custom" ? ateCustom : hojeIso();

  const carregar = useCallback(() => {
    setCarregando(true);
    getResultadosCliente({ data: { clienteId, de, ate, pagina, porPagina: POR_PAGINA } })
      .then(setDados)
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, [clienteId, de, ate, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const trocarPeriodo = (m: typeof modo) => {
    setModo(m);
    setPagina(1);
  };

  const pct = dados && dados.total > 0 ? Math.round((dados.anuncio / dados.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Resultados da conta
        </CardTitle>
        <CardDescription>Contatos novos vindos do seu aplicativo Elora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { v: "7", l: "Últimos 7 dias" },
                { v: "30", l: "Últimos 30 dias" },
                { v: "custom", l: "Personalizado" },
              ] as const
            ).map((o) => (
              <Button
                key={o.v}
                size="sm"
                variant={modo === o.v ? "secondary" : "outline"}
                onClick={() => trocarPeriodo(o.v)}
              >
                {o.l}
              </Button>
            ))}
          </div>
          {modo === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="res-de" className="text-xs text-muted-foreground">De</Label>
                <Input
                  id="res-de"
                  type="date"
                  className="w-40"
                  value={deCustom}
                  onChange={(e) => {
                    setDeCustom(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="res-ate" className="text-xs text-muted-foreground">Até</Label>
                <Input
                  id="res-ate"
                  type="date"
                  className="w-40"
                  value={ateCustom}
                  onChange={(e) => {
                    setAteCustom(e.target.value);
                    setPagina(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Novos contatos</p>
            {carregando ? (
              <Loader2 className="mt-2 h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{dados?.total ?? 0}</p>
            )}
          </div>
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">% vindos de anúncio</p>
            {carregando ? (
              <Loader2 className="mt-2 h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold">{pct}%</p>
                <p className="text-xs text-muted-foreground">
                  {dados?.anuncio ?? 0} de {dados?.total ?? 0} contatos
                </p>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Procedimento de interesse</TableHead>
                <TableHead>Data da consulta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!carregando && (dados?.contatos.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum contato sincronizado neste período ainda.
                  </TableCell>
                </TableRow>
              )}
              {!carregando &&
                dados?.contatos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome ?? "—"}</TableCell>
                    <TableCell>{c.telefone ?? "—"}</TableCell>
                    <TableCell>{dataHoraBr(c.criadoEm)}</TableCell>
                    <TableCell>
                      {c.utmSource ? (
                        <Badge
                          variant="secondary"
                          title={`Origem: ${c.utmSource}${c.utmMedium ? ` · Mídia: ${c.utmMedium}` : ""}${c.utmCampaign ? ` · Campanha: ${c.utmCampaign}` : ""}`}
                        >
                          <Megaphone className="mr-1 h-3 w-3" /> Anúncio
                        </Badge>
                      ) : (
                        <Badge variant="outline">Orgânico</Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.procedimento ?? "—"}</TableCell>
                    <TableCell>{dataBrFlex(c.dataConsulta)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>

        {dados && dados.totalPaginas > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagina <= 1 || carregando}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {dados.pagina} de {dados.totalPaginas}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pagina >= dados.totalPaginas || carregando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {!carregando && dados && (
          <p className="text-xs text-muted-foreground">
            Ordenado do contato mais recente para o mais antigo · {dados.total} contato
            {dados.total === 1 ? "" : "s"} no período.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
