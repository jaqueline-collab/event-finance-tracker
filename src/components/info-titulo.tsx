import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { TextoInfo } from "@/lib/textos-info";

/** Ícone "i" ao lado de um título: abre ao tocar (funciona no celular). */
export function InfoTitulo({ titulo, texto, filtros }: { titulo: string; texto: TextoInfo | null; filtros?: string[] }) {
  if (!texto) return null;
  const partes: [string, string | undefined][] = [["O que é", texto.oque], ["Como é contado", texto.como], ["De onde vem", texto.fonte], ["Aviso", texto.aviso]];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Sobre ${titulo}`} className="inline-flex shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-1.5 text-left text-xs font-normal">
        <p className="font-semibold">{titulo}</p>
        {partes.filter(([, v]) => v).map(([r, v]) => <p key={r}><span className="font-medium">{r}: </span>{v}</p>)}
        {filtros && filtros.length > 0 && <p><span className="font-medium">Filtros em vigor: </span>{filtros.join("; ")}</p>}
      </PopoverContent>
    </Popover>
  );
}
