import { useState } from "react";
import { toast } from "sonner";
import { Database, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

function paraCsv(e: EntidadeExportada) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [e.colunas.map(esc).join(","), ...e.linhas.map((l) => l.map(esc).join(","))].join("\n");
}

/** Exportar e apagar os dados que vieram da integração com o app Elora. */
export function DadosIntegracaoCliente({
  clienteId,
  nomeCliente,
}: {
  clienteId: string;
  nomeCliente: string;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const carregar = async (): Promise<EntidadeExportada[]> => {
    const r = await exportarDadosIntegracao({ data: { clienteId } });
    return r.entidades;
  };

  const exportarCsv = async () => {
    setOcupado("csv");
    try {
      const entidades = await carregar();
      for (const e of entidades) {
        baixar(`${nomeCliente}-${e.nome}.csv`, "\uFEFF" + paraCsv(e), "text/csv;charset=utf-8");
      }
      toast.success("Arquivos CSV baixados.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const exportarXlsx = async () => {
    setOcupado("xlsx");
    try {
      const entidades = await carregar();
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const e of entidades) {
        const ws = XLSX.utils.aoa_to_sheet([e.colunas, ...e.linhas]);
        XLSX.utils.book_append_sheet(wb, ws, e.nome.slice(0, 31));
      }
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      baixar(
        `${nomeCliente}-dados-elora.xlsx`,
        buf,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      toast.success("Planilha baixada.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const exportarSheets = async () => {
    setOcupado("sheets");
    try {
      const r = await exportarParaGoogleSheets({ data: { clienteId, nomeCliente } });
      window.open(r.url, "_blank", "noopener");
      toast.success("Planilha criada no Google Sheets.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
    }
  };

  const apagar = async () => {
    setOcupado("apagar");
    try {
      const { total } = await contarDadosIntegracao({ data: { clienteId } });
      await apagarDadosIntegracao({ data: { clienteId } });
      toast.success(`${total} registros da integração foram apagados. Nada financeiro foi tocado.`);
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setOcupado(null);
      setConfirmando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Dados da integração
        </CardTitle>
        <CardDescription>
          Exporte ou apague tudo que veio do app Elora para este cliente. Pagamentos, fechamentos e
          qualquer registro financeiro nunca são apagados aqui.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={exportarCsv} disabled={ocupado !== null}>
          <Download className="mr-2 h-4 w-4" /> {ocupado === "csv" ? "Gerando…" : "Exportar CSV"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportarXlsx} disabled={ocupado !== null}>
          <Download className="mr-2 h-4 w-4" /> {ocupado === "xlsx" ? "Gerando…" : "Exportar XLSX"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportarSheets} disabled={ocupado !== null}>
          <Download className="mr-2 h-4 w-4" />
          {ocupado === "sheets" ? "Criando…" : "Exportar para Google Sheets"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirmando(true)}
          disabled={ocupado !== null}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Apagar dados da integração
        </Button>

        <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar os dados sincronizados deste cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Contatos, conversas, classificações, painéis, sequências, widgets e a chave de acesso
                da integração são apagados. Isso não pode ser desfeito. Nenhum pagamento, fechamento
                ou dado financeiro é afetado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={apagar}>Apagar mesmo assim</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
