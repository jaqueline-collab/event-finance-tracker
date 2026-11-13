import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { lerCatalogoFiltro } from "@/lib/campos-elora.functions";
import { avisoLigacao, descreverFiltro, OPERADORES, type CampoCatalogo, type FiltroCampo, type FonteCampo, type GrupoCatalogo, type OperadorFiltro } from "@/lib/campos-elora";

const ROT_OP: Record<OperadorFiltro, string> = {
  em: "é um destes", contem: "contém", maior: "maior que", menor: "menor que", entre: "entre", periodo: "no período", vazio: "está vazio", preenchido: "está preenchido",
};
const chave = (f: { fonte: string; campo: string }) => `${f.fonte}|${f.campo}`;

/** Catálogo por cliente, lido uma vez por tela. */
const cacheCat = new Map<string, Promise<GrupoCatalogo[]>>();
function useCatalogo(clienteId: string) {
  const [g, setG] = useState<GrupoCatalogo[] | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!cacheCat.has(clienteId)) cacheCat.set(clienteId, lerCatalogoFiltro({ data: { clienteId } }).then((r) => r.grupos).catch(() => (cacheCat.delete(clienteId), [])));
    cacheCat.get(clienteId)!.then((x) => vivo && setG(x));
    return () => {
      vivo = false;
    };
  }, [clienteId]);
  return g;
}

/**
 * Botão único "+ Filtro" + chips removíveis. Canal, atendente, equipe etc. são filtros comuns daqui.
 * `opcoesNativas` substitui as opções de campos que a visão calcula direto (ex.: origem já rotulada).
 */
export function FiltroCampos({
  clienteId, filtros, onFiltros, fonteDaVisao, opcoesNativas = {}, extra,
}: {
  clienteId: string;
  filtros: FiltroCampo[];
  onFiltros: (f: FiltroCampo[]) => void;
  fonteDaVisao: FonteCampo | "varias";
  opcoesNativas?: Record<string, string[]>;
  extra?: ReactNode;
}) {
  const catalogo = useCatalogo(clienteId);
  const [aberto, setAberto] = useState(false);
  const [campo, setCampo] = useState<CampoCatalogo | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const todos = (catalogo ?? []).flatMap((g) => g.campos);
  const achar = (f: FiltroCampo) => todos.find((c) => chave(c) === chave(f));
  const rotulo = (f: FiltroCampo) => achar(f)?.rotulo ?? f.campo.replace(/^campo\./, "");
  const opcoes = (c: CampoCatalogo) => opcoesNativas[chave(c)] ?? c.opcoes ?? [];

  const aplicar = (f: FiltroCampo) => {
    const l = [...filtros];
    if (editIdx != null) l[editIdx] = f;
    else l.push(f);
    onFiltros(l);
    setAberto(false);
    setCampo(null);
    setEditIdx(null);
  };
  const avisos = [...new Set(filtros.map((f) => avisoLigacao(f, fonteDaVisao)).filter(Boolean))] as string[];

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {filtros.map((f, i) => (
          <span key={i} className="inline-flex h-8 max-w-full items-center rounded-full bg-secondary text-sm text-secondary-foreground ring-1 ring-border">
            <button
              type="button"
              className="truncate pl-3.5 pr-1.5 font-medium"
              onClick={() => {
                const c = achar(f);
                if (!c) return;
                setCampo(c);
                setEditIdx(i);
                setAberto(true);
              }}
            >
              {descreverFiltro(f, rotulo(f))}
            </button>
            <button type="button" aria-label={`Remover filtro ${rotulo(f)}`} className="mr-1 rounded-full p-1 hover:bg-background/60" onClick={() => onFiltros(filtros.filter((_, j) => j !== i))}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <Popover
          open={aberto}
          onOpenChange={(o) => {
            setAberto(o);
            if (!o) (setCampo(null), setEditIdx(null));
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-full border-input text-foreground" disabled={!catalogo}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Filtro
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
            {!campo ? (
              <Command>
                <CommandInput placeholder="Filtrar por qual campo?" />
                <CommandList className="max-h-80">
                  <CommandEmpty>Nenhum campo.</CommandEmpty>
                  {(catalogo ?? []).map((g) => (
                    <CommandGroup key={g.fonte} heading={g.nome}>
                      {g.campos.map((c) => (
                        <CommandItem key={chave(c)} value={`${g.nome} ${c.rotulo} ${chave(c)}`} onSelect={() => setCampo(c)}>
                          {c.rotulo}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            ) : (
              <EditorFiltro
                campo={campo}
                opcoes={opcoes(campo)}
                inicial={editIdx != null ? filtros[editIdx] : null}
                aviso={avisoLigacao(campo, fonteDaVisao)}
                onVoltar={() => (editIdx == null ? setCampo(null) : setAberto(false))}
                onAplicar={aplicar}
              />
            )}
          </PopoverContent>
        </Popover>
        {filtros.length > 0 && (
          <Button variant="ghost" size="sm" className="h-8 rounded-full" onClick={() => onFiltros([])}>
            Limpar filtros
          </Button>
        )}
        {extra}
      </div>
      {avisos.map((a) => (
        <p key={a} className="text-xs text-muted-foreground">{a}</p>
      ))}
    </div>
  );
}

function EditorFiltro({ campo, opcoes, inicial, aviso, onVoltar, onAplicar }: {
  campo: CampoCatalogo; opcoes: string[]; inicial: FiltroCampo | null; aviso: string | null; onVoltar: () => void; onAplicar: (f: FiltroCampo) => void;
}) {
  const ops = OPERADORES[campo.tipo];
  const [op, setOp] = useState<OperadorFiltro>(inicial?.op ?? ops[0]);
  const [valores, setValores] = useState<string[]>(inicial?.valores ?? []);
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [min, setMin] = useState(inicial?.min != null ? String(inicial.min) : "");
  const [max, setMax] = useState(inicial?.max != null ? String(inicial.max) : "");
  const [de, setDe] = useState(inicial?.de ?? "");
  const [ate, setAte] = useState(inicial?.ate ?? "");
  const n = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s.replace(",", "."))) ? undefined : Number(s.replace(",", ".")));
  const montar = (): FiltroCampo => {
    const b = { fonte: campo.fonte, campo: campo.campo, op };
    if (op === "em") return { ...b, valores };
    if (op === "contem") return { ...b, texto: texto.trim() };
    if (op === "maior") return { ...b, min: n(min) };
    if (op === "menor") return { ...b, max: n(max) };
    if (op === "entre") return { ...b, min: n(min), max: n(max) };
    if (op === "periodo") return { ...b, de: de || undefined, ate: ate || undefined };
    return b;
  };
  const valido =
    op === "vazio" || op === "preenchido" || (op === "em" && valores.length > 0) || (op === "contem" && texto.trim() !== "") ||
    (op === "maior" && n(min) != null) || (op === "menor" && n(max) != null) || (op === "entre" && (n(min) != null || n(max) != null)) || (op === "periodo" && (de || ate));

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onVoltar} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="truncate text-sm font-medium">{campo.rotulo}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ops.map((o) => (
          <button key={o} type="button" onClick={() => setOp(o)} className={`rounded-full border px-2.5 py-1 text-xs ${op === o ? "border-foreground text-foreground" : "text-muted-foreground"}`}>
            {ROT_OP[o]}
          </button>
        ))}
      </div>
      {op === "em" && (
        <Command className="rounded-md border">
          {opcoes.length > 8 && <CommandInput placeholder="Buscar opção…" />}
          <CommandList className="max-h-52">
            <CommandEmpty>Nenhuma opção.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => {
                const sel = valores.includes(o);
                return (
                  <CommandItem key={o} value={o} onSelect={() => setValores((v) => (sel ? v.filter((x) => x !== o) : [...v, o]))}>
                    <Check className={`mr-2 h-4 w-4 ${sel ? "opacity-100" : "opacity-0"}`} /> {o}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
      {op === "contem" && <Input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Texto" className="h-9" />}
      {(op === "maior" || op === "entre") && <Input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder={op === "entre" ? "De" : "Valor"} className="h-9" />}
      {(op === "menor" || op === "entre") && <Input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder={op === "entre" ? "Até" : "Valor"} className="h-9" />}
      {op === "periodo" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="h-9" aria-label="De" />
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="h-9" aria-label="Até" />
        </div>
      )}
      {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}
      <Button className="w-full" size="sm" disabled={!valido} onClick={() => onAplicar(montar())}>
        Aplicar
      </Button>
    </div>
  );
}
