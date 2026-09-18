import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  apagarDadosIntegracao,
  contarDadosIntegracao,
  exportarDadosIntegracao,
  exportarParaGoogleSheets,
  type EntidadeExportada,
} from "@/lib/dashboard-widgets.functions";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function baixar(nome: string, conteudo: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

const paraCsv = (e: EntidadeExportada) => {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [e.colunas.map(esc).join(","), ...e.linhas.map((l) => l.map(esc).join(","))].join("\n");
};

/**
 * Perguntado ao marcar o churn de um cliente que tem dados da integração:
 * exportar primeiro, depois apagar. Nada financeiro é tocado aqui.
 */
export function ChurnDadosDialog({
  clienteId,
  nomeCliente,
  aberto,
  aoFechar,
}: {
  clienteId: string | null;
  nomeCliente: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [total, setTotal] = useState<number | null>(null);
  const [exportou, setExportou] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!aberto || !clienteId) return;
    setTotal(null);
    setExportou(false);
    setConfirmando(false);
    contarDadosIntegracao({ data: { clienteId } })
      .then((r) => setTotal(r.total))
      .catch(() => setTotal(0));
  }, [aberto, clienteId]);

  if (!clienteId) return null;

  const exportar = async (formato: "csv" | "xlsx" | "sheets") => {
    setOcupado(formato);
    try {
      if (formato === "sheets") {
        const r = await exportarParaGoogleSheets({ data: { clienteId, nomeCliente } });
        window.open(r.url, "_blank", "noopener");
      } else {
        const { entidades } = await exportarDadosIntegracao({ data: { clienteId } });
        if (formato === "csv") {
          for (const e of entidades) {
            baixar(`${nomeCliente}-${e.nome}.csv`, "\uFEFF" + paraCsv(e), "text/csv;charset=utf-8");
          }
        } else {
          const XLSX = await import("xlsx");
          const wb = XLSX.utils.book_new();
          for (const e of entidades) {
            XLSX.utils.book_append_sheet(
              wb,
              XLSX.utils.aoa_to_sheet([e.colunas, ...e.linhas]),
              e.nome.slice(0, 31),
            );
          }
          baixar(
            `${nomeCliente}-dados-elora.xlsx`,
            XLSX.write(wb, { bookType: "xlsx", type: "array" }),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
        }
      }
      setExportou(true);
      toast.success("Exportação concluída.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const apagar = async () => {
    setOcupado("apagar");
    try {
      await apagarDadosIntegracao({ data: { clienteId } });
      toast.success("Dados da integração apagados. Nenhum dado financeiro foi tocado.");
      aoFechar();
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dados sincronizados de {nomeCliente}</DialogTitle>
          <DialogDescription>
            {total === null
              ? "Conferindo o que existe…"
              : `Este cliente tem ${total} registros vindos da integração com o app Elora. Deseja exportar antes de continuar?`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={ocupado !== null} onClick={() => exportar("csv")}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" disabled={ocupado !== null} onClick={() => exportar("xlsx")}>
            <Download className="mr-2 h-4 w-4" /> XLSX
          </Button>
          <Button size="sm" variant="outline" disabled={ocupado !== null} onClick={() => exportar("sheets")}>
            <Download className="mr-2 h-4 w-4" /> Google Sheets
          </Button>
        </div>

        {confirmando ? (
          <p className="text-sm text-destructive">
            {exportou
              ? "Tem certeza? Isso não pode ser desfeito."
              : "Você ainda não exportou nada. Tem certeza? Isso não pode ser desfeito."}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Depois de exportar (ou pular), você pode apagar os dados sincronizados. Pagamentos,
            fechamentos e qualquer registro financeiro são preservados.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={aoFechar} disabled={ocupado !== null}>
            Pular por agora
          </Button>
          {confirmando ? (
            <Button variant="destructive" onClick={apagar} disabled={ocupado !== null}>
              <Trash2 className="mr-2 h-4 w-4" />
              {ocupado === "apagar" ? "Apagando…" : "Apagar mesmo assim"}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmando(true)} disabled={ocupado !== null}>
              <Trash2 className="mr-2 h-4 w-4" /> Apagar dados sincronizados
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
