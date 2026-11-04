import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DadosEloraCliente } from "@/components/dados-elora-cliente";
import { ConfigurarApiCliente } from "@/components/configurar-api-cliente";
import { IntegracaoElora } from "@/components/integracao-elora";
import { getIntegracaoCliente } from "@/lib/integracao-elora.functions";
import { listarClientesParaVer } from "@/lib/cliente.functions";
import {
  ABAS_DADOS_ELORA,
  abaDadosEloraValida,
  estadoIntegracao,
  ROTULO_ESTADO,
  type EstadoIntegracao,
} from "@/lib/dados-elora";

export const Route = createFileRoute("/clientes_/$id/dados-elora")({
  validateSearch: z.object({ aba: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Dados do Elora · Elora" },
      { name: "description", content: "Conexão, canais, estrutura e painel do cliente no app Elora." },
      { property: "og:title", content: "Dados do Elora" },
      { property: "og:description", content: "Conexão, canais, estrutura e painel do cliente no app Elora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DadosEloraPagina,
});

type Estado = Awaited<ReturnType<typeof getIntegracaoCliente>>;

const COR_CHIP: Record<EstadoIntegracao, string> = {
  conectado: "border-transparent bg-brand-soft text-foreground",
  sem_chave: "",
  com_erro: "border-transparent bg-destructive/15 text-destructive",
};

function DadosEloraPagina() {
  const { id } = Route.useParams();
  const { aba: abaBruta } = Route.useSearch();
  const aba = abaDadosEloraValida(abaBruta);
  const navigate = useNavigate({ from: Route.fullPath });

  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [nome, setNome] = useState<string>("");
  const [estado, setEstado] = useState<Estado | null>(null);
  const jaCarregou = useRef(false);

  useEffect(() => {
    supabase.rpc("is_equipe_interna").then(({ data, error }) => {
      if (error || !data) {
        setPermitido(false);
        navigate({ to: "/", replace: true });
      } else setPermitido(true);
    });
  }, [navigate]);

  const recarregar = useCallback(() => {
    getIntegracaoCliente({ data: { clienteId: id } })
      .then((r) => setEstado(r))
      .catch(() => undefined)
      .finally(() => {
        jaCarregou.current = true;
      });
  }, [id]);

  useEffect(() => {
    if (!permitido) return;
    recarregar();
    listarClientesParaVer()
      .then((l) => setNome(l.find((c) => c.id === id)?.nome ?? id))
      .catch(() => setNome(id));
  }, [permitido, id, recarregar]);

  if (permitido !== true) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const chip = estado
    ? estadoIntegracao({ temChave: estado.configurada, ultimoErro: estado.ultimoErro })
    : null;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground" aria-label="Caminho">
            <Link to="/clientes" className="hover:text-foreground">Clientes</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate">{nome || "…"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Dados do Elora</span>
          </nav>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Dados do Elora
          </h1>
        </div>
        {chip && (
          <Badge variant="outline" className={`self-start sm:self-auto ${COR_CHIP[chip]}`}>
            {ROTULO_ESTADO[chip]}
          </Badge>
        )}
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
        {ABAS_DADOS_ELORA.map((a) => (
          <button
            key={a.key}
            type="button"
            role="tab"
            aria-selected={aba === a.key}
            onClick={() => navigate({ search: { aba: a.key }, replace: true })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              aba === a.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "visao" && <DadosEloraCliente clienteId={id} aba="visao" />}

      {aba === "conexao" && (
        <div className="space-y-4">
          {estado?.ultimoErro && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Último erro</AlertTitle>
              <AlertDescription className="break-words">{estado.ultimoErro}</AlertDescription>
            </Alert>
          )}
          {estado?.configurada && (
            <DadosEloraCliente clienteId={id} aba="conexao" baseUrl={estado.baseUrl} />
          )}
          <IntegracaoElora clienteId={id} semAtalho />
        </div>
      )}

      {aba === "canais" && <DadosEloraCliente clienteId={id} aba="canais" />}

      {/* Mantido montado nas duas abas para compartilhar campos e painéis já buscados. */}
      {(aba === "estrutura" || aba === "painel") && (
        <ConfigurarApiCliente clienteId={id} aba={aba} />
      )}
    </div>
  );
}
