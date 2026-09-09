import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/lib/landing/faqs";

export function FaqLista({ itens, inicial = null }: { itens: FaqItem[]; inicial?: number | null }) {
  const [open, setOpen] = useState<number | null>(inicial);
  return (
    <div className="space-y-3">
      {itens.map((f, i) => {
        const aberto = open === i;
        return (
          <div
            key={f.q}
            className="rounded-xl border border-landing-border bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpen(aberto ? null : i)}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-landing-surface transition-colors"
            >
              <span className="font-medium text-landing-fg text-left">{f.q}</span>
              <ChevronDown
                className={`h-5 w-5 text-rabbit-navy shrink-0 transition-transform ${
                  aberto ? "rotate-180" : ""
                }`}
              />
            </button>
            {aberto && (
              <div className="px-5 pb-5 text-sm text-landing-muted leading-relaxed">{f.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
