import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PreviaCartao } from "@/components/cartoes-graficos";
import { aplicarProposta, desfazerAcaoConfig } from "@/lib/assistente-config.functions";
import { previaColunaMatriz } from "@/lib/matriz.functions";
import type { Proposta } from "@/lib/assistente-config";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/^[a-z-]+:\s*/, "");

/** Proposta do assistente: prévia ao vivo + Aplicar/Descartar. Só "Aplicar" grava (servidor revalida super admin). */
export function PropostaConfig({ proposta, descricao }: { proposta: Proposta; descricao: string }) {
  const [estado, setEstado] = useState<"aberta" | "aplicando" | "aplicada" | "descartada">("aberta");
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const aplicar = async () => {
    setEstado("aplicando");
    try {
      const r = await aplicarProposta({ data: { clienteId: proposta.clienteId, proposta } });
      setAcaoId(r.acaoId);
      setEstado("aplicada");
      window.dispatchEvent(new Event("elora-config-aplicada"));
      toast.success("Configuração aplicada.");
    } catch (e) {
      setEstado("aberta");
      toast.error(msg(e));
    }
  };
  const desfazerAcao = async () => {
    if (!acaoId) return;
    try {
      await desfazerAcaoConfig({ data: { clienteId: proposta.clienteId, acaoId } });
      setEstado("descartada");
      window.dispatchEvent(new Event("elora-config-aplicada"));
      toast.success("Alteração desfeita.");
    } catch (e) {
      toast.error(msg(e));
    }
  };
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 text-sm">
      <p className="font-medium">{descricao}</p>
      {proposta.motivo && <p className="text-xs text-muted-foreground">{proposta.motivo}</p>}
      {estado !== "descartada" && <Previa proposta={proposta} />}
      <div className="flex flex-wrap gap-2">
        {estado === "aberta" || estado === "aplicando" ? (
          <>
            <Button size="sm" disabled={estado === "aplicando"} onClick={() => void aplicar()}>{estado === "aplicando" ? "Aplicando…" : "Aplicar"}</Button>
            <Button size="sm" variant="ghost" disabled={estado === "aplicando"} onClick={() => setEstado("descartada")}>Descartar</Button>
          </>
        ) : estado === "aplicada" ? (
          <>
            <span className="text-xs text-primary">Aplicada</span>
            <Button size="sm" variant="outline" className="h-7" onClick={() => void desfazerAcao()}>Desfazer</Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{acaoId ? "Desfeita" : "Descartada"} · nada foi gravado{acaoId ? " além do registro" : ""}</span>
        )}
      </div>
    </div>
  );
}

function Previa({ proposta: p }: { proposta: Proposta }) {
  if (p.tipo === "cartao") return <PreviaCartao clienteId={p.clienteId} cartao={p.cartao} />;
  if (p.tipo === "coluna_matriz") return <PreviaColuna proposta={p} />;
  if (p.tipo === "layout") return <ul className="text-xs text-muted-foreground">{p.cartoes.map((c) => <li key={c.id}>{c.titulo} · {c.largura ?? "padrão"}/12</li>)}</ul>;
  if (p.tipo === "filtros_visao") return <ul className="text-xs text-muted-foreground">{p.filtros.map((f, i) => <li key={i}>{f.fonte}.{f.campo} {f.op} {(f as any).valores?.join(", ") ?? ""}</li>)}</ul>;
  return <p className="text-xs text-muted-foreground">{p.fonte}.{p.campo} → {p.oculto ? "oculto" : "visível"}{p.rotulo ? `, “${p.rotulo}”` : ""}</p>;
}

function PreviaColuna({ proposta: p }: { proposta: Extract<Proposta, { tipo: "coluna_matriz" }> }) {
  const [r, setR] = useState<{ total: number | null; dias: number } | null>(null);
  useEffect(() => {
    const ate = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const d = new Date(`${ate}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 29);
    previaColunaMatriz({ data: { clienteId: p.clienteId, de: d.toISOString().slice(0, 10), ate, coluna: p.coluna as any } })
      .then((x: any) => setR({ total: x.total?.valor ?? null, dias: x.dias.length }))
      .catch(() => setR({ total: null, dias: 0 }));
  }, [p]);
  return <p className="text-xs text-muted-foreground">Prévia, últimos 30 dias: {r ? (r.total == null ? "—" : r.total.toLocaleString("pt-BR")) : "calculando…"}</p>;
}
