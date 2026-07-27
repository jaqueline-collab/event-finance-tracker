import { useState } from "react";
import { Lock } from "lucide-react";
import { Reveal } from "@/components/landing/motion";
import t1 from "@/assets/tela-2026-05-30-14.18.48.png.asset.json";
import t6 from "@/assets/tela-2026-06-02-10.57.53.png.asset.json";
import funil from "@/assets/funil_vendas.jpg.asset.json";
import sequencias from "@/assets/Sequencias_Edicao.jpg.asset.json";
import agendadas from "@/assets/Mensagens_agendadas.jpg.asset.json";
import classificacao from "@/assets/Grafico_ClassificacaoAtendimento.png.asset.json";

const TELAS = [
  {
    url: t1.url,
    label: "Central de Atendimento",
    desc: "Todas as conversas de WhatsApp, Instagram e Messenger em uma única caixa de entrada.",
    path: "atendimentos",
  },
  {
    url: funil.url,
    label: "CRM e Funil de Vendas",
    desc: "Pipeline visual com etapas, valores e etiquetas — do primeiro contato ao fechamento.",
    path: "crm/funil-comercial",
  },
  {
    url: sequencias.url,
    label: "Sequências e Follow-up",
    desc: "Cadências automáticas de mensagens com horários, métricas e chatbot integrado.",
    path: "apps/sequencias",
  },
  {
    url: agendadas.url,
    label: "Mensagens Agendadas",
    desc: "Programe envios por canal e por equipe, com status de entrega e leitura.",
    path: "apps/mensagens-agendadas",
  },
  {
    url: classificacao.url,
    label: "Relatórios",
    desc: "Classificação de atendimentos, motivos de perda e oportunidades geradas.",
    path: "relatorios/classificacao",
  },
  {
    url: t6.url,
    label: "Painel de Resultados",
    desc: "Indicadores em tempo real do seu atendimento e da sua operação.",
    path: "relatorios/painel",
  },
];

export function SistemaTour() {
  const [ativo, setAtivo] = useState(0);
  const tela = TELAS[ativo];

  return (
    <section id="produto" className="py-24 px-6 bg-white border-t border-landing-border">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-landing-blue">
              Produto em ação
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold text-landing-fg mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veja o Elora funcionando
            </h2>
            <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
              Telas reais da plataforma. Clique nas abas para conhecer cada parte do sistema.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          <Reveal>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {TELAS.map((t, i) => {
                const sel = i === ativo;
                return (
                  <button
                    key={t.label}
                    onClick={() => setAtivo(i)}
                    aria-pressed={sel}
                    className={`text-left rounded-lg px-4 py-3 border transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${
                      sel
                        ? "border-landing-fg bg-landing-fg text-white"
                        : "border-landing-border bg-white text-landing-fg hover:border-landing-fg/40"
                    }`}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div
                      className={`text-xs mt-0.5 hidden lg:block leading-relaxed ${
                        sel ? "text-white/60" : "text-landing-muted"
                      }`}
                    >
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={120}>
            {/* Mockup de navegador */}
            <div className="rounded-2xl border border-landing-border bg-landing-surface shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-11 bg-landing-dark">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="h-3 w-3 rounded-full bg-red-400/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <span className="h-3 w-3 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs text-white/70 truncate">
                  <Lock className="h-3 w-3 text-landing-yellow shrink-0" />
                  <span className="truncate">app.eloracrm.com.br/{tela.path}</span>
                </div>
              </div>
              <div className="bg-white">
                <img
                  key={tela.url}
                  src={tela.url}
                  alt={`Tela do Elora: ${tela.label}`}
                  className="w-full h-auto block animate-fade-in"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="px-1 pt-4 lg:hidden">
              <div className="text-sm font-semibold text-landing-fg">{tela.label}</div>
              <div className="text-xs text-landing-muted mt-0.5">{tela.desc}</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
