import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: a configuração vive no painel lateral da Área do cliente.
export const Route = createFileRoute("/clientes_/$id/dados-elora")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/area-do-cliente", search: { como: params.id, configurar: "conexao" } as never, replace: true });
  },
});
