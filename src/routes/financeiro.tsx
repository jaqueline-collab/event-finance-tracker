import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (access.loading || !atual || atual === aba) return;
    navigate({ search: { aba: atual }, replace: true });
  }, [access.loading, atual, aba, navigate]);

  if (access.loading) {
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
          Peça a um administrador a permissão de Fechamento Mensal ou Financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
