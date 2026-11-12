import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
export const Route = createFileRoute("/relatorio-validacao")({
  validateSearch: z.object({ cliente: z.string().default("") }),
  beforeLoad: ({ search }) => { throw redirect({ to: "/area-do-cliente", search: { como: search.cliente, visao: "matriz" }, replace: true }); },
  head: () => ({ meta: [
    { title: "Conferência da Matriz · EloraCRM" },
    { name: "description", content: "Conferência dos valores calculados e gravados na Matriz EloraCRM." },
    { property: "og:title", content: "Conferência da Matriz · EloraCRM" },
    { property: "og:description", content: "Conferência dos valores calculados e gravados na Matriz." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});
