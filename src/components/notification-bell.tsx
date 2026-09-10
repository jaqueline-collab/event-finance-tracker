import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listarNotificacoes,
  marcarNotificacoesLidas,
  type Notificacao,
} from "@/lib/notificacoes.functions";

function quando(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(() => {
    listarNotificacoes()
      .then(setItens)
      .catch(() => setItens([]));
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 120_000);
    return () => clearInterval(t);
  }, [carregar]);

  const naoLidas = itens.filter((i) => !i.lida);

  const abrir = (open: boolean) => {
    setAberto(open);
    if (open && naoLidas.length) {
      const ids = naoLidas.map((i) => i.id);
      setItens((prev) => prev.map((i) => ({ ...i, lida: true })));
      marcarNotificacoesLidas({ data: { ids } }).catch(() => carregar());
    }
  };

  return (
    <DropdownMenu open={aberto} onOpenChange={abrir}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={
            naoLidas.length ? `${naoLidas.length} notificações não lidas` : "Notificações"
          }
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {naoLidas.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {naoLidas.length > 9 ? "9+" : naoLidas.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)]">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {itens.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Você não tem avisos por enquanto.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {itens.map((n) => (
              <div key={n.id} className="px-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-start gap-2">
                  {!n.lida && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{n.titulo}</div>
                    {n.texto && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {n.texto}
                      </p>
                    )}
                    <div className="text-[11px] text-muted-foreground/70 mt-1">
                      {quando(n.criadoEm)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
