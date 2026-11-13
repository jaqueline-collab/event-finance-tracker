import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { definirModoEditar } from "@/lib/modo-editar";
import { Copy, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listarVisoesCliente, salvarVisoesCliente } from "@/lib/dashboard-visoes.functions";
import { mostrarBarraDeAbas, moverVisao, proximoNomeVisao, type Visao } from "@/lib/dashboard-visoes";

type VisaoEdit = Visao & { novaDe?: string | null };

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const ehNova = (id: string) => id.startsWith("nova-");

/**
 * Abas (visões) do painel do cliente. Quem não é super admin vê só as
 * visões publicadas, sem controle nenhum. O super admin tem o modo Editar.
 */
/** Visão fixa do sistema (não salva, não editável). */
export const VISAO_MATRIZ = "__matriz";

export type EstadoVisoes = {
  podeEditar: boolean;
  editando: boolean;
  alterado: boolean;
  salvando: boolean;
  /** A visão ativa aceita gráficos (salva e não é a fixa). */
  aceitaGraficos: boolean;
  /** Nome da visão ativa (título do cabeçalho). */
  nomeAtiva: string | null;
  /** Gráficos antigos salvos na visão ativa. */
  graficosAtiva: number;
};

export type VisoesPainelHandle = {
  entrar: () => Promise<void>;
  salvar: () => Promise<void>;
  cancelar: () => Promise<void>;
};

export const VisoesPainel = forwardRef<VisoesPainelHandle, {
  clienteId: string;
  iniciarNaMatriz?: boolean;
  /** Visão fixa "Matriz" (recebe o modo Editar). */
  matriz?: (editando: boolean) => ReactNode;
  onEstado?: (e: EstadoVisoes) => void;
  /** Conteúdo da visão ativa (null = visão padrão). */
  children: (
    visaoId: string | null,
    chave: number,
    ctx: { editando: boolean; podeEditar: boolean; totalGraficos: number; ocultos: string[]; filtrosPadrao: import("@/lib/campos-elora").FiltroCampo[]; cartoes: import("@/lib/graficos").CartaoGrafico[]; outrasVisoes: { id: string; nome: string }[]; alternarOculto: (id: string) => void },
  ) => ReactNode;
  /** Construtor de gráficos da visão ativa, mostrado só em modo Editar. */
  editorGraficos?: (visaoId: string, aoMudar: () => void) => ReactNode;
}>(function VisoesPainel({ clienteId, children, editorGraficos, iniciarNaMatriz, matriz, onEstado }, ref) {
  const [salvas, setSalvas] = useState<Visao[] | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<VisaoEdit[]>([]);
  const [ativa, setAtiva] = useState<string | null>(iniciarNaMatriz ? VISAO_MATRIZ : null);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<VisaoEdit | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [chave, setChave] = useState(0);

  const carregar = useCallback(
    async (comRascunhos: boolean) => {
      try {
        const r = await listarVisoesCliente({ data: { clienteId, incluirRascunhos: comRascunhos } });
        setSalvas(r.visoes);
        setPodeEditar(r.podeEditar);
        setAtiva((a) => (a === VISAO_MATRIZ || (a && r.visoes.some((v) => v.id === a)) ? a : (r.visoes[0]?.id ?? null)));
        return r.visoes;
      } catch (e) {
        toast.error(msg(e));
        setSalvas([]);
        return [];
      }
    },
    [clienteId],
  );

  useEffect(() => {
    void carregar(false);
  }, [carregar]);

  // Assistente de configuração: só aparece com super admin em modo Editar (o servidor revalida).
  useEffect(() => {
    definirModoEditar(editando && podeEditar ? { clienteId, visaoId: ativa && ativa !== VISAO_MATRIZ ? ativa : null } : null);
  }, [editando, podeEditar, clienteId, ativa]);
  useEffect(() => () => definirModoEditar(null), []);
  useEffect(() => {
    const f = () => { void carregar(editando).then(() => setChave((c) => c + 1)); };
    window.addEventListener("elora-config-aplicada", f);
    return () => window.removeEventListener("elora-config-aplicada", f);
  }, [carregar, editando]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const entrarEdicao = async () => {
    const todas = await carregar(true);
    setRascunho(todas.map((v) => ({ ...v })));
    setEditando(true);
  };

  const cancelar = async () => {
    setEditando(false);
    setRenomeando(null);
    await carregar(false);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await salvarVisoesCliente({
        data: {
          clienteId,
          visoes: rascunho.map((v, i) => ({
            id: v.id,
            nome: v.nome.trim() || "Sem nome",
            ordem: i,
            publicada: v.publicada,
            novaDe: v.novaDe ?? null,
            ocultos: v.ocultos ?? [],
          })),
        },
      });
      setRascunho(r.visoes.map((v) => ({ ...v })));
      setSalvas(r.visoes);
      setAtiva((a) => (a === VISAO_MATRIZ || (a && r.visoes.some((v) => v.id === a)) ? a : (r.visoes[0]?.id ?? null)));
      setEditando(false);
      setRenomeando(null);
      setChave((c) => c + 1);
      toast.success("Visões salvas.");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setSalvando(false);
    }
  };

  useImperativeHandle(ref, () => ({ entrar: entrarEdicao, salvar, cancelar: async () => { await cancelar(); setChave((c) => c + 1); } }));

  const alterar = (id: string, patch: Partial<VisaoEdit>) =>
    setRascunho((l) => l.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const nova = (base?: VisaoEdit) => {
    if (rascunho.length >= 30) {
      toast.error("Limite de 30 visões.");
      return;
    }
    const id = `nova-${Math.random().toString(36).slice(2, 10)}`;
    const nome = base ? `${base.nome} (cópia)` : proximoNomeVisao(rascunho.map((v) => v.nome));
    setRascunho((l) => [
      ...l,
      {
        id,
        nome,
        ordem: l.length,
        publicada: false,
        totalGraficos: base?.totalGraficos ?? 0,
        novaDe: base && !ehNova(base.id) ? base.id : null,
      },
    ]);
    setAtiva(id);
    if (!base) setRenomeando(id);
  };

  const aoArrastar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const de = rascunho.findIndex((v) => v.id === e.active.id);
    const alvo = e.over.id;
    const para = rascunho.findIndex((v) => v.id === alvo);
    setRascunho((l) => moverVisao(l, de, para));
  };

  const lista: VisaoEdit[] = editando ? rascunho : (salvas ?? []);
  const alteradoNaoSalvo =
    editando &&
    salvas !== null &&
    JSON.stringify(rascunho.map((v) => [v.id, v.nome, v.publicada, [...(v.ocultos ?? [])].sort()])) !==
      JSON.stringify(salvas.slice().sort((a, b) => a.ordem - b.ordem).map((v) => [v.id, v.nome, v.publicada, [...(v.ocultos ?? [])].sort()]));
  const naMatriz = ativa === VISAO_MATRIZ && Boolean(matriz);
  const ativaEdit = naMatriz ? null : (lista.find((v) => v.id === ativa) ?? null);
  const visaoParaConteudo = ativaEdit && !ehNova(ativaEdit.id) ? ativaEdit.id : salvas?.[0]?.id ?? null;
  const aceitaGraficos = !naMatriz && Boolean(ativaEdit && !ehNova(ativaEdit.id));
  const visaoConteudo = lista.find((v) => v.id === visaoParaConteudo) ?? null;
  const graficosAtiva = visaoConteudo?.totalGraficos ?? 0;
  const ctx = {
    editando,
    podeEditar,
    totalGraficos: graficosAtiva,
    ocultos: visaoConteudo?.ocultos ?? [],
    filtrosPadrao: visaoConteudo?.filtrosPadrao ?? [],
    cartoes: visaoConteudo?.cartoes ?? [],
    outrasVisoes: lista.filter((v) => v.id !== visaoConteudo?.id && !ehNova(v.id)).map((v) => ({ id: v.id, nome: v.nome })),
    alternarOculto: (id: string) => {
      if (!editando || !visaoConteudo) return;
      const atual = visaoConteudo.ocultos ?? [];
      alterar(visaoConteudo.id, { ocultos: atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id] });
    },
  };

  useEffect(() => {
    onEstado?.({ podeEditar, editando, alterado: alteradoNaoSalvo, salvando, aceitaGraficos, nomeAtiva: naMatriz ? "Matriz" : (ativaEdit?.nome ?? null), graficosAtiva: naMatriz ? 0 : graficosAtiva });
  }, [onEstado, podeEditar, editando, alteradoNaoSalvo, salvando, aceitaGraficos, naMatriz, ativaEdit?.nome, graficosAtiva]);

  if (salvas === null) return <Skeleton className="h-64 w-full rounded-xl" />;
  const mostrarAbas = mostrarBarraDeAbas(lista.length, editando) || Boolean(matriz);

  return (
    <div className="space-y-4">
      {mostrarAbas && (
        <div className="flex flex-wrap items-center gap-2 border-b">
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
            <SortableContext items={lista.map((v) => v.id)} strategy={horizontalListSortingStrategy}>
              <div className="-mb-px flex flex-wrap items-center gap-1" role="tablist" aria-label="Visões">
                {lista.map((v) => (
                  <AbaVisao
                    key={v.id}
                    visao={v}
                    ativa={v.id === ativa}
                    editando={editando}
                    renomeando={renomeando === v.id}
                    onSelecionar={() => setAtiva(v.id)}
                    onRenomear={() => editando && setRenomeando(v.id)}
                    onNome={(nome) => alterar(v.id, { nome })}
                    onFimRenomear={() => setRenomeando(null)}
                    onDuplicar={() => nova(v)}
                    onExcluir={() => setExcluindo(v)}
                  />
                ))}
                {matriz && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={naMatriz}
                    onClick={() => setAtiva(VISAO_MATRIZ)}
                    className={`border-b-2 px-4 py-2.5 text-sm transition-colors ${naMatriz ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    Matriz
                  </button>
                )}

              </div>
            </SortableContext>
          </DndContext>
          {editando && (
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => nova()}>
              <Plus className="mr-1 h-4 w-4" /> Nova visão
            </Button>
          )}
        </div>
      )}

      {editando && ativaEdit && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={ativaEdit.publicada} onCheckedChange={(v) => alterar(ativaEdit.id, { publicada: v })} />
            Visível ao cliente
          </label>
          <span className="text-xs text-muted-foreground">
            Duplo clique no nome para renomear. Arraste as abas para reordenar.
          </span>
        </div>
      )}

      {naMatriz ? (
        matriz?.(editando)
      ) : editando && ativaEdit && ehNova(ativaEdit.id) ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Salve para começar a montar os gráficos desta visão.
        </p>
      ) : (
        editando && visaoParaConteudo && editorGraficos
          ? editorGraficos(visaoParaConteudo, () => setChave((c) => c + 1))
          : children(visaoParaConteudo, chave, ctx)
      )}

      <AlertDialog open={excluindo !== null} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a visão "{excluindo?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {excluindo?.totalGraficos
                ? `Os ${excluindo.totalGraficos} gráfico(s) desta visão também serão apagados ao salvar.`
                : "Esta visão não tem gráficos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!excluindo) return;
                if (rascunho.length <= 1) {
                  toast.error("O painel precisa de pelo menos uma visão.");
                  return;
                }
                setRascunho((l) => moverVisao(l.filter((v) => v.id !== excluindo.id), 0, 0));
                if (ativa === excluindo.id) setAtiva(rascunho.find((v) => v.id !== excluindo.id)?.id ?? null);
                setExcluindo(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

function AbaVisao({
  visao,
  ativa,
  editando,
  renomeando,
  onSelecionar,
  onRenomear,
  onNome,
  onFimRenomear,
  onDuplicar,
  onExcluir,
}: {
  visao: VisaoEdit;
  ativa: boolean;
  editando: boolean;
  renomeando: boolean;
  onSelecionar: () => void;
  onRenomear: () => void;
  onNome: (n: string) => void;
  onFimRenomear: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: visao.id, disabled: !editando });
  const estilo = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`flex items-center gap-1 border-b-2 px-1 text-sm transition-colors ${ativa ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {editando && (
        <span {...attributes} {...listeners} className="cursor-grab px-1 opacity-60" aria-label="Arrastar">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      )}
      {renomeando ? (
        <Input
          autoFocus
          maxLength={60}
          value={visao.nome}
          className="h-7 w-36 text-foreground"
          onChange={(e) => onNome(e.target.value)}
          onBlur={onFimRenomear}
          onKeyDown={(e) => e.key === "Enter" && onFimRenomear()}
        />
      ) : (
        <button type="button" role="tab" aria-selected={ativa} onClick={onSelecionar} onDoubleClick={onRenomear} className="px-3 py-2.5">
          {visao.nome}
        </button>
      )}
      {editando && !visao.publicada && (
        <Badge variant="secondary" className="text-[10px]">Rascunho</Badge>
      )}
      {editando && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full p-1 opacity-70 hover:opacity-100" aria-label="Opções da visão">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRenomear}><Pencil className="mr-2 h-4 w-4" /> Renomear</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicar}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={onExcluir} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
