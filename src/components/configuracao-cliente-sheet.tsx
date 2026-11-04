import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DadosEloraCliente } from "@/components/dados-elora-cliente";
import { ConfigurarApiCliente } from "@/components/configurar-api-cliente";
import { IntegracaoElora } from "@/components/integracao-elora";
import { getIntegracaoCliente } from "@/lib/integracao-elora.functions";
import {
  ABAS_DADOS_ELORA,
  estadoIntegracao,
  ROTULO_ESTADO,
  type AbaDadosElora,
  type EstadoIntegracao,
} from "@/lib/dados-elora";

type Estado = Awaited<ReturnType<typeof getIntegracaoCliente>>;

const COR_CHIP: Record<EstadoIntegracao, string> = {
  conectado: "border-transparent bg-brand-soft text-foreground",
  sem_chave: "",
  com_erro: "border-transparent bg-destructive/15 text-destructive",
};

/** Painel lateral de configuração do cliente (só super admin; o servidor também confere). */
export function ConfiguracaoClienteSheet({
  clienteId,
  nomeCliente,
  aba,
  onAba,
  onFechar,
}: {
  clienteId: string;
  nomeCliente: string;
  aba: AbaDadosElora | null;
  onAba: (a: AbaDadosElora) => void;
  onFechar: () => void;
}) {
  const aberto = aba !== null;
  const [estado, setEstado] = useState<Estado | null>(null);

  const recarregar = useCallback(() => {
    getIntegracaoCliente({ data: { clienteId } })
      .then(setEstado)
      .catch(() => undefined);
  }, [clienteId]);

  useEffect(() => {
    if (aberto) recarregar();
  }, [aberto, recarregar]);

  const chip = estado ? estadoIntegracao({ temChave: estado.configurada, ultimoErro: estado.ultimoErro }) : null;

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="space-y-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>Configurar · {nomeCliente}</SheetTitle>
            {chip && (
              <Badge variant="outline" className={COR_CHIP[chip]}>
                {ROTULO_ESTADO[chip]}
              </Badge>
            )}
          </div>
          <SheetDescription>Visível só para super admin. O cliente não vê esta parte.</SheetDescription>
        </SheetHeader>

        <div className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
          {ABAS_DADOS_ELORA.map((a) => (
            <button
              key={a.key}
              type="button"
              role="tab"
              aria-selected={aba === a.key}
              onClick={() => onAba(a.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                aba === a.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {aba === "conexao" && (
            <div className="space-y-4">
              {estado?.ultimoErro && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Último erro</AlertTitle>
                  <AlertDescription className="break-words">{estado.ultimoErro}</AlertDescription>
                </Alert>
              )}
              {estado?.configurada && <DadosEloraCliente clienteId={clienteId} aba="conexao" baseUrl={estado.baseUrl} />}
              <IntegracaoElora clienteId={clienteId} semAtalho />
            </div>
          )}
          {aba === "canais" && <DadosEloraCliente clienteId={clienteId} aba="canais" />}
          {aba === "painel" && <ConfigurarApiCliente clienteId={clienteId} aba="painel" />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
