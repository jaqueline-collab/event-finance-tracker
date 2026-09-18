import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfigurarApiCliente } from "@/components/configurar-api-cliente";
import { listarClientesParaVer } from "@/lib/cliente.functions";

export const Route = createFileRoute("/configurar-api")({
  validateSearch: z.object({ cliente: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Configurar API · Elora" },
      {
        name: "description",
        content:
          "Conecte a conta do cliente ao app Elora, descubra os campos disponíveis e monte os widgets do painel.",
      },
      { property: "og:title", content: "Configurar API · Elora" },
      {
        property: "og:description",
        content: "Conexão, campos, classificações e construtor de widgets do painel do cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfigurarApiPage,
});

function ConfigurarApiPage() {
  const { cliente } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    listarClientesParaVer()
      .then(setClientes)
      .catch((e) => toast.error(e instanceof Error ? e.message : String(e)));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [clientes, busca]);

  const escolhido = clientes.find((c) => c.id === cliente);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold sm:text-2xl">Configurar API</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o cliente para conectar a conta do app Elora e montar o painel dele.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Cliente
          </CardTitle>
          <CardDescription>
            {escolhido ? `Configurando: ${escolhido.nome}` : "Busque pelo nome do cliente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="busca-cliente">Buscar</Label>
            <Input
              id="busca-cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {filtrados.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={c.id === cliente ? "default" : "outline"}
                onClick={() => navigate({ search: { cliente: c.id } })}
              >
                {c.nome}
              </Button>
            ))}
            {filtrados.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {cliente && <ConfigurarApiCliente key={cliente} clienteId={cliente} />}
    </div>
  );
}
