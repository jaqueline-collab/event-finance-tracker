import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço antigo: o Fechamento Mensal agora é uma aba do Financeiro.
export const Route = createFileRoute("/resumo")({
  beforeLoad: () => {
    throw redirect({ to: "/financeiro", search: { aba: "fechamento" }, replace: true });
  },
});
