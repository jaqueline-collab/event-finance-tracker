import { useState } from "react";
import { Lock } from "lucide-react";
import { Reveal } from "@/components/landing/motion";
import atendimento from "@/assets/Atendimento.png.asset.json";
import chatbot from "@/assets/Chatbot_IAs.png.asset.json";
import importar from "@/assets/Contatos_Importar.png.asset.json";
import funil from "@/assets/funil_vendas.jpg.asset.json";
import sequencias from "@/assets/Sequencias_Edicao.jpg.asset.json";
import agendadas from "@/assets/Mensagens_agendadas.jpg.asset.json";
import classificacao from "@/assets/Grafico_ClassificacaoAtendimento.png.asset.json";
import mockupIphone from "@/assets/mockup_iphone16pro_01_1.png.asset.json";

const TELAS = [
  {
    url: atendimento.url,
    label: "Central de Atendimento",
    desc: "Conversas unificadas do WhatsApp, Instagram e Messenger com histórico, anexos e ações rápidas.",
    path: "atendimentos",
  },
  {
    url: chatbot.url,
    label: "Agentes de IA",
    desc: "Agentes e supervisores de IA que agendam, qualificam e escalam atendimentos automaticamente.",
    path: "apps/agentes-ia",
  },
  {
    url: importar.url,
    label: "Importação de Contatos",
    desc: "Importe contatos do Excel, CSV, Google Sheets ou vCard em poucos cliques.",
    path: "contatos/importar",
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
];

export function SistemaTour() {
  const [ativo, setAtivo] = useState(0);
  const tela = TELAS[ativo];

  return (
    <section
      id="produto"
      className="py-16 md:py-24 px-4 sm:px-6 bg-white border-t border-landing-border overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-8 md:mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-rabbit-navy">
              Produto em ação
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-landing-fg mt-2 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veja o Elora funcionando
            </h2>
            <p className="text-sm sm:text-base text-landing-muted mt-3 max-w-2xl mx-auto">
              Telas reais da plataforma. Toque nas abas para conhecer cada parte do sistema.
            </p>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-[280px_1fr] gap-5 lg:gap-6 items-start">
          <Reveal>
            {/* No celular vira um carrossel de abas curtas; no desktop, lista com descrição */}
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TELAS.map((t, i) => {
                const sel = i === ativo;
                return (
                  <button
                    key={t.label}
                    onClick={() => setAtivo(i)}
                    aria-pressed={sel}
                    className={`text-left rounded-full lg:rounded-lg px-4 py-2 lg:py-3 border transition-all whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink-0 snap-start ${
                      sel
                        ? "border-rabbit-navy bg-rabbit-navy text-white"
                        : "border-landing-border bg-white text-landing-fg hover:border-rabbit-navy/40"
                    }`}
                  >
                    <div className="text-[13px] sm:text-sm font-semibold">{t.label}</div>
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
            {/* Mockup de navegador — moldura só a partir do desktop */}
            <div className="rounded-xl md:rounded-2xl border border-landing-border bg-landing-surface shadow-lg md:shadow-2xl overflow-hidden">
              <div className="hidden md:flex items-center gap-3 px-4 h-11 bg-landing-dark">
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
              <div className="bg-white relative">
                <img
                  key={tela.url}
                  src={tela.url}
                  alt={`Tela do Elora: ${tela.label}`}
                  className="w-full h-auto block animate-fade-in"
                  loading="lazy"
                />
                {ativo === 0 && (
                  <img
                    src={mockupIphone.url}
                    alt="App EloraCRM no celular"
                    className="hidden md:block absolute -bottom-6 right-4 w-28 lg:w-32 h-auto drop-shadow-2xl animate-fade-in"
                    loading="lazy"
                  />
                )}
              </div>
            </div>
            <div className="px-1 pt-4 lg:hidden">
              <div className="text-sm font-semibold text-landing-fg">{tela.label}</div>
              <div className="text-xs text-landing-muted mt-1 leading-relaxed">{tela.desc}</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
