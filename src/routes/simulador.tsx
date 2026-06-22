import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Simulador } from "@/components/landing/Simulador";
import { PawLogo } from "@/components/landing/PawLogo";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de Plano — EloraCRM" },
      {
        name: "description",
        content:
          "Monte seu pacote EloraCRM: usuários, canais e módulos. Recomendamos o plano e calculamos o valor em tempo real.",
      },
    ],
  }),
  component: SimuladorPage,
});

function SimuladorPage() {
  return (
    <div
      className="min-h-screen bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <header className="bg-landing-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 leading-none">
            <PawLogo className="h-7 w-7 text-landing-yellow shrink-0 -mt-0.5" />
            <span
              className="text-white font-bold tracking-tight text-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              EloraCRM
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-landing-yellow transition"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>
      <Simulador />
    </div>
  );
}