import marinho from "@/assets/marca/elora-logo-marinho.svg.asset.json";
import branco from "@/assets/marca/elora-logo-branco.svg.asset.json";
import icone from "@/assets/marca/elora-icone-app.svg.asset.json";
import { cn } from "@/lib/utils";

/**
 * Logo oficial (arquivo original, sem redesenho).
 * cor: "branco" sobre marinho/escuro, "marinho" sobre claro, "auto" segue o tema.
 * Respiro mínimo (altura do ponto da IA ≈ 25% da altura) aplicado pelo padding.
 */
export function EloraLogo({ cor = "branco", className }: { cor?: "branco" | "marinho" | "auto"; className?: string }) {
  const base = cn("h-7 w-auto shrink-0 box-content p-[0.25em]", className);
  if (cor === "auto")
    return (
      <>
        <img src={marinho.url} alt="EloraCRM" className={cn(base, "dark:hidden")} />
        <img src={branco.url} alt="EloraCRM" className={cn(base, "hidden dark:block")} />
      </>
    );
  return <img src={cor === "branco" ? branco.url : marinho.url} alt="EloraCRM" className={base} />;
}

export function EloraIcone({ className }: { className?: string }) {
  return <img src={icone.url} alt="" aria-hidden="true" className={cn("shrink-0", className)} />;
}
