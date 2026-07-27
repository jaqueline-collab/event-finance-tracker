import { MessageCircle, Users, Timer, TrendingUp } from "lucide-react";
import { CountUp, Reveal } from "./motion";

const CARDS = [
  { icon: MessageCircle, label: "Conversas hoje", to: 12480, suffix: "" },
  { icon: Users, label: "Leads qualificados", to: 1937, suffix: "" },
  { icon: Timer, label: "Tempo médio de resposta", to: 42, suffix: "s" },
  { icon: TrendingUp, label: "Taxa de conversão", to: 27.4, suffix: "%", decimals: 1 },
];

const BARRAS = [38, 52, 44, 71, 63, 88, 96];
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function LiveDashboard() {
  return (
    <section className="py-20 px-6 bg-landing-dark text-white">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-yellow">
            Painel ao vivo
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sua operação em tempo real
          </h2>
          <p className="text-white/60 mt-3 max-w-2xl mx-auto">
            Exemplo de como os indicadores aparecem no dia a dia dentro do EloraCRM.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.label} delay={i * 90}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-full backdrop-blur-sm hover:border-landing-yellow/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-landing-yellow/15 text-landing-yellow flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5" />
                </div>
                <div
                  className="text-3xl font-bold text-landing-yellow"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <CountUp to={c.to} suffix={c.suffix} decimals={c.decimals ?? 0} />
                </div>
                <div className="text-sm text-white/60 mt-1">{c.label}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-white/80">
                Atendimentos por dia
              </span>
              <span className="inline-flex items-center gap-2 text-xs text-white/50">
                <span className="h-2 w-2 rounded-full bg-landing-yellow animate-pulse" />
                atualizando
              </span>
            </div>
            <div className="flex items-end gap-3 h-40">
              {BARRAS.map((h, i) => (
                <BarraAnimada key={i} altura={h} label={DIAS[i]} delay={i * 110} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function BarraAnimada({
  altura,
  label,
  delay,
}: {
  altura: number;
  label: string;
  delay: number;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
      <Reveal delay={delay} className="w-full flex justify-center">
        <div
          className="w-full rounded-t-md bg-gradient-to-t from-landing-blue to-landing-yellow transition-[height] duration-700"
          style={{ height: `${altura * 1.2}px` }}
        />
      </Reveal>
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  );
}
