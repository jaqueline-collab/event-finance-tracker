import { createFileRoute, Outlet } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AreaExternaLayout } from "@/components/area-externa-layout";

const searchSchema = z.object({
  como: fallback(z.string(), "").default(""),
  aba: fallback(z.enum(["conta", "plano", "equipe", "treinamento", "novidades"]), "conta").default("conta"),
  // Aba do painel lateral de configuração (só super admin); validada no componente.
  configurar: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/area-do-cliente")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Área do Cliente · Elora" },
      { name: "description", content: "Veja seu plano, o que está contratado, o histórico da conta e as novidades do Elora." },
      { property: "og:title", content: "Área do Cliente · Elora" },
      { property: "og:description", content: "Plano, serviços contratados, histórico e novidades da sua conta Elora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClienteLayout,
});

function ClienteLayout() {
  return (
    <AreaExternaLayout titulo="Área do cliente">
      <Outlet />
    </AreaExternaLayout>
  );
}
