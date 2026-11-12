import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MarcaEstimativa({ desde }: { desde?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const data = desde ? desde.slice(0,10).split("-").reverse().join("/") : null;
  const texto = data ? `Valor estimado: o Elora não guarda quando o card mudou de etapa antes de ${data}` : "Valor estimado: a data histórica da mudança de etapa não está disponível.";
  return <Popover open={aberto} onOpenChange={setAberto}>
    <PopoverTrigger asChild><Button size="icon" variant="ghost" className="ml-1 h-5 w-5 text-muted-foreground" aria-label={texto} onMouseEnter={() => setAberto(true)} onFocus={() => setAberto(true)}><span aria-hidden>●</span></Button></PopoverTrigger>
    <PopoverContent className="w-72 text-xs" onMouseLeave={() => setAberto(false)}>{texto}</PopoverContent>
  </Popover>;
}