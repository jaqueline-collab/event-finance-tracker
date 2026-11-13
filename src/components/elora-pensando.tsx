import { EloraLogo, EloraIcone } from "@/components/elora-logo";

/** Estado "digitando / IA respondendo": ícone da Elora com o ponto amarelo pulsando. */
export function EloraPensando({ texto = "Elora está consultando…" }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
      <span className="relative inline-flex h-6 w-6">
        <EloraIcone className="h-6 w-6 rounded-md" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand animate-elora-ponto" />
      </span>
      {texto}
    </div>
  );
}
