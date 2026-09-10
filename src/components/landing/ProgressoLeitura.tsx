import { useEffect, useState } from "react";

/** Barra fina no topo indicando o quanto do artigo já foi lido. */
export function ProgressoLeitura() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const atualizar = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setPct(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
    };
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      window.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, []);

  return (
    <div className="fixed top-16 inset-x-0 z-40 h-1 bg-transparent" aria-hidden>
      <div
        className="h-full bg-landing-yellow-vivo transition-[width] duration-150"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
