import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client-configured";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { Mail, CheckCircle2, ArrowUpRight, MessageCircle } from "lucide-react";
import { Navbar, Footer, PageHeader } from "@/components/landing/SiteChrome";
import { WHATSAPP_LINK } from "@/lib/landing/contato";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — EloraCRM" },
      {
        name: "description",
        content:
          "Acesse o painel do EloraCRM com um link de acesso enviado para o seu e-mail. Sem senha.",
      },
      { property: "og:title", content: "Entrar — EloraCRM" },
      {
        property: "og:description",
        content: "Acesse o painel do EloraCRM com um link de acesso por e-mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//")
      ? { next: s.next }
      : {},
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [step, setStep] = useState<"email" | "enviado">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) window.location.href = next;
        else navigate({ to: "/dashboard" });
      }
    });
  }, [navigate, next]);

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpo = email.trim();
    if (!emailLimpo || !emailLimpo.includes("@")) {
      toast.error("Informe um email válido.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailLimpo,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        },
      });
      if (error) throw error;
      toast.success("Link enviado! Verifique seu email.");
      setStep("enviado");
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-landing-bg text-landing-fg"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Navbar />

      <PageHeader
        etiqueta="Acesso"
        titulo={step === "email" ? "Entrar" : "Verifique seu e-mail"}
        descricao={
          step === "email"
            ? "Digite seu e-mail e enviamos um link de acesso. Sem senha."
            : `Enviamos um link de acesso para ${email}. Abra o e-mail e clique no botão para entrar.`
        }
      />

      <section className="flex-1 bg-white px-6 py-14 md:py-20">
        <div className="max-w-md mx-auto">
          <div className="rounded-2xl border border-landing-border bg-landing-surface p-7 md:p-8 shadow-sm">
            {step === "email" ? (
              <form onSubmit={enviarCodigo} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-landing-fg"
                  >
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    className="w-full rounded-md border border-landing-border bg-white px-4 py-3 text-landing-fg placeholder:text-landing-muted/70 outline-none focus:border-rabbit-navy transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-landing-yellow-vivo hover:bg-landing-yellow disabled:opacity-60 text-landing-fg font-semibold px-6 py-3.5 rounded-md transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {loading ? "Enviando..." : "Enviar link de acesso"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-landing-border bg-white p-4">
                  <CheckCircle2 className="h-5 w-5 text-rabbit-navy mt-0.5 shrink-0" />
                  <div className="text-sm text-landing-muted">
                    Não esqueça de verificar a pasta de <strong>spam</strong> ou{" "}
                    <strong>promoções</strong>. O link expira em 1 hora.
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    enviarCodigo(new Event("submit") as unknown as React.FormEvent)
                  }
                  className="w-full inline-flex items-center justify-center gap-2 border border-landing-border hover:border-rabbit-navy text-landing-fg font-semibold px-6 py-3 rounded-md transition-colors"
                >
                  {loading ? "Reenviando..." : "Reenviar link"}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-landing-muted hover:text-landing-fg"
                  onClick={() => setStep("email")}
                >
                  Usar outro e-mail
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-landing-dark text-white p-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-landing-yellow-vivo">
              Ainda não sou cliente
            </div>
            <p className="text-sm text-white/70 mt-2">
              Fale com a gente no WhatsApp e conheça o EloraCRM na prática.
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-landing-yellow-vivo hover:bg-landing-yellow text-landing-fg font-semibold px-6 py-3 rounded-md text-sm transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Quero conhecer
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
