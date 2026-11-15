import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { desfazerAcaoConfig, listarAcoesConfig } from "@/lib/assistente-config.functions";
import { dataHoraSync } from "@/lib/sync-fontes";

type Acao = Awaited<ReturnType<typeof listarAcoesConfig>>["acoes"][number];
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Alterações registradas deste cliente (visões excluídas, células manuais, assistente), com desfazer. Só super admin. */
export function HistoricoAlteracoes({ clienteId }: { clienteId: string }) {
  const [acoes, setAcoes] = useState<Acao[] | null>(null);
  const carregar = () => listarAcoesConfig({ data: { clienteId } }).then((r) => setAcoes(r.acoes)).catch((e) => toast.error(msg(e)));
  useEffect(() => { void carregar(); }, [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!acoes) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!acoes.length) return <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>;
  return (
    <ul className="space-y-2">
      {acoes.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium" title={a.descricao}>{a.descricao}</p>
            <p className="text-xs text-muted-foreground">{dataHoraSync(a.em)}{a.quem ? ` · ${a.quem}` : ""}{a.desfeita ? " · desfeita" : ""}</p>
          </div>
          {!a.desfeita && (
            <Button size="sm" variant="outline" onClick={async () => {
              try { await desfazerAcaoConfig({ data: { clienteId, acaoId: a.id } }); toast.success("Alteração desfeita."); await carregar(); }
              catch (e) { toast.error(msg(e)); }
            }}>Desfazer</Button>
          )}
        </li>
      ))}
    </ul>
  );
}
