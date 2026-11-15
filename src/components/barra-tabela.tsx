import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Columns3, Pin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ListaOrdenavel, moverPara } from "@/components/lista-ordenavel";
import { colunasVisiveis, moverColuna, type ColunaTabela, type EstadoColunas } from "@/lib/colunas-tabela";

export type FormatoExportar = "csv" | "xlsx" | "pdf";

/**
 * Barra única de toda tabela do painel: Colunas (mostrar, ocultar, reordenar, fixar, restaurar),
 * Agrupar por e Exportar, sempre nesta ordem. Quem vê muda sem gravar; "Salvar como padrão" só aparece
 * quando a tela passa `onSalvarPadrao` (super admin no modo Editar).
 */
export function BarraTabela({
  colunas, estado, onEstado, padrao, semFixar,
  agruparOpcoes, agrupar, onAgrupar,
  onExportar, formatos = ["csv", "xlsx", "pdf"],
  onSalvarPadrao, extras,
}: {
  colunas: ColunaTabela[];
  estado: EstadoColunas;
  onEstado: (e: EstadoColunas) => void;
  padrao: EstadoColunas;
  semFixar?: boolean;
  agruparOpcoes?: { chave: string; rotulo: string }[];
  agrupar?: string;
  onAgrupar?: (v: string) => void;
  onExportar: (f: FormatoExportar) => void;
  formatos?: FormatoExportar[];
  onSalvarPadrao?: () => void;
  extras?: ReactNode;
}) {
  const lista = colunasVisiveis(colunas, { ...estado, ocultas: [], fixas: [] });
  const mudou = JSON.stringify(estado) !== JSON.stringify(padrao);
  const set = (p: Partial<EstadoColunas>) => onEstado({ ...estado, ...p });
  return (
    <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Barra da tabela">
      <Popover>
        <PopoverTrigger asChild><Button size="sm" variant="outline" className="h-7 gap-1 text-xs" aria-label="Colunas"><Columns3 className="h-3.5 w-3.5" /> Colunas</Button></PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-1 p-2">
          <ListaOrdenavel ids={lista.map((c) => c.chave)} onMover={(de, para) => set({ ordem: moverPara(lista.map((x) => x.chave), de, para) })}>
          {(chave, i, alca) => {
            const c = lista[i];
            const oculta = estado.ocultas.includes(c.chave); const fixa = estado.fixas.includes(c.chave);
            return (
              <div className="flex items-center gap-1 text-xs">
                {alca}
                <Checkbox checked={!oculta} aria-label={`Mostrar ${c.rotulo}`} onCheckedChange={(v) => set({ ocultas: v === false ? [...estado.ocultas, c.chave] : estado.ocultas.filter((x) => x !== c.chave) })} />
                <span className="min-w-0 flex-1 truncate" title={c.rotulo}>{c.rotulo}</span>
                {!semFixar && <Button size="icon" variant={fixa ? "secondary" : "ghost"} className="h-6 w-6" aria-pressed={fixa} aria-label={`Fixar ${c.rotulo} à esquerda`} title="Fixar à esquerda" onClick={() => set({ fixas: fixa ? estado.fixas.filter((x) => x !== c.chave) : [...estado.fixas, c.chave] })}><Pin className="h-3 w-3" /></Button>}
                <div className="flex w-12 justify-end">
                  {i > 0 && <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Subir ${c.rotulo}`} onClick={() => set({ ordem: moverColuna(lista.map((x) => x.chave), i, -1) })}><ArrowUp className="h-3 w-3" /></Button>}
                  {i < lista.length - 1 && <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Descer ${c.rotulo}`} onClick={() => set({ ordem: moverColuna(lista.map((x) => x.chave), i, 1) })}><ArrowDown className="h-3 w-3" /></Button>}
                </div>
              </div>
            );
          }}
          </ListaOrdenavel>
          {mudou && <div className="flex gap-1 border-t pt-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onEstado(padrao)}><RotateCcw className="h-3 w-3" /> Restaurar padrão</Button>
            {onSalvarPadrao && <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={onSalvarPadrao}>Salvar como padrão</Button>}
          </div>}
        </PopoverContent>
      </Popover>
      {Boolean(agruparOpcoes?.length) && onAgrupar && <Select value={agrupar || "_"} onValueChange={(v) => onAgrupar(v === "_" ? "" : v)}>
        <SelectTrigger className="h-7 w-auto text-xs" aria-label="Agrupar por"><SelectValue placeholder="Agrupar por" /></SelectTrigger>
        <SelectContent><SelectItem value="_">Sem agrupar</SelectItem>{(agruparOpcoes ?? []).map((c) => <SelectItem key={c.chave} value={c.chave}>Agrupar: {c.rotulo}</SelectItem>)}</SelectContent>
      </Select>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs">Exportar</Button></DropdownMenuTrigger>
        <DropdownMenuContent>{formatos.map((f) => <DropdownMenuItem key={f} onClick={() => onExportar(f)}>{f.toUpperCase()}</DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      {extras && <div className="ml-auto flex flex-wrap items-center gap-1">{extras}</div>}
    </div>
  );
}
