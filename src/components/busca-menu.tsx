import { useState } from "react";
import { Handshake, Users } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type ItemBuscaMenu = { id: string; nome: string; tipo: "parceiro" | "cliente" };

function NomeDestacado({ nome, busca }: { nome: string; busca: string }) {
  const inicio = nome.toLocaleLowerCase("pt-BR").indexOf(busca);
  if (inicio < 0) return <>{nome}</>;
  const fim = inicio + busca.length;
  return <>{nome.slice(0, inicio)}<mark className="rounded-sm bg-brand px-0.5 font-bold text-brand-foreground">{nome.slice(inicio, fim)}</mark>{nome.slice(fim)}</>;
}

/** A mesma busca do menu, com seleção por teclado fornecida pelo Command. */
export function BuscaMenu({ itens, onSelecionar }: { itens: ItemBuscaMenu[]; onSelecionar: (i: ItemBuscaMenu) => void }) {
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLocaleLowerCase("pt-BR");
  const resultados = q ? itens.filter((i) => i.nome.toLocaleLowerCase("pt-BR").includes(q)).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).slice(0, 8) : [];
  return (
    <Command shouldFilter={false} loop className="h-auto border border-border bg-popover text-popover-foreground">
      <CommandInput value={busca} onValueChange={setBusca} placeholder="Ver como… (parceiro ou cliente)" aria-label="Ver como parceiro ou cliente" className="text-xs text-popover-foreground" onKeyDown={(e) => { if (e.key === "Escape") setBusca(""); }} />
      <CommandList className={q ? "max-h-64" : "hidden"}>
        {q && <CommandEmpty className="px-2 py-3 text-xs text-popover-foreground" role="status">Nenhum cliente encontrado</CommandEmpty>}
        {resultados.map((i) => (
          <CommandItem key={`${i.tipo}-${i.id}`} value={`${i.tipo}-${i.id}`} aria-label={`${i.nome} · ${i.tipo === "parceiro" ? "Parceiro" : "Cliente"}`} onSelect={() => { setBusca(""); onSelecionar(i); }} className="min-h-11 cursor-pointer bg-popover text-xs text-popover-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-secondary-foreground">
            {i.tipo === "parceiro" ? <Handshake /> : <Users />}
            <span className="min-w-0 flex-1 truncate" title={i.nome}><NomeDestacado nome={i.nome} busca={q} /></span>
            <span className="shrink-0 text-[10px]">{i.tipo === "parceiro" ? "Parceiro" : "Cliente"}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}