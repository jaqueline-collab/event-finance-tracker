import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { conferirAgora, lerConferencia } from "@/lib/conferencia.functions";
import { diaSPDe, estadoAmostra, estadoCelula, ETAPAS_CONFERENCIA, FUSO_CONFERENCIA, O_QUE_CONTA, ROTULO_ETAPA, totais, type Amostra, type EstadoCelula, type LinhaConferencia, type Par } from "@/lib/conferencia";
import { formatarDataHora } from "@/lib/formatos";

type Dados = Awaited<ReturnType<typeof lerConferencia>>;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const COR: Record<EstadoCelula, string> = { ok: "text-success", andamento: "text-muted-foreground", diverge: "text-destructive font-semibold" };
const diaBr = (d: string) => d.split("-").reverse().join("/");

function CelulaPar({ p, hoje }: { p: Par | null | undefined; hoje: boolean }) {
  if (!p) return <><td /><td /><td /></>;
  const e = estadoCelula(p, hoje);
  const dif = p.elora - p.nosso;
  return (
    <>
      <td className="px-2 py-1 text-right tabular-nums">{p.nosso}</td>
      <td className="px-2 py-1 text-right tabular-nums">{p.elora}</td>
      <td className={`px-2 py-1 text-right tabular-nums ${COR[e]}`}>{e === "andamento" ? `${dif > 0 ? "+" : ""}${dif} em andamento` : `${dif > 0 ? "+" : ""}${dif}`}</td>
    </>
  );
}
function CelulaAmostra({ a, hoje }: { a: Amostra | null | undefined; hoje: boolean }) {
  if (!a) return <td />;
  const e = estadoAmostra(a, hoje);
  return <td className={`px-2 py-1 text-right tabular-nums ${COR[e]}`}>{a.amostra ? `${a.bateram} de ${a.amostra} bateram${a.andamento ? ` (${a.andamento} em andamento)` : ""}` : ""}</td>;
}

/** Conferência com o Elora App: nosso banco × Elora, últimos 7 dias. Só super admin. */
export function ConferenciaElora({ clienteId }: { clienteId: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [rodando, setRodando] = useState(false);
  const carregar = useCallback(() => lerConferencia({ data: { clienteId } }).then(setD).catch((e) => toast.error(msg(e))), [clienteId]);
  useEffect(() => { void carregar(); }, [carregar]);

  const conferir = async () => {
    setRodando(true);
    try {
      for (let i = 0; i < 30; i++) {
        const r = await conferirAgora({ data: { clienteId } });
        await carregar();
        if (r.concluida) break;
      }
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setRodando(false);
      await carregar();
    }
  };

  if (!d) return <Skeleton className="h-48 w-full rounded-xl" />;
  const emAndamento = d.atual?.situacao === "conferindo" ? d.atual : null;
  const c = d.concluida;
  const hoje = c ? diaSPDe(Date.parse(c.iniciadoEm)) : "";
  const linhas: LinhaConferencia[] = c?.linhas ?? [];
  const t = totais(linhas);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">Conferência com o Elora App</p>
          <p className="text-xs text-muted-foreground">
            {c ? `Última conferência: ${formatarDataHora(c.concluidoEm ?? c.iniciadoEm)} (${c.origem === "automatica" ? "automática" : "manual"})` : "Ainda não houve conferência."} · Fuso usado: {FUSO_CONFERENCIA}. Roda sozinha uma vez por dia, depois da sincronização das 02:55.
          </p>
        </div>
        <Button size="sm" onClick={conferir} disabled={rodando}>
          <RefreshCw className={`mr-1 h-4 w-4 ${rodando ? "animate-spin" : ""}`} />
          {rodando ? "Conferindo..." : "Conferir agora"}
        </Button>
      </div>
      {(rodando || emAndamento) && <p className="text-xs text-muted-foreground">Conferindo... {emAndamento?.progresso ?? ""}</p>}
      {c && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-1 text-left" rowSpan={2}>Dia</th>
                {ETAPAS_CONFERENCIA.slice(0, 3).map((k) => <th key={k} className="px-2 py-1 text-center" colSpan={3}>{ROTULO_ETAPA[k]}</th>)}
                <th className="px-2 py-1 text-right" rowSpan={2}>{ROTULO_ETAPA.mensagens}</th>
              </tr>
              <tr className="text-muted-foreground">
                {ETAPAS_CONFERENCIA.slice(0, 3).flatMap((k) => [<th key={`${k}n`} className="px-2 text-right font-normal">Nosso banco</th>, <th key={`${k}e`} className="px-2 text-right font-normal">Elora</th>, <th key={`${k}d`} className="px-2 text-right font-normal">Diferença</th>])}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const h = l.dia === hoje;
                return (
                  <tr key={l.dia} className="border-t">
                    <td className="px-2 py-1">{diaBr(l.dia)}{h ? " (hoje)" : ""}</td>
                    <CelulaPar p={l.atendimentos} hoje={h} />
                    <CelulaPar p={l.contatos} hoje={h} />
                    <CelulaPar p={l.cards} hoje={h} />
                    <CelulaAmostra a={l.mensagens} hoje={h} />
                  </tr>
                );
              })}
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-2 py-1">Total</td>
                <CelulaPar p={t.atendimentos} hoje={linhas.some((l) => l.dia === hoje)} />
                <CelulaPar p={t.contatos} hoje={linhas.some((l) => l.dia === hoje)} />
                <CelulaPar p={t.cards} hoje={linhas.some((l) => l.dia === hoje)} />
                <CelulaAmostra a={t.mensagens} hoje={linhas.some((l) => l.dia === hoje)} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {c?.exclusoes && (
        <div className={`rounded-lg border p-3 text-xs ${c.exclusoes.bloqueado ? "border-destructive/50 bg-destructive/5" : ""}`}>
          <p className="font-medium text-foreground">Cards excluídos no Elora (últimos 30 dias)</p>
          <p className="text-muted-foreground">
            Marcados agora: {c.exclusoes.marcados.length} · Reativados: {c.exclusoes.reativados.length} · Conferidos um a um no Elora: {c.exclusoes.verificadosPorId}
          </p>
          {c.exclusoes.aviso && <p className={c.exclusoes.bloqueado ? "font-medium text-destructive" : "text-muted-foreground"}>{c.exclusoes.aviso}</p>}
          {c.exclusoes.bloqueado && <p className="text-muted-foreground">Cards que seriam marcados: {c.exclusoes.naoEncontrados.map((id) => id.slice(0, 8)).join(", ")}</p>}
          <p className="text-muted-foreground">Um card só é marcado como excluído quando o Elora responde "não encontrado" ao pedido daquele card. O registro continua guardado e sai de todos os números; se o card voltar no Elora, ele é reativado.</p>
        </div>
      )}
      <ul className="space-y-1 text-xs text-muted-foreground">
        {ETAPAS_CONFERENCIA.map((k) => <li key={k}><span className="font-medium text-foreground">{ROTULO_ETAPA[k]}:</span> {O_QUE_CONTA[k]}</li>)}
        <li>Verde: igual nos dois lados. Vermelho: diferente. "Em andamento": só no dia de hoje, diferença de até 1 por registro criado durante a própria conferência.</li>
      </ul>
    </div>
  );
}
