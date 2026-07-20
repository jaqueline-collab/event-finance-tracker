import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { Mail, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar · Elora" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {step === "email" ? "Entrar" : "Verifique seu email"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Digite seu email e enviamos um link de acesso. Sem senha."
              : `Enviamos um link de acesso para ${email}. Abra o email e clique no botão "Log In" para entrar.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={enviarCodigo} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? "Enviando..." : "Enviar link de acesso"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  Não esqueça de verificar a pasta de <strong>spam</strong> ou <strong>promoções</strong>. O link expira em 1 hora.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => enviarCodigo(new Event("submit") as unknown as React.FormEvent)}
              >
                {loading ? "Reenviando..." : "Reenviar link"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setStep("email")}
              >
                Usar outro email
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}