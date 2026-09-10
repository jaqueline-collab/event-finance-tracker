import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/landing/faqs";

/** Remove acentos e caixa para comparar textos digitados na busca. */
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function Destaque({ texto, termo }: { texto: string; termo?: string }) {
  const alvo = (termo ?? "").trim();
  if (!alvo) return <>{texto}</>;

  const base = normalizar(texto);
  const busca = normalizar(alvo);
  const partes: Array<{ txt: string; hit: boolean }> = [];
  let i = 0;
  let idx = base.indexOf(busca);
  while (idx !== -1 && busca.length > 0) {
    if (idx > i) partes.push({ txt: texto.slice(i, idx), hit: false });
    partes.push({ txt: texto.slice(idx, idx + busca.length), hit: true });
    i = idx + busca.length;
    idx = base.indexOf(busca, i);
  }
  partes.push({ txt: texto.slice(i), hit: false });

  return (
    <>
      {partes.map((p, k) =>
        p.hit ? (
          <mark key={k} className="bg-landing-yellow-vivo/60 text-landing-fg rounded px-0.5">
            {p.txt}
          </mark>
        ) : (
          <span key={k}>{p.txt}</span>
        ),
      )}
    </>
  );
}

export function FaqLista({
  itens,
  inicial = null,
  termo,
}: {
  itens: FaqItem[];
  inicial?: number | null;
  termo?: string;
}) {
  const buscando = Boolean(termo && termo.trim());
  const [open, setOpen] = useState<number | null>(inicial);

  useEffect(() => {
    if (buscando) setOpen(0);
  }, [buscando, termo]);

  return (
    <div className="space-y-3">
      {itens.map((f, i) => {
        const aberto = buscando || open === i;
        return (
          <div
            key={f.q}
            className="rounded-xl border border-landing-border bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-landing-surface transition-colors"
            >
              <span className="font-medium text-landing-fg text-left">
                <Destaque texto={f.q} termo={termo} />
              </span>
              <ChevronDown
                className={`h-5 w-5 text-rabbit-navy shrink-0 transition-transform ${
                  aberto ? "rotate-180" : ""
                }`}
              />
            </button>
            {aberto && (
              <div className="px-5 pb-5 text-sm text-landing-muted leading-relaxed">
                <Destaque texto={f.a} termo={termo} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
