import { useEffect, useRef, useState, type ReactNode } from "react";

/** Observa o elemento e retorna true quando ele entra na viewport (uma vez). */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visivel };
}

/** Fade + slide sutil ao entrar na tela. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visivel } = useInView<HTMLDivElement>(0.15);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        visivel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Contador animado disparado ao entrar na tela. */
export function CountUp({
  to,
  duration = 1600,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const { ref, visivel } = useInView<HTMLSpanElement>(0.4);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!visivel) return;
    let raf = 0;
    const inicio = performance.now();
    const tick = (agora: number) => {
      const p = Math.min((agora - inicio) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValor(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visivel, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {valor.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Efeito máquina de escrever alternando entre frases. */
export function Typewriter({
  frases,
  className = "",
  velocidade = 65,
  pausa = 1800,
}: {
  frases: string[];
  className?: string;
  velocidade?: number;
  pausa?: number;
}) {
  const [indice, setIndice] = useState(0);
  const [texto, setTexto] = useState("");
  const [apagando, setApagando] = useState(false);

  useEffect(() => {
    const alvo = frases[indice % frases.length];
    if (!apagando && texto === alvo) {
      const t = setTimeout(() => setApagando(true), pausa);
      return () => clearTimeout(t);
    }
    if (apagando && texto === "") {
      setApagando(false);
      setIndice((i) => (i + 1) % frases.length);
      return;
    }
    const t = setTimeout(
      () =>
        setTexto((atual) =>
          apagando ? alvo.slice(0, atual.length - 1) : alvo.slice(0, atual.length + 1),
        ),
      apagando ? velocidade / 2 : velocidade,
    );
    return () => clearTimeout(t);
  }, [texto, apagando, indice, frases, velocidade, pausa]);

  return (
    <span className={className}>
      {texto}
      <span className="inline-block w-[2px] h-[0.9em] align-[-0.05em] ml-1 bg-current animate-pulse" />
    </span>
  );
}
