import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { Reveal } from "./motion";

const DEPOIMENTOS = [
  {
    texto:
      "Centralizamos WhatsApp e Instagram em um lugar só. O tempo de resposta caiu pela metade.",
    autor: "Camila Fischer",
    empresa: "Fischer Odontologia",
  },
  {
    texto:
      "O chatbot qualifica os leads antes de chegar no time comercial. Ganhamos horas por dia.",
    autor: "Rodrigo Menezes",
    empresa: "Majestic",
  },
  {
    texto:
      "Os disparos de campanha viraram nosso principal canal de recompra. Retorno claro no caixa.",
    autor: "Ana Zayn",
    empresa: "Zayn Group",
  },
  {
    texto:
      "Implantação rápida e suporte presente. A operação inteira migrou em menos de duas semanas.",
    autor: "Paulo Distri",
    empresa: "Distribox",
  },
];

const LOGOS = ["Fischer", "Majestic", "Zayn", "Distribox", "INTEP", "The First"];

export function Depoimentos() {
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setAtivo((i) => (i + 1) % DEPOIMENTOS.length), 5000);
    return () => clearInterval(t);
  }, [pausado]);

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Prova social
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Quem usa, recomenda
          </h2>
        </Reveal>

        {/* Carrossel de depoimentos */}
        <Reveal>
          <div
            className="relative rounded-2xl bg-landing-dark text-white p-8 md:p-12 overflow-hidden"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
          >
            <Quote className="h-10 w-10 text-landing-yellow/40 mb-6" />
            <div className="relative min-h-[132px] md:min-h-[110px]">
              {DEPOIMENTOS.map((d, i) => (
                <blockquote
                  key={d.autor}
                  className={`absolute inset-0 transition-all duration-500 ${
                    i === ativo
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-3 pointer-events-none"
                  }`}
                >
                  <p className="text-xl md:text-2xl leading-relaxed">{d.texto}</p>
                  <footer className="mt-5 text-sm text-white/60">
                    <span className="text-landing-yellow font-semibold">{d.autor}</span> ·{" "}
                    {d.empresa}
                  </footer>
                </blockquote>
              ))}
            </div>
            <div className="flex gap-2 mt-8">
              {DEPOIMENTOS.map((d, i) => (
                <button
                  key={d.autor}
                  type="button"
                  aria-label={`Ver depoimento de ${d.autor}`}
                  onClick={() => setAtivo(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === ativo ? "w-8 bg-landing-yellow" : "w-3 bg-white/25"
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>

        {/* Carrossel automático de logos */}
        <div className="mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex gap-12 w-max animate-[elora-marquee_28s_linear_infinite]">
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <span
                key={`${l}-${i}`}
                className="text-2xl font-bold text-landing-muted/50 whitespace-nowrap"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
