import { useState } from "react";
import t1 from "@/assets/tela-2026-05-30-14.18.48.png.asset.json";
import t2 from "@/assets/tela-2026-06-01-12.22.57.png.asset.json";
import t3 from "@/assets/tela-2026-06-01-21.31.34.png.asset.json";
import t4 from "@/assets/tela-2026-06-01-21.32.43.png.asset.json";
import t5 from "@/assets/tela-2026-06-01-22.38.01.png.asset.json";
import t6 from "@/assets/tela-2026-06-02-10.57.53.png.asset.json";
import t7 from "@/assets/tela-2026-06-02-20.16.10.png.asset.json";

const TELAS = [
  { url: t1.url, label: "Central de Atendimento", desc: "Todas as conversas em uma única caixa de entrada." },
  { url: t2.url, label: "CRM e Funil", desc: "Pipeline visual com etiquetas e estágios personalizáveis." },
  { url: t3.url, label: "Construtor de Chatbot", desc: "Crie fluxos sem código — qualifica e atende sozinho." },
  { url: t4.url, label: "Automação Visual", desc: "Conecte gatilhos, condições e ações com poucos cliques." },
  { url: t5.url, label: "Disparo de Campanhas", desc: "Marketing por WhatsApp com segmentação fina." },
  { url: t6.url, label: "Painel de Resultados", desc: "Indicadores em tempo real do seu atendimento." },
  { url: t7.url, label: "Agentes de IA", desc: "Assistentes treinados com sua base de conhecimento." },
];

export function SistemaTour() {
  const [ativo, setAtivo] = useState(0);
  const tela = TELAS[ativo];

  return (
    <section className="py-24 px-6 bg-white border-t border-landing-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
            Por dentro do sistema
          </span>
          <h2
            className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Veja como o Elora funciona
          </h2>
          <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
            Telas reais — clique nas abas para conhecer cada parte da plataforma.
          </p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TELAS.map((t, i) => {
              const sel = i === ativo;
              return (
                <button
                  key={i}
                  onClick={() => setAtivo(i)}
                  className={`text-left rounded-lg px-4 py-3 border transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${
                    sel
                      ? "border-landing-fg bg-landing-fg text-white"
                      : "border-landing-border bg-white text-landing-fg hover:border-landing-fg/40"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div
                    className={`text-xs mt-0.5 hidden lg:block ${sel ? "text-white/60" : "text-landing-muted"}`}
                  >
                    {t.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-landing-border bg-landing-surface p-3 md:p-4 shadow-lg">
            <div className="rounded-lg overflow-hidden bg-white border border-landing-border">
              <img
                src={tela.url}
                alt={tela.label}
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
            <div className="px-2 pt-3 pb-1 lg:hidden">
              <div className="text-sm font-semibold text-landing-fg">{tela.label}</div>
              <div className="text-xs text-landing-muted">{tela.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}