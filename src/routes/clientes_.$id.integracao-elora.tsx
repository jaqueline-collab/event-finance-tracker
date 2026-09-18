import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfigurarApiCliente } from "@/components/configurar-api-cliente";

export const Route = createFileRoute("/clientes_/$id/integracao-elora")({
  head: () => ({
    meta: [
      { title: "Configurar API do cliente · Elora" },
      {
        name: "description",
        content:
          "Conexão com o app Elora, campos disponíveis, classificações e widgets do painel deste cliente.",
      },
      { property: "og:title", content: "Configurar API do cliente" },
      {
        property: "og:description",
        content: "Campos, painéis, sequências, classificações e widgets do painel do cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegracaoDoCliente,
});

function IntegracaoDoCliente() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Button size="sm" variant="ghost" asChild>
        <Link to="/configurar-api" search={{ cliente: id }}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Configurar API
        </Link>
      </Button>
      <ConfigurarApiCliente clienteId={id} />
    </div>
  );
}
