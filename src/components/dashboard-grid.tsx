import { useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  COLUNAS,
  MIN_H,
  MIN_W,
  moverBloco,
  ordemVisual,
  redimensionarBloco,
  type ItemGrade,
} from "@/lib/grid-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export const ALTURA_CELULA = 44;

/**
 * Grade arrastável e redimensionável, sem dependência externa.
 * Em telas estreitas vira coluna única, mantendo a ordem visual da grade.
 */
export function DashboardGrid<T>({
  itens,
  onChange,
  onCommit,
  renderItem,
  editavel = true,
}: {
  itens: ItemGrade<T>[];
  onChange?: (itens: ItemGrade<T>[]) => void;
  onCommit?: (itens: ItemGrade<T>[]) => void;
  renderItem: (item: ItemGrade<T>) => React.ReactNode;
  editavel?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(1200);
  const [arraste, setArraste] = useState<{ id: string; modo: "mover" | "tamanho" } | null>(null);
  const ehMobile = useIsMobile();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth || 1200));
    ro.observe(el);
    setLargura(el.clientWidth || 1200);
    return () => ro.disconnect();
  }, []);

  const larguraCelula = largura / COLUNAS;

  const iniciar = (
    e: React.PointerEvent,
    item: ItemGrade<T>,
    modo: "mover" | "tamanho",
  ) => {
    if (!editavel || ehMobile || !onChange) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setArraste({ id: item.id, modo });

    const inicioX = e.clientX;
    const inicioY = e.clientY;
    const base = { ...item.layout };
    let atual = itens;

    const mover = (ev: PointerEvent) => {
      const dx = Math.round((ev.clientX - inicioX) / larguraCelula);
      const dy = Math.round((ev.clientY - inicioY) / ALTURA_CELULA);
      atual =
        modo === "mover"
          ? moverBloco(itens, item.id, base.x + dx, base.y + dy)
          : redimensionarBloco(itens, item.id, base.w + dx, base.h + dy);
      onChange(atual);
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      setArraste(null);
      onChange(atual);
      onCommit?.(atual);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  };

  if (ehMobile) {
    return (
      <div className="space-y-3">
        {ordemVisual(itens).map((i) => (
          <div key={i.id}>{renderItem(i)}</div>
        ))}
      </div>
    );
  }

  const linhas = itens.reduce((m, i) => Math.max(m, i.layout.y + i.layout.h), 1);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: linhas * ALTURA_CELULA }}
    >
      {itens.map((i) => (
        <div
          key={i.id}
          className={cn(
            "absolute p-1.5 transition-[left,top,width,height] duration-100",
            arraste?.id === i.id && "z-20 opacity-90",
          )}
          style={{
            left: `${(i.layout.x / COLUNAS) * 100}%`,
            top: i.layout.y * ALTURA_CELULA,
            width: `${(i.layout.w / COLUNAS) * 100}%`,
            height: i.layout.h * ALTURA_CELULA,
          }}
        >
          <div className="relative h-full overflow-auto rounded-lg">
            {editavel && onChange && (
              <button
                type="button"
                aria-label="Mover widget"
                onPointerDown={(e) => iniciar(e, i, "mover")}
                className="absolute right-1 top-1 z-10 cursor-grab rounded-md bg-background/80 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}
            {renderItem(i)}
            {editavel && onChange && (
              <button
                type="button"
                aria-label="Redimensionar widget"
                onPointerDown={(e) => iniciar(e, i, "tamanho")}
                className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-se-resize rounded-tl-md border-b-2 border-r-2 border-muted-foreground/40"
                title={`Mínimo ${MIN_W}x${MIN_H}`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
