import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Check, Loader2 } from "lucide-react";
import { inscreverNewsletter } from "@/lib/newsletter.functions";

export function Newsletter({ origem }: { origem: string }) {
  const inscrever = useServerFn(inscreverNewsletter);
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [erro, setErro] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEstado("erro");
      setErro("Digite um e-mail válido.");
      return;
    }
    setEstado("enviando");
    try {
      await inscrever({ data: { email, origem } });
      setEstado("ok");
    } catch (err) {
      setEstado("erro");
      setErro(err instanceof Error ? err.message : "Não foi possível concluir a inscrição.");
    }
  }

  return (
    <section className="px-6 py-14 md:py-16 bg-landing-surface border-t border-landing-border">
      <div className="max-w-3xl mx-auto text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rabbit-navy text-landing-yellow-vivo">
          <Mail className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-2xl md:text-3xl font-bold text-landing-fg" style={{ fontFamily: "var(--font-display)" }}>
          Receba os próximos artigos
        </h2>
        <p className="mt-2 text-landing-muted">Novidades do Elora CRM e conteúdo prático sobre atendimento, direto no seu e-mail.</p>
        {estado === "ok" ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-landing-yellow-vivo px-5 py-2.5 font-semibold text-landing-fg">
            <Check className="h-4 w-4" /> Inscrição confirmada. Obrigado!
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com" aria-label="Seu e-mail" maxLength={254}
              className="flex-1 rounded-md border border-landing-border bg-white px-4 py-3 text-landing-fg outline-none focus:border-rabbit-navy"
            />
            <button
              type="submit" disabled={estado === "enviando"}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-landing-yellow-vivo hover:bg-landing-yellow px-6 py-3 font-semibold text-landing-fg transition-colors disabled:opacity-70"
            >
              {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />} Quero receber
            </button>
          </form>
        )}
        {estado === "erro" && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      </div>
    </section>
  );
}
