import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GrupoCatalogo } from "@/lib/campos-elora";
import { lerConfigStatusLead, salvarConfigStatusLead, salvarCoresStatus } from "@/lib/status-lead.functions";
import { CAMPO_STATUS_LEAD, REGRA_STATUS_LEAD, ROTULO_STATUS_PADRAO, type ColunaStatus } from "@/lib/status-lead";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const NAO_CARD = new Set(["id", "painel", CAMPO_STATUS_LEAD]);

/** Origem e nome da coluna "Status do lead" deste cliente (só super admin). Sem origem, a coluna fica oculta. */
export function ConfigStatusLead({ clienteId, catalogo }: { clienteId: string; catalogo: Pick<GrupoCatalogo, "fonte" | "campos">[] }) {
  const [funis, setFunis] = useState<{ id: string; titulo: string; etapas: string[] }[]>([]);
  const [cores, setCores] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState<ColunaStatus | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    lerConfigStatusLead({ data: { clienteId } })
      .then((r) => { setFunis(r.funis); setCfg(r.config); setCores(r.cores ?? {}); setCarregado(true); })
      .catch((e) => toast.error(msg(e)));
  }, [clienteId]);
  if (!carregado) return null;
  const camposContato = (catalogo.find((g) => g.fonte === "contato")?.campos ?? []).filter((c) => c.campo !== CAMPO_STATUS_LEAD);
  const camposCard = [
    { campo: "etapa", rotulo: "Etapa" },
    { campo: "status", rotulo: "Situação do card" },
    ...(catalogo.find((g) => g.fonte === "card")?.campos ?? []).filter((c) => c.campo.startsWith("campo.")).map((c) => ({ campo: c.campo, rotulo: c.rotulo })),
  ];
  const fonteSel = cfg?.fonte ?? "_";
  const salvar = async (novo: ColunaStatus | null) => {
    setSalvando(true);
    try { await salvarConfigStatusLead({ data: { clienteId, config: novo } }); toast.success(novo ? "Origem do status salva." : "Coluna de status oculta."); }
    catch (e) { toast.error(msg(e)); }
    finally { setSalvando(false); }
  };
  const salvarCores = async () => {
    setSalvando(true);
    try { await salvarCoresStatus({ data: { clienteId, cores } }); toast.success("Cores das etapas salvas."); }
    catch (e) { toast.error(msg(e)); }
    finally { setSalvando(false); }
  };
  const etapasFunil = cfg?.fonte === "card" && cfg.campo === "etapa" ? (funis.find((f) => f.id === cfg.funilId)?.etapas ?? []) : [];
  const valido = !!cfg && !!cfg.campo && (cfg.fonte === "contato" || !!cfg.funilId);
  return (
    <div className="mt-2 space-y-2 rounded-lg border p-2">
      <Label>Coluna "{cfg?.rotulo || ROTULO_STATUS_PADRAO}"</Label>
      <Input className="h-8" maxLength={60} placeholder={ROTULO_STATUS_PADRAO} aria-label="Nome da coluna de status" value={cfg?.rotulo ?? ""} disabled={!cfg} onChange={(e) => cfg && setCfg({ ...cfg, rotulo: e.target.value || undefined })} />
      <Select value={fonteSel} onValueChange={(v) => setCfg(v === "_" ? null : { fonte: v as "contato" | "card", campo: v === "card" ? "etapa" : "", funilId: null, rotulo: cfg?.rotulo })}>
        <SelectTrigger className="h-8" aria-label="Origem do status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_">Sem origem (coluna oculta)</SelectItem>
          <SelectItem value="contato">Campo do contato</SelectItem>
          <SelectItem value="card">Campo do card em um funil</SelectItem>
        </SelectContent>
      </Select>
      {cfg?.fonte === "card" && (
        <Select value={cfg.funilId ?? "_"} onValueChange={(v) => setCfg({ ...cfg, funilId: v === "_" ? null : v })}>
          <SelectTrigger className="h-8" aria-label="Funil"><SelectValue placeholder="Escolha o funil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Escolha o funil</SelectItem>
            {funis.map((f) => <SelectItem key={f.id} value={f.id}>{f.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cfg && (
        <Select value={cfg.campo || "_"} onValueChange={(v) => setCfg({ ...cfg, campo: v === "_" ? "" : v })}>
          <SelectTrigger className="h-8" aria-label="Campo"><SelectValue placeholder="Escolha o campo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Escolha o campo</SelectItem>
            {(cfg.fonte === "card" ? camposCard.filter((c) => !NAO_CARD.has(c.campo)) : camposContato).map((c) => <SelectItem key={c.campo} value={c.campo}>{c.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {cfg?.fonte === "card" && <p className="text-xs text-muted-foreground">{REGRA_STATUS_LEAD}</p>}
      {cfg?.fonte === "contato" && cfg.campo === "etiquetas" && <p className="text-xs text-muted-foreground">As etiquetas usam as cores do Elora App.</p>}
      {etapasFunil.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">O Elora App não envia cor das etapas. Escolha uma cor para cada etapa; sem cor, fica a cor padrão.</p>
          {etapasFunil.map((et) => (
            <label key={et} className="flex items-center gap-2 text-xs">
              <input type="color" aria-label={`Cor da etapa ${et}`} className="h-6 w-8 cursor-pointer rounded border bg-transparent" value={cores[et] ?? "#cccccc"} onChange={(e) => setCores((c) => ({ ...c, [et]: e.target.value }))} />
              <span className="min-w-0 flex-1 truncate" title={et}>{et}</span>
              {cores[et] && <button type="button" className="text-muted-foreground underline" onClick={() => setCores((c) => { const n = { ...c }; delete n[et]; return n; })}>Usar padrão</button>}
            </label>
          ))}
          <Button size="sm" variant="outline" onClick={salvarCores}>{salvando ? "Salvando…" : "Salvar cores"}</Button>
        </div>
      )}
      <Button size="sm" variant="outline" disabled={salvando || (!!cfg && !valido)} onClick={() => salvar(cfg && valido ? { ...cfg, rotulo: cfg.rotulo?.trim() || undefined } : null)}>
        {salvando ? "Salvando…" : "Salvar origem"}
      </Button>
    </div>
  );
}
