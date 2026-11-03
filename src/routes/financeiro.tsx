import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUserAccess } from "@/lib/permissions";
import { ABAS_FINANCEIRO, abasPermitidas, resolverAba } from "@/lib/financeiro-abas";
import { FechamentoMensal } from "@/components/financeiro/fechamento-mensal";
import { LancamentosFinanceiro } from "@/components/financeiro/lancamentos";

export const Route = createFileRoute("/financeiro")({
  validateSearch: zodValidator(z.object({ aba: fallback(z.string(), "").default("") })),
  head: () => ({ meta: [{ title: "Financeiro · Elora" }] }),
  component: FinanceiroArea,
});

function FinanceiroArea() {
  const { aba } = Route.useSearch();
  const navigate = useNavigate({ from: "/financeiro" });
  const access = useCurrentUserAccess();
  const permitidas = abasPermitidas((m) => access.canView(m));
  const atual = resolverAba(aba || undefined, permitidas);
  const jaCarregou = useRef(false);
  if (!access.loading) jaCarregou.current = true;
  const pronto = jaCarregou.current;

  useEffect(() => {
    if (!pronto || !atual || atual === aba) return;
    navigate({ search: { aba: atual }, replace: true });
  }, [pronto, atual, aba, navigate]);

  if (!pronto) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!atual) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center">
        <Lock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Sem acesso ao Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {access.error ?? "Peça a um administrador a permissão de Fechamento Mensal ou Financeiro."}
        </p>
        {access.error && (
          <Button variant="outline" size="sm" className="mt-4" onClick={() => access.refresh()}>
            Tentar de novo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {access.error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="flex-1">{access.error} Usando o último acesso conhecido.</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => access.refresh()}>Tentar de novo</Button>
        </div>
      )}
      {permitidas.length > 1 && (
        <Tabs value={atual} onValueChange={(v) => navigate({ search: { aba: v } })}>
          <TabsList className="h-auto flex-wrap">
            {ABAS_FINANCEIRO.filter((a) => permitidas.includes(a.key)).map((a) => (
              <TabsTrigger key={a.key} value={a.key}>{a.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      {atual === "fechamento" && <FechamentoMensal />}
      {atual === "lancamentos" && <LancamentosFinanceiro key="lancamentos" />}
      {atual === "notas" && <LancamentosFinanceiro key="notas" modo="notas" />}
    </div>
  );
}
