import type { ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Lista vertical reordenável por arrastar (alça ⋮⋮); as setas de cada linha seguem como alternativa de teclado. */
export function ListaOrdenavel({ ids, onMover, children }: { ids: string[]; onMover: (de: number, para: number) => void; children: (id: string, i: number, alca: ReactNode) => ReactNode }) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const soltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMover(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id, i) => <Linha key={id} id={id}>{(alca) => children(id, i, alca)}</Linha>)}
      </SortableContext>
    </DndContext>
  );
}

function Linha({ id, children }: { id: string; children: (alca: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const alca = (
    <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded p-0.5 text-muted-foreground active:cursor-grabbing" aria-label="Arrastar para reordenar">
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );
  return <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "relative z-10 opacity-70" : undefined}>{children(alca)}</div>;
}

/** Move um item de posição (mesma regra para arrastar e setas). */
export function moverPara<T>(l: T[], de: number, para: number): T[] {
  if (de < 0 || para < 0 || de === para || de >= l.length || para >= l.length) return l;
  const n = [...l];
  const [x] = n.splice(de, 1);
  n.splice(para, 0, x);
  return n;
}
