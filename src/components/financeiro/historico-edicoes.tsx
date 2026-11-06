import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";
import { listarEdicoesFechamento } from "@/lib/fechamento-edicao.functions";

export type EdicaoFechamento = {
  id: string;
  item_id: string | null;
  campo: string;
  valor_antigo: unknown;
  valor_novo: unknown;
  motivo: string | null;
  editado_em: string;
  editado_por_nome: string | null;
};

const ROTULOS: Record<string, string> = {
  titulo: "Título", descricao: "Descrição", observacao: "Observação", competencia: "Competência",
  total_bruto: "Total bruto", total_desconto: "Total desconto", total_liquido: "Total líquido",
  plano_id: "Plano", ciclo_inicio: "Ciclo início", ciclo_fim: "Ciclo fim", vencimento: "Vencimento",
  valor_bruto: "Valor bruto", valor_desconto: "Desconto", valor_liquido: "Líquido",
  "composicao.planoNome": "Plano (nome)", "composicao.composicao": "Linhas da composição",
  "composicao.acompanhamento": "Acompanhamento cobrado", "composicao.acompanhamentoIsento": "Acompanhamento isento",
  "composicao.mauExcedenteValor": "Excedente de contatos", "item.incluido": "Cliente incluído", "item.removido": "Item removido",
};

export function rotuloCampo(campo: string) {
  if (campo.startsWith("lancamento.")) {
    const k = campo.split(".").pop() ?? "";
    return `Lançamento · ${({ valor: "valor", vencimento: "vencimento", status: "status", nf_emitida: "NF emitida", nf_numero: "nº NF" } as Record<string, string>)[k] ?? k}`;
  }
  return ROTULOS[campo] ?? campo;
}

export function textoValor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (Array.isArray(v)) return `${v.length} linha(s): ${v.map((l: any) => `${l.label} ${Number(l.total ?? 0).toFixed(2)}`).join("; ")}`;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("valor_liquido" in o) return `cliente ${String(o.cliente_id ?? "")} · líquido ${Number(o.valor_liquido).toFixed(2)}`;
    return JSON.stringify(v);
  }
  return String(v);
}

export function HistoricoEdicoes({ fechamentoId, nomeCliente, onCarregar }: {
  fechamentoId: string;
  nomeCliente: (itemId: string | null) => string | null;
  onCarregar?: (e: EdicaoFechamento[]) => void;
}) {
  const listar = useServerFn(listarEdicoesFechamento);
  const [edicoes, setEdicoes] = useState<EdicaoFechamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    listar({ data: { fechamentoId } })
      .then((r) => { if (vivo) { setEdicoes(r as EdicaoFechamento[]); onCarregar?.(r as EdicaoFechamento[]); } })
      .catch((e) => { if (vivo) setErro(e instanceof Error ? e.message : "Falha ao carregar histórico."); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechamentoId]);

  if (erro) return <p className="text-xs text-destructive">{erro}</p>;
  if (!edicoes || edicoes.length === 0) return null;
  return (
    <section className="rounded-md border border-border/60 p-3 space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Edições ({edicoes.length})</h3>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left"><th className="py-1 pr-2">Quando</th><th className="pr-2">Quem</th><th className="pr-2">Cliente</th><th className="pr-2">Campo</th><th className="pr-2">Antes → depois</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            {edicoes.map((e) => (
              <tr key={e.id} className="border-t border-border/30 align-top">
                <td className="py-1 pr-2 whitespace-nowrap">{new Date(e.editado_em).toLocaleString("pt-BR")}</td>
                <td className="pr-2">{e.editado_por_nome ?? "—"}</td>
                <td className="pr-2">{nomeCliente(e.item_id) ?? "—"}</td>
                <td className="pr-2">{rotuloCampo(e.campo)}</td>
                <td className="pr-2">{textoValor(e.valor_antigo)} → {textoValor(e.valor_novo)}</td>
                <td>{e.motivo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
