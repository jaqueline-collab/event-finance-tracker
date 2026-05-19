import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orcamentos")({
  component: Orcamentos,
});

function Orcamentos() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground text-sm">Gerencie propostas comerciais e orçamentos de novos clientes.</p>
        </div>
        <Button>Criar Novo Orçamento</Button>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Histórico de Orçamentos</CardTitle>
          <CardDescription>Você ainda não criou nenhum orçamento.</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
          Nenhum dado para exibir.
        </CardContent>
      </Card>
    </div>
  );
}
