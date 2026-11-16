import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { alterarOcultarPessoaisLink, gerarLinkIncorporado, listarLinksIncorporados, revogarLinkIncorporado } from "@/lib/incorporar.functions";
import { ORIGEM_MOLDURA } from "@/lib/incorporar";
import { formatarDataHora } from "@/lib/formatos";

type Dados = Awaited<ReturnType<typeof listarLinksIncorporados>>;
const TODAS = "todas";
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Seção "Incorporar no Elora App": um link só leitura por visão (só super admin). */
export function IncorporarPainel({ clienteId }: { clienteId: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [visaoId, setVisaoId] = useState(TODAS);
  const [novos, setNovos] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmar, setConfirmar] = useState<"revogar" | "novo" | null>(null);

  const carregar = useCallback(() => {
    listarLinksIncorporados({ data: { clienteId } })
      .then((r) => setD(r))
      .catch((e) => toast.error(msg(e)));
  }, [clienteId]);
  useEffect(carregar, [carregar]);

  if (!d) return <Skeleton className="h-48 w-full rounded-xl" />;
  
  const alvo = visaoId === TODAS ? null : visaoId;
  const link = d.links.find((l) => l.visaoId === alvo) ?? null;
  const token = novos[visaoId];
  const url = token ? `${window.location.origin}/incorporado#${token}` : "";

  const gerar = async () => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await gerarLinkIncorporado({ data: { clienteId, visaoId: alvo, ocultarPessoais: link?.ocultarPessoais ?? false } });
      setNovos((n) => ({ ...n, [visaoId]: r.token }));
      toast.success(link ? "Link novo gerado. O anterior parou de funcionar." : "Link gerado.");
      carregar();
    } catch (e) { toast.error(msg(e)); } finally { setOcupado(false); setConfirmar(null); }
  };
  const revogar = async () => {
    if (!link || ocupado) return;
    setOcupado(true);
    try {
      await revogarLinkIncorporado({ data: { clienteId, id: link.id } });
      setNovos((n) => { const x = { ...n }; delete x[visaoId]; return x; });
      toast.success("Link revogado. Ele parou de funcionar agora.");
      carregar();
    } catch (e) { toast.error(msg(e)); } finally { setOcupado(false); setConfirmar(null); }
  };
  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  const mudarPrivacidade = async (v: boolean) => {
    if (!link) return;
    try {
      await alterarOcultarPessoaisLink({ data: { clienteId, id: link.id, ocultarPessoais: v } });
      toast.success(v ? "Nome e telefone de pacientes ocultos neste link." : "Este link volta a mostrar o mesmo que o painel.");
      carregar();
    } catch (e) { toast.error(msg(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Link2 className="h-4 w-4" /> Incorporar no Elora App</h3>
        <p className="text-sm text-muted-foreground">
          Gera um link só leitura de todas as visões visíveis ao cliente (com o Relatório diário) ou de uma visão só, para colocar dentro do Elora App. Abre sem login, sem menu e sem botões de editar ou exportar.
          Só funciona dentro de {ORIGEM_MOLDURA.replace("https://", "")}.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inc-visao">Visão incorporada</Label>
        <Select value={visaoId} onValueChange={setVisaoId}>
          <SelectTrigger id="inc-visao" className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={TODAS}>Todas as visões</SelectItem>{d.visoes.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        {link ? (
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Gerado em</dt><dd>{formatarDataHora(link.criadoEm)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Último acesso</dt><dd>{link.ultimoAcessoEm ? formatarDataHora(link.ultimoAcessoEm) : "Ainda não foi aberto"}</dd></div>
          </dl>
        ) : <p className="text-sm text-muted-foreground">Nenhum link ativo para esta visão.</p>}

        {url && (
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="Link de incorporação" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={() => void copiar()}>{copiado ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}{copiado ? "Copiado" : "Copiar link"}</Button>
          </div>
        )}
        {link && !url && (
          <p className="text-xs text-muted-foreground">Por segurança, o link só aparece logo depois de gerado. Para copiar de novo, use "Gerar novo" (o anterior para de funcionar).</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!link && <Button onClick={() => void gerar()}><Link2 className="mr-1 h-4 w-4" />Gerar link</Button>}
          {link && <Button variant="outline" onClick={() => setConfirmar("novo")}><RefreshCw className="mr-1 h-4 w-4" />Gerar novo</Button>}
          {link && <Button variant="outline" className="text-destructive" onClick={() => setConfirmar("revogar")}><ShieldOff className="mr-1 h-4 w-4" />Revogar link</Button>}
        </div>
      </div>

      {link && (
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div className="space-y-1">
            <Label htmlFor="inc-pessoais">Ocultar dados de pacientes (nome e telefone)</Label>
            <p className="text-xs text-muted-foreground">
              Desligado (padrão): o link mostra exatamente o que o painel do cliente mostra, inclusive nomes, telefones, tabelas de itens e calendário.
              Ligado: blocos com nome ou telefone de pacientes e contatos somem do link; números e gráficos continuam.
            </p>
          </div>
          <Switch id="inc-pessoais" checked={link.ocultarPessoais} onCheckedChange={(v) => void mudarPrivacidade(v)} />
        </div>
      )}

      <AlertDialog open={confirmar !== null} onOpenChange={(v) => !v && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar === "revogar" ? "Revogar este link?" : "Gerar um link novo?"}</AlertDialogTitle>
            <AlertDialogDescription>O link atual para de funcionar na hora, inclusive onde já estiver colocado no Elora App.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void (confirmar === "revogar" ? revogar() : gerar())}>{confirmar === "revogar" ? "Revogar" : "Gerar novo"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
