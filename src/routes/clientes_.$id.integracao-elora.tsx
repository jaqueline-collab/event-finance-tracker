import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: leva para a nova página "Dados do Elora".
export const Route = createFileRoute("/clientes_/$id/integracao-elora")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/clientes/$id/dados-elora", params: { id: params.id }, replace: true });
  },
});
