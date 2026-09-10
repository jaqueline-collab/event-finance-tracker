import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

// Endereço antigo da área do cliente: redireciona para /area-do-cliente
// preservando o parâmetro "como" (visualização como cliente).
const searchSchema = z.object({ como: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/cliente")({
  validateSearch: zodValidator(searchSchema),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/area-do-cliente",
      search: { como: search.como },
      replace: true,
    });
  },
});
