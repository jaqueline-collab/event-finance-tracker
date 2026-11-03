import { createFileRoute, Outlet } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AreaExternaLayout } from "@/components/area-externa-layout";

const searchSchema = z.object({
  como: fallback(z.string(), "").default(""),
  aba: fallback(z.enum(["clientes", "financeiro", "calculadora", "treinamento"]), "clientes").default(
    "clientes",
  ),
  grafico: fallback(z.enum(["fluxo", "ativos"]), "fluxo").default("fluxo"),
  ano: fallback(z.number().int(), 0).default(0),
  periodo: fallback(z.string(), "mes").default("mes"),
  indicador: fallback(z.string(), "").default(""),
  sub: fallback(z.string(), "fechamentos").default("fechamentos"),
});

export const Route = createFileRoute("/parceiro")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Área do Parceiro · Elora" },
      { name: "description", content: "Acompanhe os clientes vinculados à sua parceria, setups, histórico de movimentos e fechamentos liberados." },
      { property: "og:title", content: "Área do Parceiro · Elora" },
      { property: "og:description", content: "Clientes vinculados, setups, histórico de movimentos e financeiro da sua carteira." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParceiroLayout,
});

function ParceiroLayout() {
  return (
    <AreaExternaLayout titulo="Área do parceiro">
      <Outlet />
    </AreaExternaLayout>
  );
}
