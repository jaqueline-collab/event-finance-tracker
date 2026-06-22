import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus, Sparkles, Crown } from "lucide-react";
import {
  ADICIONAIS_VITRINE,
  PLANOS_VITRINE,
  planoVitrine,
  type PlanoVitrineKey,
} from "@/lib/landing/precos-vitrine";
import { formatBRL } from "@/lib/calc/format";

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  hint,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-landing-fg">{label}</div>
        {hint && <div className="text-xs text-landing-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-8 w-8 rounded-md border border-landing-border bg-white text-landing-fg hover:bg-landing-surface flex items-center justify-center"
          aria-label="Diminuir"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center font-semibold text-landing-fg tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-8 w-8 rounded-md border border-landing-border bg-white text-landing-fg hover:bg-landing-surface flex items-center justify-center"
          aria-label="Aumentar"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Simulador() {
  const [usuarios, setUsuarios] = useState(3);
  const [whatsOficial, setWhatsOficial] = useState(0);
  const [whatsNaoOficial, setWhatsNaoOficial] = useState(1);
  const [instagram, setInstagram] = useState(0);
  const [messenger, setMessenger] = useState(0);
  const [modIA, setModIA] = useState(false);
  const [modAsaas, setModAsaas] = useState(false);
  const [modTranscricao, setModTranscricao] = useState(false);
  const [modTempoSeguranca, setModTempoSeguranca] = useState(false);
  const [modMensagensAgendadas, setModMensagensAgendadas] = useState(false);
  const [planoManual, setPlanoManual] = useState<PlanoVitrineKey | null>(null);

  // Recomenda o melhor plano com base no que o usuário preencheu.
  const recomendado = useMemo<PlanoVitrineKey>(() => {
    const canais = whatsOficial + whatsNaoOficial + instagram + messenger;
    const usaInstaOuMsg = instagram > 0 || messenger > 0;
    if (usuarios > 5 || canais > 2 || (instagram > 0 && messenger > 0)) {
      return "corporativo";
    }
    if (usuarios > 3 || usaInstaOuMsg || modIA || canais > 1) {
      return "escala";
    }
    return "essencial";
  }, [usuarios, whatsOficial, whatsNaoOficial, instagram, messenger, modIA]);

  // Limpa a escolha manual quando a recomendação muda — volta a "automático".
  useEffect(() => {
    setPlanoManual(null);
  }, [recomendado]);

  const planoKey = planoManual ?? recomendado;
  const plano = planoVitrine(planoKey);
  const usuariosExtras = Math.max(0, usuarios - plano.usuariosInclusos);

  const breakdown = useMemo(() => {
    const linhas: { label: string; qtd?: number; unit?: number; total: number }[] = [];
    linhas.push({ label: `Plano ${plano.nome}`, total: plano.mensal });
    if (usuariosExtras > 0)
      linhas.push({
        label: "Usuários adicionais",
        qtd: usuariosExtras,
        unit: ADICIONAIS_VITRINE.usuarioExtra,
        total: usuariosExtras * ADICIONAIS_VITRINE.usuarioExtra,
      });
    if (whatsOficial > 0)
      linhas.push({
        label: "WhatsApp Oficial (API Meta)",
        qtd: whatsOficial,
        unit: ADICIONAIS_VITRINE.whatsOficial,
        total: whatsOficial * ADICIONAIS_VITRINE.whatsOficial,
      });
    if (whatsNaoOficial > 0) {
      linhas.push({
        label: "WhatsApp Não-Oficial",
        qtd: whatsNaoOficial,
        unit: ADICIONAIS_VITRINE.whatsNaoOficial,
        total: whatsNaoOficial * ADICIONAIS_VITRINE.whatsNaoOficial,
      });
      linhas.push({
        label: "Z-API (não-oficial)",
        qtd: whatsNaoOficial,
        unit: ADICIONAIS_VITRINE.zapi,
        total: whatsNaoOficial * ADICIONAIS_VITRINE.zapi,
      });
    }
    if (instagram > 0)
      linhas.push({
        label: "Instagram Direct",
        qtd: instagram,
        unit: ADICIONAIS_VITRINE.instagram,
        total: instagram * ADICIONAIS_VITRINE.instagram,
      });
    if (messenger > 0)
      linhas.push({
        label: "Messenger Facebook",
        qtd: messenger,
        unit: ADICIONAIS_VITRINE.messenger,
        total: messenger * ADICIONAIS_VITRINE.messenger,
      });
    if (modIA)
      linhas.push({ label: "Agentes de IA", total: ADICIONAIS_VITRINE.moduloIA });
    if (modAsaas)
      linhas.push({
        label: "Integração ASAAS (Pagamentos)",
        total: ADICIONAIS_VITRINE.asaas,
      });
    if (modTranscricao)
      linhas.push({
        label: "Transcrição de áudio (IA)",
        qtd: usuarios,
        unit: ADICIONAIS_VITRINE.transcricao,
        total: usuarios * ADICIONAIS_VITRINE.transcricao,
      });
    if (modTempoSeguranca)
      linhas.push({
        label: "Tempo de segurança",
        total: ADICIONAIS_VITRINE.tempoSeguranca,
      });
    if (modMensagensAgendadas)
      linhas.push({
        label: "Mensagens agendadas",
        total: ADICIONAIS_VITRINE.mensagensAgendadas,
      });
    const total = linhas.reduce((s, l) => s + l.total, 0);
    return { linhas, total };
  }, [
    plano,
    usuarios,
    usuariosExtras,
    whatsOficial,
    whatsNaoOficial,
    instagram,
    messenger,
    modIA,
    modAsaas,
    modTranscricao,
    modTempoSeguranca,
    modMensagensAgendadas,
  ]);

  return (
    <section
      id="simulador"
      className="bg-landing-surface py-20 px-6 border-t border-landing-border"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-landing-blue mb-3">
            Simulador
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-landing-fg" style={{ fontFamily: "var(--font-display)" }}>
            Monte o seu pacote
          </h2>
          <p className="text-landing-muted mt-3 max-w-2xl mx-auto">
            Diga o que você precisa — recomendamos o plano ideal e calculamos o valor em tempo real.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border border-landing-border p-6 md:p-8 space-y-8">
            {/* Usuários e canais */}
            <div>
              <Label className="text-landing-fg text-sm font-semibold uppercase tracking-wide">
                1. Sua operação
              </Label>
              <div className="mt-2 divide-y divide-landing-border">
                <Stepper
                  label="Usuários no sistema"
                  hint={`Plano ${plano.nome} inclui ${plano.usuariosInclusos} · extras ${formatBRL(ADICIONAIS_VITRINE.usuarioExtra)}/cada`}
                  value={usuarios}
                  min={1}
                  onChange={setUsuarios}
                />
                <Stepper
                  label="WhatsApp Oficial (API Meta)"
                  hint={`${formatBRL(ADICIONAIS_VITRINE.whatsOficial)} por número`}
                  value={whatsOficial}
                  onChange={setWhatsOficial}
                />
                <Stepper
                  label="WhatsApp Não-Oficial"
                  hint={`${formatBRL(ADICIONAIS_VITRINE.whatsNaoOficial)} + ${formatBRL(ADICIONAIS_VITRINE.zapi)} Z-API por número`}
                  value={whatsNaoOficial}
                  onChange={setWhatsNaoOficial}
                />
                <Stepper
                  label="Instagram Direct"
                  hint={`${formatBRL(ADICIONAIS_VITRINE.instagram)} por conta`}
                  value={instagram}
                  onChange={setInstagram}
                />
                <Stepper
                  label="Messenger Facebook"
                  hint={`${formatBRL(ADICIONAIS_VITRINE.messenger)} por conta`}
                  value={messenger}
                  onChange={setMessenger}
                />
              </div>
            </div>

            {/* Módulos opcionais */}
            <div>
              <Label className="text-landing-fg text-sm font-semibold uppercase tracking-wide">
                2. Módulos opcionais
              </Label>
              <div className="mt-3 space-y-3">
                <ToggleRow
                  label="Agentes de IA"
                  hint={formatBRL(ADICIONAIS_VITRINE.moduloIA) + "/mês"}
                  checked={modIA}
                  onChange={setModIA}
                />
                <ToggleRow
                  label="Integração ASAAS (Pagamentos)"
                  hint={formatBRL(ADICIONAIS_VITRINE.asaas) + "/mês"}
                  checked={modAsaas}
                  onChange={setModAsaas}
                />
                <ToggleRow
                  label="Transcrição de áudio"
                  hint={formatBRL(ADICIONAIS_VITRINE.transcricao) + "/usuário/mês"}
                  checked={modTranscricao}
                  onChange={setModTranscricao}
                />
                <ToggleRow
                  label="Tempo de segurança"
                  hint={formatBRL(ADICIONAIS_VITRINE.tempoSeguranca) + "/mês"}
                  checked={modTempoSeguranca}
                  onChange={setModTempoSeguranca}
                />
                <ToggleRow
                  label="Mensagens agendadas"
                  hint={formatBRL(ADICIONAIS_VITRINE.mensagensAgendadas) + "/mês"}
                  checked={modMensagensAgendadas}
                  onChange={setModMensagensAgendadas}
                />
              </div>
            </div>

            {/* Override manual do plano */}
            <div>
              <Label className="text-landing-fg text-sm font-semibold uppercase tracking-wide">
                3. Plano (recomendamos automaticamente)
              </Label>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                {PLANOS_VITRINE.map((p) => {
                  const ativo = planoKey === p.key;
                  const ehRecomendado = recomendado === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlanoManual(p.key)}
                      className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                        ativo
                          ? "border-landing-blue bg-landing-blue/5 shadow-md"
                          : "border-landing-border bg-white hover:border-landing-blue/40"
                      }`}
                    >
                      {ehRecomendado && (
                        <span className="absolute -top-2 right-3 bg-landing-blue text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                          Recomendado
                        </span>
                      )}
                      <div className="text-sm font-semibold text-landing-fg">{p.nome}</div>
                      <div className="text-lg font-bold text-landing-blue mt-1">
                        {formatBRL(p.mensal)}
                      </div>
                      <div className="text-[11px] text-landing-muted mt-1">
                        {p.usuariosInclusos} usuários inclusos
                      </div>
                    </button>
                  );
                })}
              </div>
              {planoManual && planoManual !== recomendado && (
                <button
                  type="button"
                  onClick={() => setPlanoManual(null)}
                  className="mt-2 text-xs text-landing-blue hover:underline"
                >
                  Voltar para o recomendado ({planoVitrine(recomendado).nome})
                </button>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="bg-landing-dark text-white rounded-2xl p-6 md:p-7 border border-landing-dark shadow-xl">
              <div className="flex items-center gap-2 text-landing-yellow text-xs font-semibold uppercase tracking-widest">
                <Crown className="h-4 w-4" /> Plano recomendado
              </div>
              <div
                className="mt-2 text-3xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {plano.nome}
              </div>
              <div className="text-xs text-white/60 mt-1">
                A partir de {formatBRL(plano.mensal)}/mês
              </div>
              <div className="h-px bg-white/15 my-5" />
              <div className="flex items-center gap-2 text-white/80 text-[11px] font-semibold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" /> Detalhamento
              </div>
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                {breakdown.linhas.map((l, i) => (
                  <div key={i} className="flex items-start justify-between text-sm gap-3">
                    <div className="min-w-0">
                      <div className="text-white/90 truncate">{l.label}</div>
                      {l.qtd !== undefined && l.unit !== undefined && (
                        <div className="text-[11px] text-white/50">
                          {l.qtd} × {formatBRL(l.unit)}
                        </div>
                      )}
                    </div>
                    <div className="text-white font-medium tabular-nums shrink-0">
                      {formatBRL(l.total)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-px bg-white/15 my-5" />
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/60">
                    Total mensal
                  </div>
                  <div
                    className="text-4xl font-bold text-landing-yellow mt-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {formatBRL(breakdown.total)}
                  </div>
                </div>
              </div>
              <a
                href="/auth"
                className="mt-5 block w-full text-center bg-landing-yellow hover:bg-landing-yellow-dark text-landing-fg font-semibold rounded-lg py-3 transition-colors"
              >
                Quero contratar
              </a>
              <p className="text-[11px] text-white/50 mt-3 text-center">
                Valores de referência. Implantação cobrada à parte.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-landing-border p-3 bg-white">
      <div>
        <div className="text-sm font-medium text-landing-fg">{label}</div>
        <div className="text-xs text-landing-muted">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}